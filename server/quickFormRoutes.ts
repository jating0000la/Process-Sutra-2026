/**
 * Quick Form Routes
 * 
 * REST API for the new Quick Form Builder.
 * All data stored in MongoDB only — no PostgreSQL.
 * Responses use simple {fieldLabel: value} JSON.
 * Files uploaded to Google Drive via existing /api/uploads endpoint.
 */

import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createQuickFormTemplate,
  getQuickFormTemplatesByOrg,
  getQuickFormTemplate,
  getQuickFormTemplateById,
  updateQuickFormTemplate,
  deleteQuickFormTemplate,
  createQuickFormResponse,
  getQuickFormResponses,
  getQuickFormResponseById,
  deleteQuickFormResponse,
  deleteQuickFormResponsesByFormId,
  getQuickFormResponseByTaskId,
  getQuickFormResponsesByFlowTasks,
} from "./mongo/quickFormClient.js";
import { fireWebhooksForEvent } from "./webhookUtils.js";
import { trackUsage, checkLimit } from "./billingRoutes.js";

// Rate limiter for form submissions: 20 per minute per user
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many form submissions. Please wait.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.currentUser?.email || req.session?.user?.id || "anon",
});

const router = Router();

// ─── Templates ──────────────────────────────────────────────────────

/** GET /api/quick-forms — list all templates for the user's org */
router.get("/", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });
    const templates = await getQuickFormTemplatesByOrg(orgId);
    res.json(templates);
  } catch (err: any) {
    console.error("[quick-forms] list error:", err);
    res.status(500).json({ message: "Failed to fetch form templates" });
  }
});

/** GET /api/quick-forms/:formId — get a single template by formId */
router.get("/:formId", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });
    const template = await getQuickFormTemplate(orgId, req.params.formId);
    if (!template) return res.status(404).json({ message: "Form not found" });
    res.json(template);
  } catch (err: any) {
    console.error("[quick-forms] get error:", err);
    res.status(500).json({ message: "Failed to fetch form template" });
  }
});

/** POST /api/quick-forms — create a new template (admin) */
router.post("/", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    const userId = req.currentUser?.id || req.session?.user?.id;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { formId, title, description, fields, whatsappConfig, emailConfig } = req.body;
    if (!formId || !title || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ message: "formId, title, and at least one field are required" });
    }

    // Validate field labels are unique (they become JSON keys)
    const labels = fields.map((f: any) => f.label?.trim().toLowerCase());
    const dupes = labels.filter((l: string, i: number) => labels.indexOf(l) !== i);
    if (dupes.length > 0) {
      return res.status(400).json({ message: `Duplicate field labels: ${Array.from(new Set(dupes)).join(", ")}` });
    }

    const templateDoc: any = {
      orgId,
      formId: formId.trim(),
      title: title.trim(),
      description: description?.trim() || "",
      fields,
      createdBy: userId,
    };
    if (whatsappConfig !== undefined) templateDoc.whatsappConfig = whatsappConfig;
    if (emailConfig !== undefined) templateDoc.emailConfig = emailConfig;

    const template = await createQuickFormTemplate(templateDoc);
    res.status(201).json(template);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Form ID already exists in your organization" });
    }
    console.error("[quick-forms] create error:", err);
    res.status(500).json({ message: "Failed to create form template" });
  }
});

/** PUT /api/quick-forms/:id — update template (admin) */
router.put("/:id", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { title, description, fields, formId, whatsappConfig, emailConfig } = req.body;

    // Validate unique field labels if fields are being updated
    if (fields && Array.isArray(fields)) {
      const labels = fields.map((f: any) => f.label?.trim().toLowerCase());
      const dupes = labels.filter((l: string, i: number) => labels.indexOf(l) !== i);
      if (dupes.length > 0) {
        return res.status(400).json({ message: `Duplicate field labels: ${Array.from(new Set(dupes)).join(", ")}` });
      }
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (fields !== undefined) updates.fields = fields;
    if (formId !== undefined) updates.formId = formId.trim();
    if (whatsappConfig !== undefined) updates.whatsappConfig = whatsappConfig;
    if (emailConfig !== undefined) updates.emailConfig = emailConfig;

    const updated = await updateQuickFormTemplate(orgId, req.params.id, updates);
    if (!updated) return res.status(404).json({ message: "Form not found" });
    res.json(updated);
  } catch (err: any) {
    console.error("[quick-forms] update error:", err);
    res.status(500).json({ message: "Failed to update form template" });
  }
});

/** DELETE /api/quick-forms/:id — delete template (admin) */
router.delete("/:id", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { deleteResponses } = req.query;

    // Get template first to know the formId
    const template = await getQuickFormTemplateById(orgId, req.params.id);
    if (!template) return res.status(404).json({ message: "Form not found" });

    // Check for existing responses
    const { total } = await getQuickFormResponses({ orgId, formId: template.formId, page: 1, pageSize: 1 });
    if (total > 0 && deleteResponses !== "true") {
      return res.status(400).json({
        message: `Cannot delete form. It has ${total} response(s).`,
        responseCount: total,
        hint: "Add ?deleteResponses=true to force delete including all responses",
      });
    }

    // Delete responses if requested
    if (deleteResponses === "true" && total > 0) {
      const deleted = await deleteQuickFormResponsesByFormId(orgId, template.formId);
      console.log(`[quick-forms] Deleted ${deleted} responses for form ${template.formId}`);
    }

    const ok = await deleteQuickFormTemplate(orgId, req.params.id);
    if (!ok) return res.status(404).json({ message: "Form not found" });
    res.json({ message: "Form deleted", deletedResponses: deleteResponses === "true" ? total : 0 });
  } catch (err: any) {
    console.error("[quick-forms] delete error:", err);
    res.status(500).json({ message: "Failed to delete form template" });
  }
});

// ─── Responses ──────────────────────────────────────────────────────

/** GET /api/quick-forms/responses/list — list responses with filters */
router.get("/responses/list", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    const { formId, startDate, endDate, search, page, pageSize } = req.query;
    const result = await getQuickFormResponses({
      orgId,
      formId: formId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 50,
    });
    res.json(result);
  } catch (err: any) {
    console.error("[quick-forms] list responses error:", err);
    res.status(500).json({ message: "Failed to fetch form responses" });
  }
});

/** GET /api/quick-forms/responses/by-task/:taskId — check if a quick form response exists for a task */
router.get("/responses/by-task/:taskId", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });
    const resp = await getQuickFormResponseByTaskId(orgId, req.params.taskId);
    res.json({ submitted: !!resp, response: resp });
  } catch (err: any) {
    console.error("[quick-forms] by-task error:", err);
    res.status(500).json({ message: "Failed to check task form response" });
  }
});

/** POST /api/quick-forms/responses/check-tasks — batch check which tasks have quick-form responses */
router.post("/responses/check-tasks", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds)) return res.status(400).json({ message: "taskIds array required" });
    const responses = await getQuickFormResponsesByFlowTasks(orgId, taskIds);
    const map: Record<string, boolean> = {};
    for (const tid of taskIds) {
      map[tid] = responses.some(r => r.taskId === tid);
    }
    res.json(map);
  } catch (err: any) {
    console.error("[quick-forms] check-tasks error:", err);
    res.status(500).json({ message: "Failed to check task form responses" });
  }
});

/** GET /api/quick-forms/responses/:id — get single response */
router.get("/responses/:id", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });
    const resp = await getQuickFormResponseById(orgId, req.params.id);
    if (!resp) return res.status(404).json({ message: "Response not found" });
    res.json(resp);
  } catch (err: any) {
    console.error("[quick-forms] get response error:", err);
    res.status(500).json({ message: "Failed to fetch form response" });
  }
});

/** POST /api/quick-forms/responses — submit a form response */
router.post("/responses", submitLimiter, async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    const userId = req.currentUser?.email || req.session?.user?.id;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });

    // Check billing limits before accepting submission
    const limitCheck = await checkLimit(orgId, "form_submission");
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message || "You have reached the free usage limit. Upgrade your plan to continue using ProcessSutra workflows.",
        limitExceeded: true,
        planName: limitCheck.planName,
        used: limitCheck.used,
        limit: limitCheck.limit,
      });
    }

    const { formId, data, flowId, taskId, taskName } = req.body;
    if (!formId || !data || typeof data !== "object") {
      return res.status(400).json({ message: "formId and data object are required" });
    }

    // Fetch template for validation
    const template = await getQuickFormTemplate(orgId, formId);
    if (!template) return res.status(404).json({ message: "Form template not found" });

    // Validate required fields
    const missingRequired: string[] = [];
    for (const field of template.fields) {
      if (field.required) {
        const val = data[field.label];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          missingRequired.push(field.label);
        }
      }
    }
    if (missingRequired.length > 0) {
      return res.status(400).json({
        message: `Required fields missing: ${missingRequired.join(", ")}`,
        missingFields: missingRequired,
      });
    }

    // Store response — simple flat JSON, no question IDs
    // Include optional flow/task context for task-based form fills
    const responseDoc: any = {
      orgId,
      formId,
      formTitle: template.title,
      submittedBy: userId,
      data, // { "Customer Name": "John", "File Upload": "https://drive.google.com/..." }
    };
    if (flowId) responseDoc.flowId = flowId;
    if (taskId) responseDoc.taskId = taskId;
    if (taskName) responseDoc.taskName = taskName;

    const response = await createQuickFormResponse(responseDoc);

    // Fire webhooks for form.submitted event (non-blocking)
    // Quick Form data already uses human-readable labels — no transformation needed
    fireWebhooksForEvent(orgId, "form.submitted", {
      formId,
      formTitle: template.title,
      formData: data,
      submittedBy: userId,
      ...(flowId && { flowId }),
      ...(taskId && { taskId }),
      ...(taskName && { taskName }),
      timestamp: new Date().toISOString(),
    }).catch((err) => {
      console.error("[quick-forms] webhook fire error (non-blocking):", err);
    });

    res.status(201).json(response);

    // Track billing usage (non-blocking, after response)
    trackUsage(orgId, "form_submission", formId).catch(err =>
      console.error('[Billing] Error tracking form submission usage:', err)
    );
  } catch (err: any) {
    console.error("[quick-forms] submit error:", err);
    res.status(500).json({ message: "Failed to submit form response" });
  }
});

/** DELETE /api/quick-forms/responses/:id — delete single response (admin) */
router.delete("/responses/:id", async (req: any, res) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization not found" });
    const ok = await deleteQuickFormResponse(orgId, req.params.id);
    if (!ok) return res.status(404).json({ message: "Response not found" });
    res.json({ message: "Response deleted" });
  } catch (err: any) {
    console.error("[quick-forms] delete response error:", err);
    res.status(500).json({ message: "Failed to delete response" });
  }
});

export default router;
