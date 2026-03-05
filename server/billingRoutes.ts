/**
 * Billing & Subscription Routes
 * Handles plan management, usage tracking, PayU payment integration
 */

import type { Express, Request, Response } from "express";
import { db } from "./db.js";
import { storage } from "./storage.js";
import {
  subscriptionPlans,
  organizationSubscriptions,
  paymentTransactions,
  usageLogs,
  organizations,
  users,
} from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import crypto from "crypto";
import https from "https";

// PayU Configuration — loaded from .env
const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || "").trim();
const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || "").trim();

// Normalize PayU base URL — strip trailing /_payment if env already has it
const rawPayuUrl = process.env.PAYU_BASE_URL || "https://test.payu.in";
const PAYU_BASE_URL = rawPayuUrl.replace(/\/_payment\/?$/, "") + "/_payment";

const PAYU_CALLBACK_BASE = process.env.BASE_URL || "";

if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
  console.warn("[Billing] ⚠️  PAYU_MERCHANT_KEY or PAYU_MERCHANT_SALT not set in .env — payments will fail");
} else {
  console.log(`[Billing] PayU configured: key=${PAYU_MERCHANT_KEY.substring(0, 4)}***, url=${PAYU_BASE_URL}, callback=${PAYU_CALLBACK_BASE || "(auto-detect)"}`);

  // Verify PayU credentials on startup with a test API call
  const verifyHash = crypto.createHash("sha512")
    .update(`${PAYU_MERCHANT_KEY}|verify_payment|__startup_check__|${PAYU_MERCHANT_SALT}`)
    .digest("hex");
  const verifyData = `key=${encodeURIComponent(PAYU_MERCHANT_KEY)}&command=verify_payment&var1=__startup_check__&hash=${verifyHash}`;
  const isTest = PAYU_BASE_URL.includes("test.payu.in");
  const verifyReq = https.request({
    hostname: isTest ? "test.payu.in" : "info.payu.in",
    port: 443,
    path: "/merchant/postservice.php?form=2",
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(verifyData) },
  }, (res) => {
    let body = "";
    res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    res.on("end", () => {
      try {
        const r = JSON.parse(body);
        if (r.status === 0 || r.msg === "No Records Found" || r.transaction_details) {
          console.log("[Billing] ✅ PayU credentials verified — API connection OK");
        } else if (r.status === -1 && (r.msg || "").toLowerCase().includes("invalid")) {
          console.error(`[Billing] ❌ PayU credentials INVALID: ${r.msg}. Update PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT in .env`);
        } else {
          console.warn(`[Billing] ⚠️  PayU credentials check response: ${JSON.stringify(r).substring(0, 200)}`);
        }
      } catch {
        console.warn(`[Billing] ⚠️  PayU credentials check: unexpected response (HTTP ${res.statusCode}): ${body.substring(0, 200)}`);
      }
    });
  });
  verifyReq.on("error", (err) => console.warn(`[Billing] ⚠️  Could not verify PayU credentials: ${err.message}`));
  verifyReq.write(verifyData);
  verifyReq.end();
}

// Default plans to seed
const DEFAULT_PLANS = [
  {
    name: "free_trial",
    displayName: "Free Trial",
    priceMonthly: 0,
    maxUsers: 3,
    maxFlows: 10,
    maxFormSubmissions: 25,
    extraFlowCost: 5,
    extraSubmissionCost: 2,
    extraUserCost: 100,
    trialDurationDays: 14,
    sortOrder: 0,
  },
  {
    name: "starter",
    displayName: "Starter Plan",
    priceMonthly: 1999,
    maxUsers: 10,
    maxFlows: 200,
    maxFormSubmissions: 500,
    extraFlowCost: 5,
    extraSubmissionCost: 2,
    extraUserCost: 100,
    trialDurationDays: null,
    sortOrder: 1,
  },
  {
    name: "growth",
    displayName: "Growth Plan",
    priceMonthly: 4999,
    maxUsers: 25,
    maxFlows: 800,
    maxFormSubmissions: 2000,
    extraFlowCost: 5,
    extraSubmissionCost: 2,
    extraUserCost: 100,
    trialDurationDays: null,
    sortOrder: 2,
  },
  {
    name: "business",
    displayName: "Business Plan",
    priceMonthly: 9999,
    maxUsers: 50,
    maxFlows: 2500,
    maxFormSubmissions: 5000,
    extraFlowCost: 5,
    extraSubmissionCost: 2,
    extraUserCost: 100,
    trialDurationDays: null,
    sortOrder: 3,
  },
];

/** Generate PayU hash for payment */
function generatePayUHash(params: {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  key?: string;
  salt?: string;
}): string {
  const key = params.key || PAYU_MERCHANT_KEY;
  const salt = params.salt || PAYU_MERCHANT_SALT;
  // PayU hash formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
  const hashString = `${key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${salt}`;
  const hash = crypto.createHash("sha512").update(hashString).digest("hex");
  console.log(`[PayU Hash] txnid=${params.txnid} amount=${params.amount} productinfo="${params.productinfo}" firstname="${params.firstname}" email="${params.email}" hashInput(masked)=${key.substring(0,3)}***|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||*** hash=${hash.substring(0,16)}...`);
  return hash;
}

/** Verify PayU response hash */
function verifyPayUHash(params: {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  additionalCharges?: string;
  key?: string;
  salt?: string;
}): string {
  const key = params.key || PAYU_MERCHANT_KEY;
  const salt = params.salt || PAYU_MERCHANT_SALT;
  // Reverse hash formula (PayU official):
  //   Without additionalCharges: sha512(SALT|status|||||||||||email|firstname|productinfo|amount|txnid|key)
  //   With    additionalCharges: sha512(additionalCharges|SALT|status|||||||||||email|firstname|productinfo|amount|txnid|key)
  const additionalCharges = params.additionalCharges || "";
  const basePart = `${params.status}|||||||||||${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${key}`;
  const hashString = additionalCharges
    ? `${additionalCharges}|${salt}|${basePart}`
    : `${salt}|${basePart}`;
  console.log(`[Billing] Verify hash input: ${hashString.substring(0, 80)}...`);
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/** Verify transaction with PayU server-side API */
async function verifyPaymentWithPayU(txnId: string): Promise<{
  status: string;
  mihpayid?: string;
  mode?: string;
  amount?: string;
  error_Message?: string;
  firstname?: string;
  email?: string;
  productinfo?: string;
  raw?: any;
}> {
  return new Promise((resolve, reject) => {
    const postData = `key=${encodeURIComponent(PAYU_MERCHANT_KEY)}&command=verify_payment&var1=${encodeURIComponent(txnId)}&hash=${generatePayUCommandHash("verify_payment", txnId)}`;

    const isTestMode = PAYU_BASE_URL.includes("test.payu.in");
    const hostname = isTestMode ? "test.payu.in" : "info.payu.in";
    const path = "/merchant/postservice.php?form=2";

    const options = {
      hostname,
      port: 443,
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    console.log(`[Billing] Verifying payment with PayU: ${hostname}${path} txnId=${txnId}`);

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          console.log(`[Billing] PayU verify response for ${txnId}:`, JSON.stringify(result).substring(0, 200));
          if (result.status === 1 && result.transaction_details) {
            const txnDetails = result.transaction_details[txnId];
            if (txnDetails) {
              resolve({
                status: txnDetails.status?.toLowerCase() || "unknown",
                mihpayid: txnDetails.mihpayid,
                mode: txnDetails.mode,
                amount: txnDetails.amt || txnDetails.amount,
                error_Message: txnDetails.error_Message,
                firstname: txnDetails.firstname,
                email: txnDetails.email,
                productinfo: txnDetails.productinfo,
                raw: txnDetails,
              });
            } else {
              resolve({ status: "not_found", raw: result });
            }
          } else {
            resolve({ status: "error", raw: result });
          }
        } catch (e) {
          console.error("[Billing] PayU verify parse error:", e, "raw:", data.substring(0, 200));
          reject(new Error("Failed to parse PayU response"));
        }
      });
    });

    req.on("error", (e: Error) => {
      console.error("[Billing] PayU verify request error:", e);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/** Generate hash for PayU API commands (verify_payment, etc.) */
function generatePayUCommandHash(command: string, var1: string): string {
  // PayU command hash: sha512(key|command|var1|salt)
  const hashString = `${PAYU_MERCHANT_KEY}|${command}|${var1}|${PAYU_MERCHANT_SALT}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/** Process a successful payment — activate subscription, update org, etc. */
async function processSuccessfulPayment(transaction: any, payuDetails: {
  mihpayid?: string;
  mode?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  amount?: string;
  raw?: any;
}): Promise<void> {
  // Update transaction to success
  await db
    .update(paymentTransactions)
    .set({
      status: "success",
      payuTxnId: transaction.txnId,
      payuMihpayid: payuDetails.mihpayid || null,
      paymentMode: payuDetails.mode || null,
      payuResponse: payuDetails.raw || {},
      updatedAt: new Date(),
    })
    .where(eq(paymentTransactions.id, transaction.id));

  // Process subscription activation / scheduled upgrade
  if (
    transaction.paymentType === "subscription" ||
    transaction.paymentType === "combined"
  ) {
    const productinfo = payuDetails.productinfo || transaction.txnId;
    const planNames = ["starter", "growth", "business"];
    let targetPlanName = "";
    for (const pn of planNames) {
      if (productinfo.toLowerCase().includes(pn)) {
        targetPlanName = pn;
        break;
      }
    }

    if (targetPlanName) {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, targetPlanName));

      if (plan) {
        const now = new Date();

        // Check for an existing active subscription
        const [existingSub] = await db
          .select()
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.organizationId, transaction.organizationId),
              eq(organizationSubscriptions.status, "active")
            )
          )
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(1);

        if (existingSub && new Date(existingSub.billingCycleEnd) > now) {
          // ─── DEFERRED UPGRADE ─────────────────────────────────────
          // Current plan stays active until billingCycleEnd.
          // Schedule the new plan to activate after cycle ends.
          await db
            .update(organizationSubscriptions)
            .set({
              scheduledPlanId: plan.id,
              scheduledPaymentId: transaction.txnId,
              scheduledAt: now,
              updatedAt: now,
            })
            .where(eq(organizationSubscriptions.id, existingSub.id));

          // Link payment to current subscription
          await db
            .update(paymentTransactions)
            .set({ subscriptionId: existingSub.id })
            .where(eq(paymentTransactions.id, transaction.id));

          console.log(
            `[Billing] Upgrade scheduled: org=${transaction.organizationId} ` +
            `from current plan to ${targetPlanName}, activates after ${existingSub.billingCycleEnd}`
          );
        } else {
          // ─── IMMEDIATE ACTIVATION ─────────────────────────────────
          // No active subscription or cycle already ended → activate now.
          const billingEnd = new Date(now);
          billingEnd.setMonth(billingEnd.getMonth() + 1);

          // Expire old subscription if exists
          if (existingSub) {
            await db
              .update(organizationSubscriptions)
              .set({ status: "expired", updatedAt: now })
              .where(eq(organizationSubscriptions.id, existingSub.id));
          }

          // Count current users
          const orgUsers = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.organizationId, transaction.organizationId));

          // Create new subscription
          const [newSub] = await db
            .insert(organizationSubscriptions)
            .values({
              organizationId: transaction.organizationId,
              planId: plan.id,
              status: "active",
              billingCycleStart: now,
              billingCycleEnd: billingEnd,
              usedUsers: orgUsers[0]?.count || 0,
              outstandingAmount: 0,
            })
            .returning();

          // Update the transaction with new subscription ID
          await db
            .update(paymentTransactions)
            .set({ subscriptionId: newSub.id })
            .where(eq(paymentTransactions.id, transaction.id));

          // Update org planType
          await db
            .update(organizations)
            .set({
              planType: targetPlanName,
              maxUsers: plan.maxUsers,
              maxFlows: plan.maxFlows,
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, transaction.organizationId));

          console.log(`[Billing] Subscription activated immediately: org=${transaction.organizationId} plan=${targetPlanName}`);
        }
      }
    }
  }

  // Clear outstanding if included in payment
  if (
    transaction.paymentType === "outstanding" ||
    transaction.paymentType === "combined"
  ) {
    await db
      .update(organizationSubscriptions)
      .set({ outstandingAmount: 0, updatedAt: new Date() })
      .where(
        and(
          eq(organizationSubscriptions.organizationId, transaction.organizationId),
          eq(organizationSubscriptions.status, "active")
        )
      );
  }
}

/** Calculate extra usage amount */
function calculateExtraUsage(
  subscription: any,
  plan: any
): { extraFlows: number; extraSubmissions: number; extraUsers: number; totalExtra: number } {
  const extraFlows = Math.max(0, (subscription.usedFlows || 0) - plan.maxFlows);
  const extraSubmissions = Math.max(0, (subscription.usedFormSubmissions || 0) - plan.maxFormSubmissions);
  const extraUsers = Math.max(0, (subscription.usedUsers || 0) - plan.maxUsers);

  const totalExtra =
    extraFlows * (plan.extraFlowCost || 5) +
    extraSubmissions * (plan.extraSubmissionCost || 2) +
    extraUsers * (plan.extraUserCost || 100);

  return { extraFlows, extraSubmissions, extraUsers, totalExtra };
}

/**
 * Process billing cycle transitions for an organization.
 * If the current billing cycle has ended and a scheduled upgrade exists,
 * activate the new plan. Called lazily on subscription access and periodically.
 *
 * Returns the (possibly updated) active subscription, or null.
 */
async function processBillingCycleTransition(organizationId: string): Promise<any | null> {
  const now = new Date();

  // Get the latest active subscription
  const [subscription] = await db
    .select()
    .from(organizationSubscriptions)
    .where(
      and(
        eq(organizationSubscriptions.organizationId, organizationId),
        eq(organizationSubscriptions.status, "active")
      )
    )
    .orderBy(desc(organizationSubscriptions.createdAt))
    .limit(1);

  if (!subscription) return null;

  const cycleEnd = new Date(subscription.billingCycleEnd);
  if (cycleEnd > now) {
    // Cycle still active — no transition needed
    return subscription;
  }

  // ─── Billing cycle has ended ──────────────────────────────────────────

  if (subscription.scheduledPlanId) {
    // ─── ACTIVATE SCHEDULED UPGRADE ─────────────────────────────────
    const [newPlan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.scheduledPlanId));

    if (newPlan) {
      // Expire current subscription (keeping its usage history intact)
      await db
        .update(organizationSubscriptions)
        .set({
          status: "expired",
          scheduledPlanId: null,
          scheduledPaymentId: null,
          scheduledAt: null,
          updatedAt: now,
        })
        .where(eq(organizationSubscriptions.id, subscription.id));

      // New billing cycle: starts now, ends in 1 month
      const newCycleEnd = new Date(now);
      newCycleEnd.setMonth(newCycleEnd.getMonth() + 1);

      // Count current users
      const orgUsers = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.organizationId, organizationId));

      // Create new subscription with upgraded plan
      const [newSub] = await db
        .insert(organizationSubscriptions)
        .values({
          organizationId,
          planId: newPlan.id,
          status: "active",
          billingCycleStart: now,
          billingCycleEnd: newCycleEnd,
          usedUsers: orgUsers[0]?.count || 0,
          outstandingAmount: 0,
        })
        .returning();

      // Update org planType
      await db
        .update(organizations)
        .set({
          planType: newPlan.name,
          maxUsers: newPlan.maxUsers,
          maxFlows: newPlan.maxFlows,
          updatedAt: now,
        })
        .where(eq(organizations.id, organizationId));

      console.log(
        `[Billing] Scheduled upgrade activated: org=${organizationId} plan=${newPlan.name} ` +
        `newCycle=${now.toISOString()} → ${newCycleEnd.toISOString()}`
      );

      return newSub;
    }
  }

  // No scheduled upgrade — mark current subscription as expired
  await db
    .update(organizationSubscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(eq(organizationSubscriptions.id, subscription.id));

  console.log(`[Billing] Subscription expired: org=${organizationId} sub=${subscription.id}`);
  return null;
}

export function registerBillingRoutes(
  app: Express,
  middleware: {
    isAuthenticated: any;
    requireAdmin: any;
    addUserToRequest: any;
  }
) {
  const { isAuthenticated, requireAdmin, addUserToRequest } = middleware;

  // ─── Seed default plans if they don't exist ─────────────────────────────
  (async () => {
    try {
      const existing = await db.select().from(subscriptionPlans);
      if (existing.length === 0) {
        for (const plan of DEFAULT_PLANS) {
          await db.insert(subscriptionPlans).values(plan);
        }
        console.log("[Billing] Seeded default subscription plans");
      }
    } catch (error) {
      console.error("[Billing] Error seeding plans:", error);
    }
  })();

  // ═══════════════════════════════════════════════════════════════════════
  //  GET /api/billing/plans - Get all available plans (public)
  // ═══════════════════════════════════════════════════════════════════════
  app.get("/api/billing/plans", async (_req: Request, res: Response) => {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.sortOrder);
      res.json(plans);
    } catch (error) {
      console.error("[Billing] Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  GET /api/billing/subscription - Get current org subscription
  // ═══════════════════════════════════════════════════════════════════════
  app.get(
    "/api/billing/subscription",
    isAuthenticated,
    addUserToRequest,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        // Run billing cycle transition (activates scheduled upgrades if cycle ended)
        await processBillingCycleTransition(user.organizationId);

        // Re-fetch the (possibly updated) active subscription
        const [subscription] = await db
          .select()
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.organizationId, user.organizationId),
              eq(organizationSubscriptions.status, "active")
            )
          )
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(1);

        if (!subscription) {
          return res.json({ subscription: null, plan: null, usage: null });
        }

        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, subscription.planId));

        // Calculate extra usage
        const extraUsage = plan ? calculateExtraUsage(subscription, plan) : null;

        // Check if trial/subscription expired
        const now = new Date();
        let isExpired = false;
        let isTrialExpired = false;

        if (subscription.trialEndsAt && new Date(subscription.trialEndsAt) < now) {
          isTrialExpired = true;
          isExpired = true;
        }
        if (new Date(subscription.billingCycleEnd) < now) {
          isExpired = true;
        }

        // Check limits
        const limitsExceeded = {
          flows: plan ? (subscription.usedFlows || 0) >= plan.maxFlows : false,
          formSubmissions: plan ? (subscription.usedFormSubmissions || 0) >= plan.maxFormSubmissions : false,
          users: plan ? (subscription.usedUsers || 0) >= plan.maxUsers : false,
        };

        // Fetch scheduled upgrade plan info (if any)
        let scheduledUpgrade = null;
        if (subscription.scheduledPlanId) {
          const [scheduledPlan] = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, subscription.scheduledPlanId));
          if (scheduledPlan) {
            scheduledUpgrade = {
              plan: scheduledPlan,
              scheduledAt: subscription.scheduledAt,
              activatesAt: subscription.billingCycleEnd, // new plan starts after current cycle
            };
          }
        }

        res.json({
          subscription,
          plan,
          usage: {
            flows: subscription.usedFlows || 0,
            formSubmissions: subscription.usedFormSubmissions || 0,
            users: subscription.usedUsers || 0,
          },
          limits: plan
            ? {
                maxFlows: plan.maxFlows,
                maxFormSubmissions: plan.maxFormSubmissions,
                maxUsers: plan.maxUsers,
              }
            : null,
          limitsExceeded,
          extraUsage,
          isExpired,
          isTrialExpired,
          outstandingAmount: subscription.outstandingAmount || 0,
          scheduledUpgrade,
        });
      } catch (error) {
        console.error("[Billing] Error fetching subscription:", error);
        res.status(500).json({ message: "Failed to fetch subscription" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/subscribe - Start free trial or subscribe to a plan
  // ═══════════════════════════════════════════════════════════════════════
  app.post(
    "/api/billing/subscribe",
    isAuthenticated,
    addUserToRequest,
    requireAdmin,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        const { planName } = req.body;
        if (!planName) {
          return res.status(400).json({ message: "Plan name is required" });
        }

        // Get the plan
        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(and(eq(subscriptionPlans.name, planName), eq(subscriptionPlans.isActive, true)));

        if (!plan) {
          return res.status(404).json({ message: "Plan not found" });
        }

        // Check if org already has an active subscription
        const [existing] = await db
          .select()
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.organizationId, user.organizationId),
              eq(organizationSubscriptions.status, "active")
            )
          );

        if (existing && planName === "free_trial") {
          return res.status(400).json({ message: "Organization already has an active subscription" });
        }

        // For free trial - create subscription immediately
        if (planName === "free_trial") {
          // Check if org already used free trial
          const [pastTrial] = await db
            .select()
            .from(organizationSubscriptions)
            .innerJoin(subscriptionPlans, eq(organizationSubscriptions.planId, subscriptionPlans.id))
            .where(
              and(
                eq(organizationSubscriptions.organizationId, user.organizationId),
                eq(subscriptionPlans.name, "free_trial")
              )
            );

          if (pastTrial) {
            return res.status(400).json({ message: "Free trial already used for this organization" });
          }

          const now = new Date();
          const trialEnd = new Date(now);
          trialEnd.setDate(trialEnd.getDate() + (plan.trialDurationDays || 14));

          // Count current users
          const orgUsers = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.organizationId, user.organizationId));

          const [subscription] = await db
            .insert(organizationSubscriptions)
            .values({
              organizationId: user.organizationId,
              planId: plan.id,
              status: "active",
              billingCycleStart: now,
              billingCycleEnd: trialEnd,
              trialEndsAt: trialEnd,
              usedUsers: orgUsers[0]?.count || 0,
            })
            .returning();

          // Update org planType
          await db
            .update(organizations)
            .set({ planType: "free_trial", updatedAt: new Date() })
            .where(eq(organizations.id, user.organizationId));

          return res.json({ subscription, message: "Free trial activated!" });
        }

        // For paid plans - calculate outstanding (included in combined payment, does not block upgrade)
        let outstandingAmount = 0;
        if (existing) {
          const [currentPlan] = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, existing.planId));
          
          if (currentPlan) {
            const { totalExtra } = calculateExtraUsage(existing, currentPlan);
            outstandingAmount = (existing.outstandingAmount || 0) + totalExtra;
          }

          // Check if there's already a scheduled upgrade
          if (existing.scheduledPlanId) {
            return res.status(400).json({
              message: "You already have a scheduled upgrade. Cancel it first to choose a different plan.",
            });
          }
        }

        // For paid plans, return payment initiation data
        // Current plan stays active → new plan starts after current cycle ends
        // Payment will happen through /api/billing/initiate-payment
        res.json({
          plan,
          requiresPayment: true,
          paymentType: existing && outstandingAmount > 0 ? "combined" : existing ? "subscription" : "subscription",
          amount: plan.priceMonthly + outstandingAmount,
          planAmount: plan.priceMonthly,
          outstandingAmount,
          isUpgrade: !!existing,
          activatesAt: existing ? existing.billingCycleEnd : null, // deferred activation date
        });
      } catch (error) {
        console.error("[Billing] Error subscribing:", error);
        res.status(500).json({ message: "Failed to create subscription" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/initiate-payment - Create PayU payment request
  // ═══════════════════════════════════════════════════════════════════════
  app.post(
    "/api/billing/initiate-payment",
    isAuthenticated,
    addUserToRequest,
    requireAdmin,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        const { planName, paymentType } = req.body;
        // paymentType: "subscription" | "outstanding" | "combined"

        // Get current subscription
        const [currentSub] = await db
          .select()
          .from(organizationSubscriptions)
          .where(eq(organizationSubscriptions.organizationId, user.organizationId))
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(1);

        let amount = 0;
        let planAmount = 0;
        let outstandingToPay = 0;
        let extraUsageAmount = 0;

        // Calculate outstanding
        if (currentSub) {
          const [currentPlan] = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, currentSub.planId));
          
          if (currentPlan) {
            const { totalExtra } = calculateExtraUsage(currentSub, currentPlan);
            outstandingToPay = (currentSub.outstandingAmount || 0) + totalExtra;
            extraUsageAmount = totalExtra;
          }
        }

        // Get target plan for subscription/upgrade payments
        let targetPlan: any = null;
        if (planName && (paymentType === "subscription" || paymentType === "combined")) {
          const [plan] = await db
            .select()
            .from(subscriptionPlans)
            .where(and(eq(subscriptionPlans.name, planName), eq(subscriptionPlans.isActive, true)));
          
          if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
          }
          targetPlan = plan;
          planAmount = plan.priceMonthly;
        }

        // Calculate total amount based on payment type
        if (paymentType === "outstanding") {
          if (outstandingToPay <= 0) {
            return res.status(400).json({ message: "No outstanding amount" });
          }
          amount = outstandingToPay;
        } else if (paymentType === "subscription") {
          // Must pay outstanding first
          if (outstandingToPay > 0) {
            return res.status(402).json({
              message: "Please pay outstanding amount first",
              outstandingAmount: outstandingToPay,
            });
          }
          amount = planAmount;
        } else if (paymentType === "combined") {
          amount = outstandingToPay + planAmount;
        } else {
          return res.status(400).json({ message: "Invalid payment type" });
        }

        if (amount <= 0) {
          return res.status(400).json({ message: "Invalid payment amount" });
        }

        // Create transaction record
        const txnId = `PS_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

        const [transaction] = await db
          .insert(paymentTransactions)
          .values({
            organizationId: user.organizationId,
            subscriptionId: currentSub?.id || null,
            txnId,
            amount,
            planAmount,
            outstandingAmount: outstandingToPay,
            extraUsageAmount,
            status: "pending",
            paymentType: paymentType || "subscription",
            initiatedBy: user.id,
          })
          .returning();

        // Get org details for PayU
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, user.organizationId));

        const rawProductInfo = targetPlan
          ? `ProcessSutra ${targetPlan.displayName}${outstandingToPay > 0 ? " + Outstanding" : ""}`
          : "ProcessSutra Outstanding Payment";
        // PayU productinfo: strip non-ASCII and pipe chars to prevent hash issues
        const productInfo = rawProductInfo.replace(/[^a-zA-Z0-9 _.+\-]/g, "").trim() || "ProcessSutra Plan";

        // Ensure required PayU fields are never empty
        const firstname = (user.firstName || org?.name || "User").trim() || "User";
        const email = (user.email || "").trim();
        const phone = (org?.phone || "9999999999").trim(); // PayU requires phone; fallback to placeholder

        if (!email) {
          return res.status(400).json({ message: "User email is required for payment" });
        }

        // Generate PayU hash
        const hash = generatePayUHash({
          txnid: txnId,
          amount: amount.toFixed(2),
          productinfo: productInfo,
          firstname,
          email,
        });

        // Build PayU form data
        const baseUrl = PAYU_CALLBACK_BASE
          || (process.env.DOMAIN_NAME
            ? `https://${process.env.DOMAIN_NAME}`
            : `${req.protocol}://${req.get("host")}`);

        const payuData = {
          key: PAYU_MERCHANT_KEY,
          txnid: txnId,
          amount: amount.toFixed(2),
          productinfo: productInfo,
          firstname,
          email,
          phone,
          surl: `${baseUrl}/api/billing/payment-callback`,
          furl: `${baseUrl}/api/billing/payment-callback`,
          hash,
          // Explicitly send UDF fields even when empty — PayU official SDK requires them
          udf1: "",
          udf2: "",
          udf3: "",
          udf4: "",
          udf5: "",
        };

        console.log(`[Billing] Payment initiated: txn=${txnId} amount=₹${amount} plan=${targetPlan?.name || "outstanding"} payuUrl=${PAYU_BASE_URL} surl=${payuData.surl}`);

        res.json({
          transaction,
          payuData,
          payuUrl: PAYU_BASE_URL,
          planName: targetPlan?.name,
        });
      } catch (error) {
        console.error("[Billing] Error initiating payment:", error);
        res.status(500).json({ message: "Failed to initiate payment" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/payment-callback - PayU callback (success/failure)
  // ═══════════════════════════════════════════════════════════════════════
  app.post("/api/billing/payment-callback", async (req: Request, res: Response) => {
    try {
      const {
        mihpayid,
        status,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        hash: receivedHash,
        mode,
        error_Message,
        additionalCharges,
      } = req.body;

      console.log(`[Billing] PayU callback received - txnid: ${txnid}, status: ${status}, mihpayid: ${mihpayid}, mode: ${mode}`);
      console.log(`[Billing] PayU callback body keys:`, Object.keys(req.body || {}).join(", "));

      if (!txnid) {
        console.error("[Billing] PayU callback missing txnid");
        return res.redirect("/billing?payment=error&reason=missing_txnid");
      }

      // Find the transaction
      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.txnId, txnid));

      if (!transaction) {
        console.error(`[Billing] Transaction not found: ${txnid}`);
        return res.redirect("/billing?payment=error&reason=transaction_not_found");
      }

      // Skip if already processed
      if (transaction.status === "success") {
        console.log(`[Billing] Transaction ${txnid} already processed as success`);
        return res.redirect("/billing?payment=success");
      }

      // Verify hash (log but don't block — PayU hash issues are common in test mode)
      const expectedHash = verifyPayUHash({
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        status,
        additionalCharges,
      });

      const hashValid = receivedHash === expectedHash;
      if (!hashValid) {
        console.warn(`[Billing] Hash mismatch for txn ${txnid}`);
        console.warn(`[Billing]   received: ${(receivedHash || "").substring(0, 32)}...`);
        console.warn(`[Billing]   expected: ${expectedHash.substring(0, 32)}...`);

        // SECURITY: In production, reject forged callbacks
        const isTestMode = PAYU_BASE_URL.includes("test.payu.in");
        if (!isTestMode) {
          console.error(`[Billing] REJECTING payment callback with invalid hash for txn ${txnid} in production`);
          await db
            .update(paymentTransactions)
            .set({
              status: "failed",
              errorMessage: "Payment callback hash verification failed — possible forgery",
              payuResponse: req.body,
              updatedAt: new Date(),
            })
            .where(eq(paymentTransactions.id, transaction.id));
          return res.redirect(`/billing?payment=failed&reason=${encodeURIComponent("Payment verification failed")}`);
        }
        // In test mode, log warning and continue processing
        console.warn(`[Billing] Allowing hash mismatch in PayU TEST mode for txn ${txnid}`);
      }

      // Store PayU response regardless
      await db
        .update(paymentTransactions)
        .set({ payuResponse: req.body, updatedAt: new Date() })
        .where(eq(paymentTransactions.id, transaction.id));

      if (status === "success") {
        await processSuccessfulPayment(transaction, {
          mihpayid,
          mode,
          productinfo,
          firstname,
          email,
          amount,
          raw: req.body,
        });
        return res.redirect("/billing?payment=success");
      } else {
        // Payment failed
        await db
          .update(paymentTransactions)
          .set({
            status: "failed",
            payuMihpayid: mihpayid,
            paymentMode: mode,
            errorMessage: error_Message || "Payment failed",
            updatedAt: new Date(),
          })
          .where(eq(paymentTransactions.id, transaction.id));

        return res.redirect(`/billing?payment=failed&reason=${encodeURIComponent(error_Message || "Payment failed")}`);
      }
    } catch (error) {
      console.error("[Billing] Payment callback error:", error);
      return res.redirect("/billing?payment=error&reason=internal_error");
    }
  });

  // Also handle GET callback (some PayU integrations redirect via GET)
  app.get("/api/billing/payment-callback", async (req: Request, res: Response) => {
    console.log(`[Billing] PayU GET callback received - query:`, req.query);
    // PayU typically uses POST, but if GET, redirect to billing with whatever info we have
    return res.redirect("/billing?payment=pending&reason=verify_required");
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/verify-payment - Verify payment status with PayU
  // ═══════════════════════════════════════════════════════════════════════
  app.post(
    "/api/billing/verify-payment",
    isAuthenticated,
    addUserToRequest,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        const { txnId } = req.body;
        if (!txnId) {
          return res.status(400).json({ message: "Transaction ID is required" });
        }

        // Find the transaction (must belong to user's org)
        const [transaction] = await db
          .select()
          .from(paymentTransactions)
          .where(
            and(
              eq(paymentTransactions.txnId, txnId),
              eq(paymentTransactions.organizationId, user.organizationId)
            )
          );

        if (!transaction) {
          return res.status(404).json({ message: "Transaction not found" });
        }

        // If already processed, return current status
        if (transaction.status === "success") {
          return res.json({ status: "success", message: "Payment already processed", transaction });
        }

        // Verify with PayU
        const payuResult = await verifyPaymentWithPayU(txnId);
        console.log(`[Billing] PayU verify result for ${txnId}: status=${payuResult.status}`);

        if (payuResult.status === "success") {
          // Payment succeeded on PayU — process it
          await processSuccessfulPayment(transaction, {
            mihpayid: payuResult.mihpayid,
            mode: payuResult.mode,
            productinfo: payuResult.productinfo,
            firstname: payuResult.firstname,
            email: payuResult.email,
            amount: payuResult.amount,
            raw: payuResult.raw,
          });

          return res.json({
            status: "success",
            message: "Payment verified and subscription activated!",
            payuStatus: payuResult.status,
          });
        } else if (payuResult.status === "failure" || payuResult.status === "failed") {
          // Payment failed on PayU
          await db
            .update(paymentTransactions)
            .set({
              status: "failed",
              errorMessage: payuResult.error_Message || "Payment failed on PayU",
              payuResponse: payuResult.raw || {},
              updatedAt: new Date(),
            })
            .where(eq(paymentTransactions.id, transaction.id));

          return res.json({
            status: "failed",
            message: "Payment was declined or failed on PayU",
            payuStatus: payuResult.status,
          });
        } else {
          // Still pending or unknown
          return res.json({
            status: "pending",
            message: "Payment status is still pending. Please try again in a few moments.",
            payuStatus: payuResult.status,
          });
        }
      } catch (error) {
        console.error("[Billing] Error verifying payment:", error);
        res.status(500).json({ message: "Failed to verify payment with PayU" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/process-pending - Auto-verify all pending payments for org
  // ═══════════════════════════════════════════════════════════════════════
  app.post(
    "/api/billing/process-pending",
    isAuthenticated,
    addUserToRequest,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        // Find all pending transactions for this org (last 24 hours only)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pendingTxns = await db
          .select()
          .from(paymentTransactions)
          .where(
            and(
              eq(paymentTransactions.organizationId, user.organizationId),
              eq(paymentTransactions.status, "pending"),
              sql`${paymentTransactions.createdAt} > ${oneDayAgo}`
            )
          )
          .orderBy(desc(paymentTransactions.createdAt))
          .limit(5);

        if (pendingTxns.length === 0) {
          return res.json({ processed: 0, results: [] });
        }

        const results: Array<{ txnId: string; status: string; message: string }> = [];

        for (const txn of pendingTxns) {
          try {
            const payuResult = await verifyPaymentWithPayU(txn.txnId);
            console.log(`[Billing] Auto-verify ${txn.txnId}: PayU status=${payuResult.status}`);

            if (payuResult.status === "success") {
              await processSuccessfulPayment(txn, {
                mihpayid: payuResult.mihpayid,
                mode: payuResult.mode,
                productinfo: payuResult.productinfo,
                firstname: payuResult.firstname,
                email: payuResult.email,
                amount: payuResult.amount,
                raw: payuResult.raw,
              });
              results.push({ txnId: txn.txnId, status: "success", message: "Payment verified & activated" });
            } else if (payuResult.status === "failure" || payuResult.status === "failed") {
              await db
                .update(paymentTransactions)
                .set({
                  status: "failed",
                  errorMessage: payuResult.error_Message || "Payment failed",
                  payuResponse: payuResult.raw || {},
                  updatedAt: new Date(),
                })
                .where(eq(paymentTransactions.id, txn.id));
              results.push({ txnId: txn.txnId, status: "failed", message: "Payment failed" });
            } else {
              results.push({ txnId: txn.txnId, status: "pending", message: "Still pending on PayU" });
            }
          } catch (verifyErr) {
            console.error(`[Billing] Error verifying ${txn.txnId}:`, verifyErr);
            results.push({ txnId: txn.txnId, status: "error", message: "Verification failed" });
          }
        }

        return res.json({ processed: results.length, results });
      } catch (error) {
        console.error("[Billing] Error processing pending payments:", error);
        res.status(500).json({ message: "Failed to process pending payments" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  GET /api/billing/payment-history - Get payment history
  // ═══════════════════════════════════════════════════════════════════════
  app.get(
    "/api/billing/payment-history",
    isAuthenticated,
    addUserToRequest,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        const payments = await db
          .select()
          .from(paymentTransactions)
          .where(eq(paymentTransactions.organizationId, user.organizationId))
          .orderBy(desc(paymentTransactions.createdAt))
          .limit(50);

        res.json(payments);
      } catch (error) {
        console.error("[Billing] Error fetching payment history:", error);
        res.status(500).json({ message: "Failed to fetch payment history" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  GET /api/billing/usage - Get current usage stats
  // ═══════════════════════════════════════════════════════════════════════
  app.get(
    "/api/billing/usage",
    isAuthenticated,
    addUserToRequest,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        // Get current subscription
        const [subscription] = await db
          .select()
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.organizationId, user.organizationId),
              eq(organizationSubscriptions.status, "active")
            )
          )
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(1);

        if (!subscription) {
          return res.json({ hasSubscription: false });
        }

        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, subscription.planId));

        const extraUsage = plan ? calculateExtraUsage(subscription, plan) : null;

        res.json({
          hasSubscription: true,
          usage: {
            flows: { used: subscription.usedFlows || 0, limit: plan?.maxFlows || 0 },
            formSubmissions: { used: subscription.usedFormSubmissions || 0, limit: plan?.maxFormSubmissions || 0 },
            users: { used: subscription.usedUsers || 0, limit: plan?.maxUsers || 0 },
          },
          extraUsage,
          billingCycle: {
            start: subscription.billingCycleStart,
            end: subscription.billingCycleEnd,
          },
          outstandingAmount: subscription.outstandingAmount || 0,
        });
      } catch (error) {
        console.error("[Billing] Error fetching usage:", error);
        res.status(500).json({ message: "Failed to fetch usage" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/track-usage - Track a billable action (internal use)
  //  Requires admin role to prevent abuse by regular users
  // ═══════════════════════════════════════════════════════════════════════
  app.post(
    "/api/billing/track-usage",
    isAuthenticated,
    addUserToRequest,
    requireAdmin,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        const { actionType, actionId } = req.body;
        if (!actionType) {
          return res.status(400).json({ message: "Action type is required" });
        }

        const result = await trackUsage(user.organizationId, actionType, actionId);
        res.json(result);
      } catch (error) {
        console.error("[Billing] Error tracking usage:", error);
        res.status(500).json({ message: "Failed to track usage" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  GET /api/billing/check-limit - Check if action is within limits
  // ═══════════════════════════════════════════════════════════════════════
  app.get(
    "/api/billing/check-limit",
    isAuthenticated,
    addUserToRequest,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        const actionType = req.query.actionType as string;
        if (!actionType || !["flow_execution", "form_submission", "user_added"].includes(actionType)) {
          return res.status(400).json({ message: "Valid action type is required (flow_execution, form_submission, user_added)" });
        }

        const validActionType: "flow_execution" | "form_submission" | "user_added" = actionType as any;
        const result = await checkLimit(user.organizationId, validActionType);
        res.json(result);
      } catch (error) {
        console.error("[Billing] Error checking limit:", error);
        res.status(500).json({ message: "Failed to check limit" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/cancel-upgrade - Cancel a scheduled (deferred) upgrade
  // ═══════════════════════════════════════════════════════════════════════
  app.post(
    "/api/billing/cancel-upgrade",
    isAuthenticated,
    addUserToRequest,
    requireAdmin,
    async (req: any, res: Response) => {
      try {
        const user = req.currentUser;
        if (!user?.organizationId) {
          return res.status(400).json({ message: "No organization found" });
        }

        const [subscription] = await db
          .select()
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.organizationId, user.organizationId),
              eq(organizationSubscriptions.status, "active")
            )
          )
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(1);

        if (!subscription || !subscription.scheduledPlanId) {
          return res.status(400).json({ message: "No scheduled upgrade to cancel" });
        }

        // Clear the scheduled upgrade
        await db
          .update(organizationSubscriptions)
          .set({
            scheduledPlanId: null,
            scheduledPaymentId: null,
            scheduledAt: null,
            updatedAt: new Date(),
          })
          .where(eq(organizationSubscriptions.id, subscription.id));

        // Note: The payment was already collected. A refund would need to be
        // handled separately (manual or via PayU refund API). We mark the
        // transaction for refund review.
        if (subscription.scheduledPaymentId) {
          await db
            .update(paymentTransactions)
            .set({
              status: "refund_pending",
              errorMessage: "Scheduled upgrade cancelled by admin",
              updatedAt: new Date(),
            })
            .where(eq(paymentTransactions.txnId, subscription.scheduledPaymentId));
        }

        console.log(`[Billing] Scheduled upgrade cancelled: org=${user.organizationId}`);
        res.json({ message: "Scheduled upgrade cancelled. Refund will be processed." });
      } catch (error) {
        console.error("[Billing] Error cancelling upgrade:", error);
        res.status(500).json({ message: "Failed to cancel scheduled upgrade" });
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  POST /api/billing/process-transitions - Process all billing cycle transitions (cron-friendly)
  //  Protected by internal API key or super admin auth
  // ═══════════════════════════════════════════════════════════════════════
  app.post(
    "/api/billing/process-transitions",
    async (_req: Request, res: Response) => {
      // SECURITY: Require an internal API key or authenticated super admin session
      const authHeader = _req.headers["x-internal-api-key"];
      const internalKey = process.env.INTERNAL_API_KEY;
      const sessionUser = (_req.session as any)?.user;

      let authorizedViaSuperAdmin = false;
      if (sessionUser?.id) {
        try {
          const u = await storage.getUser(sessionUser.id);
          if (u?.isSuperAdmin) authorizedViaSuperAdmin = true;
        } catch {}
      }

      if (!authorizedViaSuperAdmin) {
        if (!internalKey || authHeader !== internalKey) {
          console.warn("[Billing] Unauthorized process-transitions attempt");
          return res.status(401).json({ message: "Unauthorized. Provide valid X-Internal-API-Key header or super admin session." });
        }
      }
      try {
        // Find all active subscriptions whose billing cycle has ended
        const now = new Date();
        const expiredSubs = await db
          .select({ organizationId: organizationSubscriptions.organizationId })
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.status, "active"),
              sql`${organizationSubscriptions.billingCycleEnd} <= ${now}`
            )
          );

        let processed = 0;
        for (const sub of expiredSubs) {
          try {
            await processBillingCycleTransition(sub.organizationId);
            processed++;
          } catch (err) {
            console.error(`[Billing] Transition error for org=${sub.organizationId}:`, err);
          }
        }

        console.log(`[Billing] Processed ${processed}/${expiredSubs.length} billing cycle transitions`);
        res.json({ processed, total: expiredSubs.length });
      } catch (error) {
        console.error("[Billing] Error processing transitions:", error);
        res.status(500).json({ message: "Failed to process transitions" });
      }
    }
  );

  console.log("[Billing] Routes registered");
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTED UTILITY FUNCTIONS (used by other routes)
// ═══════════════════════════════════════════════════════════════════════════

/** Track usage for billing - call this when a billable action occurs */
export async function trackUsage(
  organizationId: string,
  actionType: "flow_execution" | "form_submission" | "user_added",
  actionId?: string
): Promise<{ allowed: boolean; withinLimit: boolean; message?: string }> {
  try {
    // Process any pending billing cycle transitions first
    await processBillingCycleTransition(organizationId);

    // Get active subscription
    const [subscription] = await db
      .select()
      .from(organizationSubscriptions)
      .where(
        and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        )
      )
      .orderBy(desc(organizationSubscriptions.createdAt))
      .limit(1);

    if (!subscription) {
      // No subscription - allow but mark as no subscription
      return { allowed: true, withinLimit: true, message: "No active subscription" };
    }

    // Check if expired
    const now = new Date();
    if (subscription.trialEndsAt && new Date(subscription.trialEndsAt) < now) {
      return {
        allowed: false,
        withinLimit: false,
        message: "Free trial has expired. Please upgrade your plan to continue.",
      };
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.planId));

    if (!plan) {
      return { allowed: true, withinLimit: true };
    }

    let withinLimit = true;

    // Check and increment usage
    if (actionType === "flow_execution") {
      withinLimit = (subscription.usedFlows || 0) < plan.maxFlows;
      await db
        .update(organizationSubscriptions)
        .set({
          usedFlows: sql`COALESCE(${organizationSubscriptions.usedFlows}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(organizationSubscriptions.id, subscription.id));
    } else if (actionType === "form_submission") {
      withinLimit = (subscription.usedFormSubmissions || 0) < plan.maxFormSubmissions;
      await db
        .update(organizationSubscriptions)
        .set({
          usedFormSubmissions: sql`COALESCE(${organizationSubscriptions.usedFormSubmissions}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(organizationSubscriptions.id, subscription.id));
    } else if (actionType === "user_added") {
      withinLimit = (subscription.usedUsers || 0) < plan.maxUsers;
      await db
        .update(organizationSubscriptions)
        .set({
          usedUsers: sql`COALESCE(${organizationSubscriptions.usedUsers}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(organizationSubscriptions.id, subscription.id));
    }

    // Log the usage
    await db.insert(usageLogs).values({
      organizationId,
      subscriptionId: subscription.id,
      actionType,
      actionId,
      isWithinLimit: withinLimit,
    });

    // If over limit on free trial, block
    if (!withinLimit && plan.name === "free_trial") {
      return {
        allowed: false,
        withinLimit: false,
        message: `You have reached the free usage limit. Upgrade your plan to continue using ProcessSutra workflows.`,
      };
    }

    // For paid plans, allow but track extra usage
    if (!withinLimit) {
      // Calculate extra cost and add to outstanding
      let extraCost = 0;
      if (actionType === "flow_execution") extraCost = plan.extraFlowCost || 5;
      else if (actionType === "form_submission") extraCost = plan.extraSubmissionCost || 2;
      else if (actionType === "user_added") extraCost = plan.extraUserCost || 100;

      await db
        .update(organizationSubscriptions)
        .set({
          outstandingAmount: sql`COALESCE(${organizationSubscriptions.outstandingAmount}, 0) + ${extraCost}`,
          updatedAt: new Date(),
        })
        .where(eq(organizationSubscriptions.id, subscription.id));
    }

    return { allowed: true, withinLimit };
  } catch (error) {
    console.error("[Billing] Error tracking usage:", error);
    return { allowed: true, withinLimit: true }; // Fail open
  }
}

/** Check if an action is within limits without tracking */
export async function checkLimit(
  organizationId: string,
  actionType: "flow_execution" | "form_submission" | "user_added"
): Promise<{
  allowed: boolean;
  withinLimit: boolean;
  used: number;
  limit: number;
  planName: string | null;
  message?: string;
}> {
  try {
    // Process any pending billing cycle transitions first
    await processBillingCycleTransition(organizationId);

    const [subscription] = await db
      .select()
      .from(organizationSubscriptions)
      .where(
        and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        )
      )
      .orderBy(desc(organizationSubscriptions.createdAt))
      .limit(1);

    if (!subscription) {
      return { allowed: true, withinLimit: true, used: 0, limit: 0, planName: null };
    }

    // Check if expired
    const now = new Date();
    if (subscription.trialEndsAt && new Date(subscription.trialEndsAt) < now) {
      return {
        allowed: false,
        withinLimit: false,
        used: 0,
        limit: 0,
        planName: "free_trial",
        message: "Free trial has expired. Please upgrade your plan.",
      };
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.planId));

    if (!plan) {
      return { allowed: true, withinLimit: true, used: 0, limit: 0, planName: null };
    }

    let used = 0;
    let limit = 0;

    if (actionType === "flow_execution") {
      used = subscription.usedFlows || 0;
      limit = plan.maxFlows;
    } else if (actionType === "form_submission") {
      used = subscription.usedFormSubmissions || 0;
      limit = plan.maxFormSubmissions;
    } else if (actionType === "user_added") {
      used = subscription.usedUsers || 0;
      limit = plan.maxUsers;
    }

    const withinLimit = used < limit;
    const allowed = withinLimit || plan.name !== "free_trial"; // paid plans allow overage

    return {
      allowed,
      withinLimit,
      used,
      limit,
      planName: plan.name,
      message: !withinLimit && plan.name === "free_trial"
        ? "You have reached the free usage limit. Upgrade your plan to continue using ProcessSutra workflows."
        : undefined,
    };
  } catch (error) {
    console.error("[Billing] Error checking limit:", error);
    return { allowed: true, withinLimit: true, used: 0, limit: 0, planName: null };
  }
}
