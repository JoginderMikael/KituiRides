const TOKEN_KEY = "kituirides_token";
const USER_KEY = "kituirides_user";

export function saveSession(authResponse) {
  const token = authResponse?.token;
  const decoded = decodeJwt(token);
  const role = normalizeRole(
    decoded?.role ||
    authResponse?.role ||
    decoded?.roles?.[0] ||
    authResponse?.roles?.[0]
  );
  const session = {
    token,
    userId: authResponse?.userId || decoded?.userId,
    email: authResponse?.email || decoded?.sub,
    role
  };
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(session));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const role = normalizeRole(parsed?.role || parsed?.roles?.[0]);
    return { ...parsed, role };
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function roleHomePath(role) {
  if (role === "CUSTOMER") return "/customer";
  if (role === "DRIVER") return "/driver";
  if (role === "RIDER") return "/driver";
  if (role === "ADMIN") return "/admin";
  if (role === "SUPPORT_AGENT") return "/support";
  return "/login";
}

function decodeJwt(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeRole(role) {
  if (role === "RIDER") return "DRIVER";
  return role || null;
}
