/**
 * PayU Payment Gateway Integration
 *
 * Implements payment initiation, hash generation, and verification
 * for PayU India (https://docs.payu.in/).
 *
 * Required environment variables:
 *   PAYU_MERCHANT_KEY   – merchant key from PayU dashboard
 *   PAYU_MERCHANT_SALT  – salt (v1) from PayU dashboard
 *   PAYU_BASE_URL       – "https://secure.payu.in" (production) or
 *                          "https://test.payu.in" (sandbox)
 */

import crypto from "crypto";
import { logger } from "./utils/logger";

// ── Config ───────────────────────────────────────────────────────────

const PAYU_MERCHANT_KEY = () => process.env.PAYU_MERCHANT_KEY ?? "";
const PAYU_MERCHANT_SALT = () => process.env.PAYU_MERCHANT_SALT ?? "";
const PAYU_BASE_URL = () =>
  process.env.PAYU_BASE_URL ?? "https://test.payu.in";

export function isPayUConfigured(): boolean {
  return !!(process.env.PAYU_MERCHANT_KEY && process.env.PAYU_MERCHANT_SALT);
}

// ── Types ────────────────────────────────────────────────────────────

export interface PayUPaymentRequest {
  txnid: string;       // our unique txn ID  (e.g. "TXN-<uuid>")
  amount: string;       // e.g. "499.00" (INR, not paise)
  productinfo: string;  // e.g. "Challan CH-2026-02-ORG123"
  firstname: string;
  email: string;
  phone?: string;
  surl: string;  // success redirect URL
  furl: string;  // failure redirect URL
  udf1?: string; // challanId
  udf2?: string; // organizationId
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export interface PayUCallbackData {
  mihpayid: string;
  mode: string;       // CC, DC, NB, UPI, WALLET
  status: string;     // success, failure, pending
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone?: string;
  hash: string;
  error?: string;
  error_Message?: string;
  bank_ref_num?: string;
  bankcode?: string;
  cardnum?: string;
  name_on_card?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  additionalCharges?: string;
  [key: string]: unknown;
}

// ── Hash Generation ──────────────────────────────────────────────────

/**
 * Generate the request hash sent to PayU.
 *
 * Formula (per PayU docs):
 *   sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 */
export function generatePayUHash(params: PayUPaymentRequest): string {
  const key = PAYU_MERCHANT_KEY();
  const salt = PAYU_MERCHANT_SALT();

  const hashString = [
    key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    params.udf1 ?? "",
    params.udf2 ?? "",
    params.udf3 ?? "",
    params.udf4 ?? "",
    params.udf5 ?? "",
    "", "", "", "", "",  // reserved empty fields
    salt,
  ].join("|");

  logger.info("PayU hash generation", {
    txnid: params.txnid,
    hashInput: hashString.replace(salt, "SALT_REDACTED"),
  });

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Verify the response hash returned by PayU (reverse formula).
 *
 * If additionalCharges is present:
 *   sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * Otherwise:
 *   sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyPayUHash(data: PayUCallbackData): boolean {
  const key = PAYU_MERCHANT_KEY();
  const salt = PAYU_MERCHANT_SALT();

  const baseHashParts = [
    salt,
    data.status ?? "",
    "", "", "", "", "",  // reserved empty fields (reverse of request)
    data.udf5 ?? "",
    data.udf4 ?? "",
    data.udf3 ?? "",
    data.udf2 ?? "",
    data.udf1 ?? "",
    data.email ?? "",
    data.firstname ?? "",
    data.productinfo ?? "",
    data.amount ?? "",
    data.txnid ?? "",
    key,
  ];

  // If PayU added additional charges, prepend to the hash string
  if (data.additionalCharges) {
    baseHashParts.unshift(data.additionalCharges);
  }

  const hashString = baseHashParts.join("|");

  const calculatedHash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  const isValid = calculatedHash === data.hash;

  logger.info("PayU hash verification", {
    txnid: data.txnid,
    status: data.status,
    isValid,
    hasAdditionalCharges: !!data.additionalCharges,
    hashInput: hashString.replace(salt, "SALT_REDACTED"),
    calculated: calculatedHash.slice(0, 16) + "...",
    received: data.hash?.slice(0, 16) + "...",
  });

  return isValid;
}

// ── Payment Form Data ────────────────────────────────────────────────

/**
 * Build the complete form data object that the client POSTs to PayU.
 * The client renders a hidden form and auto-submits it.
 */
export function buildPayUFormData(params: PayUPaymentRequest): Record<string, string> {
  const hash = generatePayUHash(params);
  return {
    key: PAYU_MERCHANT_KEY(),
    txnid: params.txnid,
    amount: params.amount,
    productinfo: params.productinfo,
    firstname: params.firstname,
    email: params.email,
    phone: params.phone ?? "",
    surl: params.surl,
    furl: params.furl,
    hash,
    udf1: params.udf1 ?? "",
    udf2: params.udf2 ?? "",
    udf3: params.udf3 ?? "",
    udf4: params.udf4 ?? "",
    udf5: params.udf5 ?? "",
  };
}

/**
 * Get the PayU payment page URL for form submission.
 */
export function getPayUPaymentUrl(): string {
  return `${PAYU_BASE_URL()}/_payment`;
}

// ── Amount Helpers ───────────────────────────────────────────────────

/** Convert paise (integer) to PayU amount string (e.g. 49900 → "499.00") */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** Convert rupee string to paise integer (e.g. "499.00" → 49900) */
export function rupeesToPaise(rupees: string): number {
  return Math.round(parseFloat(rupees) * 100);
}

// ── Challan Number Generator ─────────────────────────────────────────

/**
 * Generate a unique challan number.
 * Format: CH-YYYY-MM-<shortOrgId>-<random4>
 */
export function generateChallanNumber(orgId: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const shortOrg = orgId.slice(0, 8).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CH-${year}-${month}-${shortOrg}-${rand}`;
}

/**
 * Generate a unique transaction ID for PayU.
 * Format: TXN-<timestamp>-<random6>
 */
export function generateTxnId(): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(3).toString("hex");
  return `TXN-${ts}-${rand}`;
}
