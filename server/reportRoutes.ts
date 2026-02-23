/**
 * Report Builder API Routes
 *
 * Provides a Power-BI-style query engine over MongoDB form responses.
 * EVERY query is scoped to the current user's organizationId so tenant
 * isolation is guaranteed at the data-access layer.
 */

import { Router, type Request, type Response } from "express";
import {
  getQuickFormTemplatesCollection,
  getQuickFormResponsesCollection,
  getDb,
} from "./mongo/quickFormClient.js";
import { ObjectId } from "mongodb";

const router = Router();

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function getOrgId(req: Request): string | null {
  return (req as any).currentUser?.organizationId ?? null;
}

/**
 * Turn a user-supplied filter into a Mongo $match expression.
 * Supported operators: eq, ne, gt, gte, lt, lte, contains, notContains, in, exists
 */
function buildMatchFromFilters(
  filters: { field: string; operator: string; value: any }[]
): Record<string, any> {
  const match: Record<string, any> = {};
  for (const f of filters) {
    const key = `data.${f.field}`;
    switch (f.operator) {
      case "eq":          match[key] = f.value; break;
      case "ne":          match[key] = { $ne: f.value }; break;
      case "gt":          match[key] = { $gt: Number(f.value) }; break;
      case "gte":         match[key] = { $gte: Number(f.value) }; break;
      case "lt":          match[key] = { $lt: Number(f.value) }; break;
      case "lte":         match[key] = { $lte: Number(f.value) }; break;
      case "contains":    match[key] = { $regex: String(f.value), $options: "i" }; break;
      case "notContains": match[key] = { $not: { $regex: String(f.value), $options: "i" } }; break;
      case "in":          match[key] = { $in: Array.isArray(f.value) ? f.value : [f.value] }; break;
      case "exists":      match[key] = { $exists: f.value === true || f.value === "true" }; break;
      default: break;
    }
  }
  return match;
}

/* ================================================================== */
/*  GET /collections — list form templates (data sources)             */
/* ================================================================== */

router.get("/collections", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const col = await getQuickFormTemplatesCollection();
    const templates = await col
      .find({ orgId })
      .project({ formId: 1, title: 1, description: 1, fields: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    // Return lightweight collection list with field info
    const collections = templates.map((t: any) => ({
      formId: t.formId,
      title: t.title,
      description: t.description || "",
      fields: (t.fields || []).map((f: any) => ({
        label: f.label,
        type: f.type,
        options: f.options || [],
      })),
    }));

    res.json(collections);
  } catch (error) {
    console.error("[reports] Error listing collections:", error);
    res.status(500).json({ message: "Failed to list data sources" });
  }
});

/* ================================================================== */
/*  GET /schema/:formId — field schema for one form                   */
/* ================================================================== */

router.get("/schema/:formId", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const tplCol = await getQuickFormTemplatesCollection();
    const tpl = await tplCol.findOne({ orgId, formId: req.params.formId });
    if (!tpl) return res.status(404).json({ message: "Form not found" });

    // Also sample unique values for select/radio fields for filter suggestions
    const respCol = await getQuickFormResponsesCollection();
    const sampleValues: Record<string, string[]> = {};

    for (const field of tpl.fields || []) {
      if (field.options?.length) {
        sampleValues[field.label] = field.options;
      } else {
        const distinct = await respCol.distinct(`data.${field.label}`, { orgId, formId: tpl.formId });
        sampleValues[field.label] = distinct
          .filter((v: any) => v != null && v !== "")
          .slice(0, 50)
          .map(String);
      }
    }

    res.json({
      formId: tpl.formId,
      title: tpl.title,
      fields: (tpl.fields || []).map((f: any) => ({
        label: f.label,
        type: f.type,
        options: f.options || [],
        sampleValues: sampleValues[f.label] || [],
      })),
      // System fields always available
      systemFields: [
        { label: "submittedBy", type: "text" },
        { label: "formTitle", type: "text" },
        { label: "createdAt", type: "date" },
        { label: "flowId", type: "text" },
        { label: "taskName", type: "text" },
      ],
    });
  } catch (error) {
    console.error("[reports] Error fetching schema:", error);
    res.status(500).json({ message: "Failed to fetch schema" });
  }
});

/* ================================================================== */
/*  POST /query — execute a report query                              */
/* ================================================================== */

router.post("/query", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const {
      formId,
      filters = [],
      columns = [],
      groupBy,
      aggregation,  // { field, operation } — count | sum | avg | min | max
      sortField,
      sortDirection = "desc",
      page = 1,
      pageSize = 100,
      dateRange,    // { start, end } applied on createdAt
    } = req.body;

    if (!formId) return res.status(400).json({ message: "formId is required" });

    const col = await getQuickFormResponsesCollection();

    // ── Always start pipeline scoped to org + form ──
    const basePipeline: any[] = [
      { $match: { orgId, formId } },
    ];

    // Date range filter on createdAt
    if (dateRange?.start || dateRange?.end) {
      const dateMatch: any = {};
      if (dateRange.start) dateMatch.$gte = new Date(dateRange.start);
      if (dateRange.end) dateMatch.$lte = new Date(dateRange.end);
      basePipeline.push({ $match: { createdAt: dateMatch } });
    }

    // User-defined filters
    if (filters.length > 0) {
      basePipeline.push({ $match: buildMatchFromFilters(filters) });
    }

    // ── Branch: aggregation query vs. flat data query ──
    if (groupBy) {
      // GROUP-BY aggregation — Power-BI style
      const groupId = groupBy === "createdAt"
        ? { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        : `$data.${groupBy}`;

      const accumulator: any = { _id: groupId, count: { $sum: 1 } };

      if (aggregation?.field && aggregation?.operation) {
        const aggField = aggregation.field === "createdAt"
          ? "$createdAt"
          : `$data.${aggregation.field}`;
        switch (aggregation.operation) {
          case "sum":   accumulator.value = { $sum: { $toDouble: aggField } }; break;
          case "avg":   accumulator.value = { $avg: { $toDouble: aggField } }; break;
          case "min":   accumulator.value = { $min: aggField }; break;
          case "max":   accumulator.value = { $max: aggField }; break;
          case "count": accumulator.value = { $sum: 1 }; break;
        }
      }

      basePipeline.push(
        { $group: accumulator },
        { $sort: { count: -1 } },
        { $limit: 200 },
      );

      const result = await col.aggregate(basePipeline).toArray();

      return res.json({
        type: "aggregation",
        groupBy,
        data: result.map((r: any) => ({
          group: r._id ?? "(empty)",
          count: r.count,
          value: r.value,
        })),
        total: result.length,
      });
    }

    // ── Flat data query ──
    const countPipeline = [...basePipeline, { $count: "total" }];
    const countResult = await col.aggregate(countPipeline).toArray();
    const total = countResult[0]?.total ?? 0;

    // Projection — select only requested columns (+ system fields)
    if (columns.length > 0) {
      const project: any = { _id: 1, createdAt: 1, submittedBy: 1, formTitle: 1, flowId: 1, taskName: 1 };
      for (const c of columns) {
        project[`data.${c}`] = 1;
      }
      basePipeline.push({ $project: project });
    }

    // Sort
    if (sortField) {
      const sortKey = ["createdAt", "submittedBy", "formTitle"].includes(sortField)
        ? sortField
        : `data.${sortField}`;
      basePipeline.push({ $sort: { [sortKey]: sortDirection === "asc" ? 1 : -1 } });
    } else {
      basePipeline.push({ $sort: { createdAt: -1 } });
    }

    // Pagination
    basePipeline.push({ $skip: (page - 1) * pageSize }, { $limit: pageSize });

    const data = await col.aggregate(basePipeline).toArray();

    // Flatten data.* into top-level for easy table rendering
    const rows = data.map((doc: any) => {
      const row: Record<string, any> = {
        _id: doc._id,
        submittedBy: doc.submittedBy,
        formTitle: doc.formTitle,
        createdAt: doc.createdAt,
        flowId: doc.flowId,
        taskName: doc.taskName,
      };
      if (doc.data) Object.assign(row, doc.data);
      return row;
    });

    res.json({ type: "table", data: rows, total, page, pageSize });
  } catch (error) {
    console.error("[reports] Error executing query:", error);
    res.status(500).json({ message: "Failed to execute query" });
  }
});

/* ================================================================== */
/*  POST /summary — quick summary stats for a form                    */
/* ================================================================== */

router.post("/summary", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { formId } = req.body;
    if (!formId) return res.status(400).json({ message: "formId required" });

    const col = await getQuickFormResponsesCollection();

    // Total responses
    const totalResponses = await col.countDocuments({ orgId, formId });

    // Responses over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentResponses = await col.countDocuments({
      orgId, formId, createdAt: { $gte: thirtyDaysAgo },
    });

    // Unique submitters
    const uniqueSubmitters = await col.distinct("submittedBy", { orgId, formId });

    // Responses per day (last 30 days)
    const dailyPipeline = [
      { $match: { orgId, formId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 as 1 } },
    ];
    const dailyData = await col.aggregate(dailyPipeline).toArray();

    res.json({
      totalResponses,
      recentResponses,
      uniqueSubmitters: uniqueSubmitters.length,
      dailySubmissions: dailyData.map((d: any) => ({ date: d._id, count: d.count })),
    });
  } catch (error) {
    console.error("[reports] Error fetching summary:", error);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

/* ================================================================== */
/*  Saved Reports — CRUD stored in MongoDB                            */
/* ================================================================== */

async function getSavedReportsCollection() {
  const db = await getDb();
  return db.collection("savedReports");
}

router.get("/saved", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const col = await getSavedReportsCollection();
    const reports = await col.find({ orgId }).sort({ updatedAt: -1 }).toArray();
    res.json(reports);
  } catch (error) {
    console.error("[reports] Error listing saved reports:", error);
    res.status(500).json({ message: "Failed to list saved reports" });
  }
});

router.post("/saved", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { name, description, config } = req.body;
    if (!name || !config) return res.status(400).json({ message: "name and config required" });

    const col = await getSavedReportsCollection();
    const createdBy = (req as any).currentUser?.email ?? "unknown";
    const now = new Date();

    const result = await col.insertOne({
      orgId, name, description: description || "", config, createdBy, createdAt: now, updatedAt: now,
    });
    res.json({ _id: result.insertedId, name, description, config, createdBy, createdAt: now });
  } catch (error) {
    console.error("[reports] Error saving report:", error);
    res.status(500).json({ message: "Failed to save report" });
  }
});

router.put("/saved/:id", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { name, description, config } = req.body;
    const col = await getSavedReportsCollection();
    const result = await col.findOneAndUpdate(
      { orgId, _id: new ObjectId(req.params.id) },
      { $set: { name, description, config, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) return res.status(404).json({ message: "Report not found" });
    res.json(result);
  } catch (error) {
    console.error("[reports] Error updating report:", error);
    res.status(500).json({ message: "Failed to update report" });
  }
});

router.delete("/saved/:id", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const col = await getSavedReportsCollection();
    const result = await col.deleteOne({ orgId, _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Report not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("[reports] Error deleting report:", error);
    res.status(500).json({ message: "Failed to delete report" });
  }
});

export default router;
