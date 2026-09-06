// One place that turns a server error code into something a customer can act on.
//
// Screens used to fall back to `error.message`, which is whatever the API happened to
// send — fine for a validation message, useless for "Internal server error", and
// actively wrong for a gateway timeout the API never even saw. Anything not listed
// here still falls back to the server's message, so a new, well-worded server error
// reaches the customer without a client release.

// Wording is deliberately about what the customer should do next, not about what broke.
const MESSAGES = {
  // ── Transport (set by api/client.js, never by the server) ──
  NETWORK_ERROR: "Can't reach the server. Check your internet connection and try again.",
  TIMEOUT: "The server is taking too long to respond. Please check your connection and try again.",
  SERVER_ERROR: "Something went wrong on our end. Please try again in a moment.",

  // ── OTP / login ──
  RATE_LIMITED: "Too many attempts. Please wait a few minutes before trying again.",
  OTP_EXPIRED: "That code has expired. Tap “Resend code” to get a new one.",
  OTP_LOCKED: "Too many incorrect attempts. Request a new code to continue.",
  INVALID_OTP: "That code isn't right. Please check it and try again.",
  SMS_PROVIDER_UNAVAILABLE:
    "We couldn't send the code right now — the SMS service isn't responding. Please try again in a minute.",
  SMS_PROVIDER_ERROR:
    "We couldn't send the code right now. Please try again in a minute, or contact support if it keeps happening.",
  SMS_QUOTA_EXHAUSTED:
    "We couldn't send the code right now. Please try again shortly, or contact support if it keeps happening.",
  OTP_STORE_UNAVAILABLE:
    "Login is temporarily unavailable on our side. Please try again in a few minutes.",
  ACCOUNT_SUSPENDED: "This account has been suspended. Please contact support.",

  // ── Session ──
  UNAUTHORIZED: "Your session has ended. Please sign in again.",
  TOKEN_EXPIRED: "Your session has ended. Please sign in again.",
  INVALID_TOKEN: "Your session has ended. Please sign in again.",
};

// Server messages that are technically accurate and completely unhelpful — never show
// these, even when no code matched.
const OPAQUE = [/^internal server error$/i, /^request failed with status/i, /^network error$/i];

export function describeError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  const mapped = MESSAGES[error.code];
  if (mapped) return mapped;

  // Zod's per-field messages ("Enter the 6-digit code") are the useful part of a
  // validation failure; the envelope's own message is a flat "Invalid input".
  const fieldErrors = error.details?.fieldErrors;
  if (fieldErrors) {
    const first = Object.values(fieldErrors).flat().find(Boolean);
    if (first) return first;
  }

  const message = typeof error.message === "string" ? error.message.trim() : "";
  if (!message || OPAQUE.some((pattern) => pattern.test(message))) return fallback;

  return message;
}
