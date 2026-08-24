import axios from "axios";
import { API_BASE } from "./config";

// Access token lives in memory only — the refresh token is an HttpOnly cookie the
// client can't (and shouldn't) read. See "Implementation Gotchas #1" in
// CUSTOMER_PORTAL_API.md.
let _accessToken = null;

export function setAccessToken(token) {
  _accessToken = token;
}
export function getAccessToken() {
  return _accessToken;
}

// When a refresh definitively fails there is no session left to salvage. The auth
// context subscribes here so it can clear the persisted profile and route back to
// login, rather than leaving the app in a signed-in-looking state that 401s on
// every request.
const _sessionExpiredHandlers = new Set();

export function onSessionExpired(handler) {
  _sessionExpiredHandlers.add(handler);
  return () => _sessionExpiredHandlers.delete(handler);
}

function notifySessionExpired() {
  _sessionExpiredHandlers.forEach((handler) => handler());
}

// `withCredentials` is what carries the refreshToken cookie the server sets on OTP
// verify. React Native's networking layer persists cookies natively (NSHTTPCookieStorage
// / OkHttp's cookie jar), so the cookie survives an app restart the same way it would
// in a browser — which is what makes `refreshSession()` below work on cold start.
const client = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A bare axios instance for the refresh call itself: routing it through `client`
// would re-enter the response interceptor below and, on a failing refresh, recurse.
const refreshClient = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
  timeout: 20000,
});

// Exported so the auth context can re-establish a session at app launch — the access
// token is memory-only, so a cold start always begins with no token even though the
// cookie (and the cached profile) say the customer is signed in.
export async function refreshSession() {
  const { data } = await refreshClient.post("/auth/refresh");
  const token = data?.data?.accessToken;
  if (!token) throw new Error("No access token in refresh response");
  setAccessToken(token);
  return token;
}

// ── Response interceptor — envelope unwrap + auto-refresh ───────────────────
// Every backend response is wrapped as { status, message, data } (see
// server/utils/ApiResponse.js). On success, hand callers `data` directly — plain
// objects, no envelope, so every screen consumes this the same way regardless of
// which endpoint it's calling.
let _refreshing = null;
let _queue = [];

// UNAUTHORIZED belongs here alongside the expiry codes: a cold start has a valid
// cookie but no access token yet, so the first authenticated call comes back as
// "no token provided", not "token expired". Without it that request would fail
// outright instead of refreshing.
const REFRESHABLE_CODES = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "UNAUTHORIZED"]);

client.interceptors.response.use(
  // `data` is null for delete/void operations, and a few endpoints legitimately
  // return no envelope body at all — `?? null` keeps those from throwing here.
  (res) => res.data?.data ?? null,
  async (err) => {
    const original = err.config;
    const code = err.response?.data?.code;

    if (
      err.response?.status === 401 &&
      REFRESHABLE_CODES.has(code) &&
      original &&
      !original._retried &&
      // The refresh endpoint failing must never trigger another refresh.
      !original.url?.includes("/auth/refresh")
    ) {
      original._retried = true;

      // One refresh in flight at a time; everything else queues behind it and
      // replays with the new token rather than stampeding the endpoint.
      if (!_refreshing) {
        _refreshing = refreshSession()
          .then((token) => {
            _queue.forEach(({ resolve }) => resolve(token));
            _queue = [];
            return token;
          })
          .catch((refreshErr) => {
            setAccessToken(null);
            _queue.forEach(({ reject }) => reject(refreshErr));
            _queue = [];
            notifySessionExpired();
            throw refreshErr;
          })
          .finally(() => {
            _refreshing = null;
          });
      }

      try {
        const token = await new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
          _refreshing.catch(() => {});
        });
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch (refreshErr) {
        return Promise.reject(normalise(refreshErr));
      }
    }

    return Promise.reject(normalise(err));
  },
);

// One error shape for every caller: `message` is safe to show, `code` is what
// screens branch on (CART_RESTAURANT_CONFLICT, CART_PRICE_CHANGED, …).
function normalise(err) {
  if (err instanceof Error && err.code && !err.isAxiosError) return err;

  const isNetwork = !err.response;
  const message = isNetwork
    ? "Can't reach the server. Check your connection and try again."
    : (err.response?.data?.message ?? err.message ?? "Something went wrong.");

  const apiError = new Error(message);
  apiError.code = err.response?.data?.code ?? (isNetwork ? "NETWORK_ERROR" : undefined);
  apiError.status = err.response?.status;
  apiError.details = err.response?.data?.details;
  return apiError;
}

export default client;
