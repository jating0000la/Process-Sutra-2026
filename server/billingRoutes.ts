/**
 * Billing Routes – challan generation, payment initiation & PayU callbacks
 *
 * Endpoints:
 *   GET  /              → list challans for current org
 *   GET  /:id           → single challan detail
 *   POST /generate      → generate challan for a billing period
 *   POST /pay/:id       → initiate PayU payment for a challan
 *   POST /payu-success  → PayU success redirect (verifies hash, updates records)
 *   POST /payu-failure  → PayU failure redirect
 *   POST /payu-webhook  → PayU S2S webhook notification
 */

import { Router, type Request, type Response } from "express";
import { db } from "./db.js";
import {
  challans,
  paymentTransactions,
  organizations,
  users,
  tasks,
  flowRules,
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte, inArray, or, count as drizzleCount } from "drizzle-orm";
import {
  isPayUConfigured,
  generatePayUHash,
  verifyPayUHash,
  buildPayUFormData,
  getPayUPaymentUrl,
  paiseToRupees,
  generateChallanNumber,
  generateTxnId,
  type PayUCallbackData,
} from "./payu.js";
import { logger } from "./utils/logger.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────

/** Get the start and end of a given month (UTC) */
function getMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)); // last day of month
  return { start, end };
}

/** Get the previous month's range */
function getPreviousMonth(date: Date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 1);
  return getMonthRange(d.getFullYear(), d.getMonth());
}

// ── GET / – List Challans ────────────────────────────────────────────

router.get("/", async (req: any, res: Response) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "No organization" });

    const rows = await db
      .select()
      .from(challans)
      .where(eq(challans.organizationId, orgId))
      .orderBy(desc(challans.billingPeriodStart));

    res.json(rows);
  } catch (err) {
    logger.error("Failed to list challans", err);
    res.status(500).json({ message: "Failed to fetch challans" });
  }
});

// ── GET /transactions – Payment history for org ──────────────────────

router.get("/transactions", async (req: any, res: Response) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "No organization" });

    const txns = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.organizationId, orgId))
      .orderBy(desc(paymentTransactions.createdAt));

    res.json(txns);
  } catch (err) {
    logger.error("Failed to list transactions", err);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// ── GET /outstanding – Outstanding amount for org ────────────────────

router.get("/outstanding", async (req: any, res: Response) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "No organization" });

    const unpaidChallans = await db
      .select()
      .from(challans)
      .where(
        and(
          eq(challans.organizationId, orgId),
          or(
            eq(challans.status, "generated"),
            eq(challans.status, "sent"),
            eq(challans.status, "overdue")
          )
        )
      )
      .orderBy(desc(challans.billingPeriodStart));

    const totalOutstanding = unpaidChallans.reduce(
      (sum, ch) => sum + (ch.totalAmount ?? 0),
      0
    );

    const overdueChallans = unpaidChallans.filter((ch) => ch.status === "overdue");
    const overdueAmount = overdueChallans.reduce(
      (sum, ch) => sum + (ch.totalAmount ?? 0),
      0
    );

    res.json({
      totalOutstanding,
      overdueAmount,
      unpaidCount: unpaidChallans.length,
      overdueCount: overdueChallans.length,
      challans: unpaidChallans.map((ch) => ({
        id: ch.id,
        challanNumber: ch.challanNumber,
        billingPeriodStart: ch.billingPeriodStart,
        totalAmount: ch.totalAmount,
        status: ch.status,
        dueDate: ch.dueDate,
      })),
    });
  } catch (err) {
    logger.error("Failed to fetch outstanding", err);
    res.status(500).json({ message: "Failed to fetch outstanding" });
  }
});

// ── GET /:id – Single Challan ────────────────────────────────────────

router.get("/:id", async (req: any, res: Response) => {
  try {
    const orgId = req.currentUser?.organizationId;
    const [challan] = await db
      .select()
      .from(challans)
      .where(and(eq(challans.id, req.params.id), eq(challans.organizationId, orgId!)))
      .limit(1);

    if (!challan) return res.status(404).json({ message: "Challan not found" });

    // Fetch associated payment transactions
    const txns = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.challanId, challan.id))
      .orderBy(desc(paymentTransactions.createdAt));

    res.json({ challan, transactions: txns });
  } catch (err) {
    logger.error("Failed to fetch challan", err);
    res.status(500).json({ message: "Failed to fetch challan" });
  }
});

// ── POST /generate – Generate Challan for a Billing Period ───────────

router.post("/generate", async (req: any, res: Response) => {
  try {
    const orgId = req.currentUser?.organizationId;
    if (!orgId) return res.status(400).json({ message: "No organization" });

    // Accept optional year/month in body, default to previous month
    const now = new Date();
    const targetYear = req.body.year ?? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    const targetMonth = req.body.month ?? (now.getMonth() === 0 ? 11 : now.getMonth() - 1); // 0-indexed

    const { start, end } = getMonthRange(targetYear, targetMonth);

    // Prevent duplicate challans for same period
    const [existing] = await db
      .select()
      .from(challans)
      .where(
        and(
          eq(challans.organizationId, orgId),
          eq(challans.billingPeriodStart, start)
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({
        message: "Challan already exists for this period",
        challan: existing,
      });
    }

    // Fetch org pricing config
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) return res.status(404).json({ message: "Organization not found" });

    // ── Compute usage for the billing period ──

    // Flow count: flows created/active in period
    const [flowResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flowRules)
      .where(
        and(
          eq(flowRules.organizationId, orgId),
          gte(flowRules.createdAt, start),
          lte(flowRules.createdAt, end)
        )
      );
    const flowCount = Number(flowResult?.count) || 0;

    // User count: active users in org
    const [userResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.organizationId, orgId));
    const userCount = Number(userResult?.count) || 0;

    // Form count: tasks/form responses created in period
    const [formResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, orgId),
          gte(tasks.createdAt, start),
          lte(tasks.createdAt, end)
        )
      );
    const formCount = Number(formResult?.count) || 0;

    // Storage: approximate from org tracking (not per-period)
    const storageMb = 0; // TODO: pull from actual storage metrics if tracked per-period

    // ── Calculate costs (all in paise) ──

    const baseCost = org.monthlyPrice || 0;

    let flowCost = 0;
    let userCost = 0;
    let formCost = 0;
    let storageCost = 0;

    // Only charge per-unit rates if usage-based billing is enabled
    if (org.usageBasedBilling) {
      const flowRate = org.pricePerFlow || 500;   // 500 paise = ₹5 default
      const userRate = org.pricePerUser || 10000;  // 10000 paise = ₹100 default
      const formRate = 200; // 200 paise = ₹2
      const storageRate = org.pricePerGb || 0;

      flowCost = flowCount * flowRate;
      userCost = userCount * userRate;
      formCost = formCount * formRate;
      storageCost = Math.ceil((storageMb / 1024) * storageRate);
    }

    const subtotal = baseCost + flowCost + userCost + formCost + storageCost;
    const taxPercent = 18; // GST
    const taxAmount = Math.round(subtotal * taxPercent / 100);

    // ── Carry-forward outstanding from unpaid challans ──

    const unpaidChallans = await db
      .select()
      .from(challans)
      .where(
        and(
          eq(challans.organizationId, orgId),
          or(
            eq(challans.status, "generated"),
            eq(challans.status, "sent"),
            eq(challans.status, "overdue")
          )
        )
      );

    const previousOutstanding = unpaidChallans.reduce(
      (sum, ch) => sum + (ch.totalAmount ?? 0),
      0
    );
    const cancelledChallanIds = unpaidChallans.map((ch) => ch.id);

    const totalAmount = subtotal + taxAmount + previousOutstanding;

    logger.info("Challan cost breakdown", {
      orgId,
      usageBasedBilling: org.usageBasedBilling,
      baseCost,
      flowCount, flowCost,
      userCount, userCost,
      formCount, formCost,
      storageMb, storageCost,
      subtotal, taxAmount,
      previousOutstanding,
      cancelledChallanCount: cancelledChallanIds.length,
      totalAmount,
    });

    // Due date: 15 days after billing period end
    const dueDate = new Date(end);
    dueDate.setDate(dueDate.getDate() + 15);

    const challanNumber = generateChallanNumber(orgId, end);

    const [newChallan] = await db
      .insert(challans)
      .values({
        challanNumber,
        organizationId: orgId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        flowCount,
        flowCost,
        userCount,
        userCost,
        formCount,
        formCost,
        storageMb,
        storageCost,
        baseCost,
        previousOutstanding,
        cancelledChallanIds: cancelledChallanIds.length > 0 ? JSON.stringify(cancelledChallanIds) : null,
        subtotal,
        taxPercent,
        taxAmount,
        totalAmount,
        status: "generated",
        dueDate,
        generatedBy: req.currentUser?.email ?? "system",
      })
      .returning();

    // Cancel old unpaid challans that were rolled into this one
    if (cancelledChallanIds.length > 0) {
      await db
        .update(challans)
        .set({
          status: "cancelled",
          notes: `Rolled into challan ${challanNumber}`,
          updatedAt: new Date(),
        })
        .where(inArray(challans.id, cancelledChallanIds));

      logger.info("Cancelled previous unpaid challans", {
        cancelledIds: cancelledChallanIds,
        rolledIntoChallan: challanNumber,
      });
    }

    logger.info("Challan generated", {
      challanNumber,
      orgId,
      totalAmount,
      period: `${start.toISOString()} - ${end.toISOString()}`,
    });

    res.json(newChallan);
  } catch (err) {
    logger.error("Failed to generate challan", err);
    res.status(500).json({ message: "Failed to generate challan" });
  }
});

// ── POST /pay/:id – Initiate PayU Payment ────────────────────────────

router.post("/pay/:id", async (req: any, res: Response) => {
  try {
    if (!isPayUConfigured()) {
      return res.status(503).json({ message: "Payment gateway not configured" });
    }

    const orgId = req.currentUser?.organizationId;
    const [challan] = await db
      .select()
      .from(challans)
      .where(and(eq(challans.id, req.params.id), eq(challans.organizationId, orgId!)))
      .limit(1);

    if (!challan) return res.status(404).json({ message: "Challan not found" });
    if (challan.status === "paid") {
      return res.status(400).json({ message: "Challan already paid" });
    }
    if (challan.status === "cancelled") {
      return res.status(400).json({ message: "Challan is cancelled" });
    }

    const txnId = generateTxnId();
    const amountStr = paiseToRupees(challan.totalAmount ?? 0);
    const user = req.currentUser;

    // Determine callback URLs
    const baseUrl = req.body.baseUrl || `${req.protocol}://${req.get("host")}`;
    const surl = `${baseUrl}/api/billing/payu-success`;
    const furl = `${baseUrl}/api/billing/payu-failure`;

    const paymentRequest = {
      txnid: txnId,
      amount: amountStr,
      productinfo: `Challan ${challan.challanNumber}`,
      firstname: user?.name ?? user?.email?.split("@")[0] ?? "User",
      email: user?.email ?? "",
      phone: req.body.phone ?? "",
      surl,
      furl,
      udf1: challan.id,           // challanId
      udf2: orgId,                // organizationId
    };

    const formData = buildPayUFormData(paymentRequest);
    const paymentUrl = getPayUPaymentUrl();

    // Record the transaction
    await db.insert(paymentTransactions).values({
      organizationId: orgId!,
      challanId: challan.id,
      payuTxnId: txnId,
      amount: challan.totalAmount ?? 0,
      status: "initiated",
      initiatedBy: user?.email ?? "",
    });

    res.json({
      paymentUrl,
      formData,
      txnId,
    });
  } catch (err) {
    logger.error("Failed to initiate payment", err);
    res.status(500).json({ message: "Failed to initiate payment" });
  }
});

// ── POST /payu-success – PayU Success Redirect ──────────────────────

export async function handlePayUSuccess(req: Request, res: Response) {
  try {
    const data = req.body as PayUCallbackData;

    logger.info("PayU success callback - FULL BODY", {
      body: JSON.stringify(req.body),
      contentType: req.headers['content-type'],
    });

    logger.info("PayU success callback received", {
      txnid: data.txnid,
      status: data.status,
      mihpayid: data.mihpayid,
      amount: data.amount,
      mode: data.mode,
      udf1: data.udf1,
      udf2: data.udf2,
      hash: data.hash?.slice(0, 20),
    });

    const hashValid = verifyPayUHash(data);

    // In test/sandbox mode, allow processing even with hash mismatch
    const isTestMode = (process.env.PAYU_BASE_URL ?? "").includes("test.");
    if (!hashValid && !isTestMode) {
      logger.warn("PayU success callback: hash mismatch (production)", { txnid: data.txnid });
      return res.redirect("/payments?status=hash-mismatch");
    }
    if (!hashValid && isTestMode) {
      logger.warn("PayU success callback: hash mismatch (test mode, proceeding anyway)", { txnid: data.txnid });
    }

    // Only mark as success if PayU says success
    const isPaymentSuccess = data.status?.toLowerCase() === "success";
    logger.info("Payment status check", { rawStatus: data.status, isPaymentSuccess });

    // Update payment transaction
    // NOTE: Drizzle crashes on raw `null` in .set() (is() calls value.constructor)
    //       so we must guard every potentially-null PayU field.
    const txnUpdateResult = await db
      .update(paymentTransactions)
      .set({
        payuPaymentId: data.mihpayid ?? "",
        payuStatus: data.status ?? "",
        payuMode: data.mode ?? "",
        payuHash: data.hash ?? "",
        payuResponse: { ...data },
        status: isPaymentSuccess ? "success" : "failed",
        failureReason: isPaymentSuccess ? "" : (data.error_Message || data.error || "Payment not successful"),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.payuTxnId, data.txnid))
      .returning();

    logger.info("Payment transaction update result", {
      txnid: data.txnid,
      rowsUpdated: txnUpdateResult.length,
      updatedStatus: txnUpdateResult[0]?.status,
    });

    // Update challan if payment succeeded
    if (isPaymentSuccess) {
      const challanId = data.udf1;
      logger.info("Updating challan status to paid", { challanId, txnid: data.txnid });

      if (challanId) {
        const challanUpdateResult = await db
          .update(challans)
          .set({
            status: "paid",
            paidAt: new Date(),
            paymentId: data.mihpayid ?? "",
            updatedAt: new Date(),
          })
          .where(eq(challans.id, challanId))
          .returning();

        logger.info("Challan update result", {
          challanId,
          rowsUpdated: challanUpdateResult.length,
          updatedStatus: challanUpdateResult[0]?.status,
        });
      } else {
        // Fallback: find challan via the transaction record
        logger.warn("No udf1 (challanId) in PayU callback, attempting fallback lookup", { txnid: data.txnid });
        
        if (txnUpdateResult.length > 0 && txnUpdateResult[0].challanId) {
          const fallbackChallanId = txnUpdateResult[0].challanId;
          const challanUpdateResult = await db
            .update(challans)
            .set({
              status: "paid",
              paidAt: new Date(),
              paymentId: data.mihpayid ?? "",
              updatedAt: new Date(),
            })
            .where(eq(challans.id, fallbackChallanId))
            .returning();

          logger.info("Challan fallback update result", {
            challanId: fallbackChallanId,
            rowsUpdated: challanUpdateResult.length,
            updatedStatus: challanUpdateResult[0]?.status,
          });
        } else {
          logger.error("Could not find challan to update", { txnid: data.txnid });
        }
      }

      logger.info("Payment successful", {
        txnid: data.txnid,
        mihpayid: data.mihpayid,
        amount: data.amount,
        challanId,
      });

      res.redirect(`/payments?status=success&txnid=${data.txnid}`);
    } else {
      res.redirect(`/payments?status=failed&txnid=${data.txnid}`);
    }
  } catch (err) {
    logger.error("PayU success callback error", err);
    res.redirect("/payments?status=error");
  }
}
router.post("/payu-success", handlePayUSuccess);

// ── POST /payu-failure – PayU Failure Redirect ──────────────────────

export async function handlePayUFailure(req: Request, res: Response) {
  try {
    const data = req.body as PayUCallbackData;

    // Update payment transaction
    await db
      .update(paymentTransactions)
      .set({
        payuPaymentId: data.mihpayid ?? "",
        payuStatus: data.status ?? "",
        payuMode: data.mode ?? "",
        payuHash: data.hash ?? "",
        payuResponse: { ...data },
        status: "failed",
        failureReason: data.error_Message || data.error || "Payment failed",
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.payuTxnId, data.txnid));

    logger.warn("Payment failed", {
      txnid: data.txnid,
      error: data.error_Message || data.error,
    });

    res.redirect(`/payments?status=failed&txnid=${data.txnid}`);
  } catch (err) {
    logger.error("PayU failure callback error", err);
    res.redirect("/payments?status=error");
  }
}
router.post("/payu-failure", handlePayUFailure);

// ── POST /payu-webhook – PayU Server-to-Server Notification ─────────

export async function handlePayUWebhook(req: Request, res: Response) {
  try {
    const data = req.body as PayUCallbackData;

    if (!verifyPayUHash(data)) {
      logger.warn("PayU webhook: hash verification failed", { txnid: data.txnid });
      return res.status(400).json({ message: "Hash mismatch" });
    }

    const txnId = data.txnid;
    const status = data.status?.toLowerCase();

    // Fetch existing transaction
    const [txn] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.payuTxnId, txnId))
      .limit(1);

    if (!txn) {
      logger.warn("PayU webhook: unknown txn", { txnid: txnId });
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Only update if status changed to a terminal state
    if (status === "success" && txn.status !== "success") {
      await db
        .update(paymentTransactions)
        .set({
          payuPaymentId: data.mihpayid ?? "",
          payuStatus: data.status ?? "",
          payuMode: data.mode ?? "",
          payuResponse: { ...data },
          status: "success",
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, txn.id));

      if (txn.challanId) {
        await db
          .update(challans)
          .set({
            status: "paid",
            paidAt: new Date(),
            paymentId: data.mihpayid ?? "",
            updatedAt: new Date(),
          })
          .where(eq(challans.id, txn.challanId));
      }

      logger.info("PayU webhook: payment confirmed", { txnid: txnId });
    } else if (status === "failure" && txn.status !== "success") {
      await db
        .update(paymentTransactions)
        .set({
          payuStatus: data.status ?? "",
          payuResponse: { ...data },
          status: "failed",
          failureReason: data.error_Message || "Payment failed",
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, txn.id));

      logger.warn("PayU webhook: payment failed", { txnid: txnId });
    }

    res.json({ received: true });
  } catch (err) {
    logger.error("PayU webhook error", err);
    res.status(500).json({ message: "Webhook processing error" });
  }
}
router.post("/payu-webhook", handlePayUWebhook);

export default router;
