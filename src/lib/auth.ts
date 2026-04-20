// نظام صلاحيات بسيط: مدير + كاشير محميين بـ PIN
// المدير: كل شيء. الكاشير: بيع + عملاء فقط، مفيش تقارير/مرتجعات/حذف.

export type Role = 'admin' | 'cashier';
export type AuthMode = 'pin' | 'pattern';

export interface AppUser {
  id: string;
  name: string;
  pin: string; // 4-6 digits OR pattern as comma-joined dot indices "0,1,2,4"
  authMode?: AuthMode; // default 'pin'
  role: Role;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  date: string;
}

const USERS_KEY = 'pos_users';
const SESSION_KEY = 'pos_session_user';
const AUDIT_KEY = 'pos_audit_log';
const ENABLED_KEY = 'pos_auth_enabled';

function get<T>(k: string, fb: T): T {
  try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : fb; } catch { return fb; }
}
function set<T>(k: string, d: T) { localStorage.setItem(k, JSON.stringify(d)); }
function id(): string { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }

export function isAuthEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === '1';
}
export function setAuthEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
  if (!enabled) localStorage.removeItem(SESSION_KEY);
}

export function getUsers(): AppUser[] { return get<AppUser[]>(USERS_KEY, []); }
export function saveUsers(u: AppUser[]) { set(USERS_KEY, u); }

export function addUser(u: Omit<AppUser, 'id' | 'createdAt'>): AppUser {
  const users = getUsers();
  const user: AppUser = { ...u, id: id(), createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  return user;
}
export function updateUser(uid: string, updates: Partial<AppUser>) {
  saveUsers(getUsers().map(u => u.id === uid ? { ...u, ...updates } : u));
}
export function deleteUser(uid: string) {
  saveUsers(getUsers().filter(u => u.id !== uid));
}

export function loginByPin(pin: string): AppUser | null {
  const u = getUsers().find(x => x.pin === pin);
  if (u) {
    set(SESSION_KEY, { userId: u.id, loginAt: new Date().toISOString() });
    logAudit(u, 'login', 'تسجيل دخول');
  }
  return u || null;
}
export function logout() {
  const u = getCurrentUser();
  if (u) logAudit(u, 'logout', 'تسجيل خروج');
  localStorage.removeItem(SESSION_KEY);
}
export function getCurrentUser(): AppUser | null {
  if (!isAuthEnabled()) return null;
  const session = get<{ userId: string } | null>(SESSION_KEY, null);
  if (!session) return null;
  return getUsers().find(u => u.id === session.userId) || null;
}

export function isAdmin(): boolean {
  if (!isAuthEnabled()) return true; // No auth = full access
  const u = getCurrentUser();
  return u?.role === 'admin';
}

export function isCashier(): boolean {
  if (!isAuthEnabled()) return false;
  const u = getCurrentUser();
  return u?.role === 'cashier';
}

// هل اللي مسجل دلوقتي مسموح يشوف سعر الشراء؟ الكاشير لأ.
export function canViewCostPrice(): boolean {
  return isAdmin();
}

export function canDoAdmin(): boolean { return isAdmin(); }

// Audit log
export function logAudit(user: AppUser | null, action: string, details?: string) {
  if (!user) return;
  const log = get<AuditEntry[]>(AUDIT_KEY, []);
  log.push({
    id: id(),
    userId: user.id,
    userName: user.name,
    action,
    details,
    date: new Date().toISOString(),
  });
  // Keep last 500 entries
  if (log.length > 500) log.splice(0, log.length - 500);
  set(AUDIT_KEY, log);
}
export function logAction(action: string, details?: string) {
  const u = getCurrentUser();
  if (u) logAudit(u, action, details);
}
export function getAuditLog(): AuditEntry[] {
  return get<AuditEntry[]>(AUDIT_KEY, []).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
export function clearAuditLog() { set(AUDIT_KEY, []); }
