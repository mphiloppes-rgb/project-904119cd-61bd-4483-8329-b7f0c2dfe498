// نسخ احتياطي شامل تلقائي على القرص (D:) كل دقيقة عبر Electron.
// لو مفيش Electron (متصفح فقط) → بيخزن ملف JSON آخر نسخة في IndexedDB كحل بديل.
import { exportBackup } from "./backup";

const FOLDER_KEY = "pos_disk_backup_folder";
const ENABLED_KEY = "pos_disk_backup_enabled";
const LAST_KEY = "pos_disk_backup_last";
const INTERVAL_KEY = "pos_disk_backup_interval_ms";

export function getBackupFolder(): string {
  try { return localStorage.getItem(FOLDER_KEY) || ""; } catch { return ""; }
}
export function setBackupFolder(p: string) {
  try { localStorage.setItem(FOLDER_KEY, p); } catch {}
}
export function isDiskBackupEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) !== "0"; } catch { return true; }
}
export function setDiskBackupEnabled(v: boolean) {
  try { localStorage.setItem(ENABLED_KEY, v ? "1" : "0"); } catch {}
}
export function getDiskBackupIntervalMs(): number {
  try {
    const n = parseInt(localStorage.getItem(INTERVAL_KEY) || "60000");
    return isNaN(n) ? 60000 : Math.max(15000, n);
  } catch { return 60000; }
}
export function setDiskBackupIntervalMs(ms: number) {
  try { localStorage.setItem(INTERVAL_KEY, String(Math.max(15000, ms))); } catch {}
  if (autoTimer != null) {
    clearInterval(autoTimer);
    autoTimer = window.setInterval(runDiskBackup, getDiskBackupIntervalMs());
  }
}
export function getLastBackupInfo(): { time: string; method: string; path?: string } | null {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || "null"); } catch { return null; }
}
function setLastBackupInfo(info: { time: string; method: string; path?: string }) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify(info)); } catch {}
}

export async function chooseDiskBackupFolder(): Promise<string | null> {
  const w = window as any;
  if (!w?.posElectron?.chooseBackupFolder) return null;
  const p = await w.posElectron.chooseBackupFolder();
  if (p) setBackupFolder(p);
  return p || null;
}

export async function runDiskBackup(force = false): Promise<{ ok: boolean; method: "electron" | "browser" | "skip"; path?: string; error?: string }> {
  if (!force && !isDiskBackupEnabled()) return { ok: false, method: "skip" };
  const json = exportBackup();
  const w = window as any;
  if (w?.posElectron?.saveFullBackup) {
    const folder = getBackupFolder();
    const res = await w.posElectron.saveFullBackup(json, folder || null);
    if (res?.ok) {
      if (res.folder && res.folder !== folder) setBackupFolder(res.folder);
      const info = { time: new Date().toISOString(), method: "electron", path: res.latest };
      setLastBackupInfo(info);
      return { ok: true, method: "electron", path: res.latest };
    }
    return { ok: false, method: "electron", error: res?.error };
  }
  // Fallback (متصفح): خزّن في localStorage كآخر نسخة (مفيش وصول للقرص)
  try {
    localStorage.setItem("pos_last_full_backup_json", json);
    const info = { time: new Date().toISOString(), method: "browser" };
    setLastBackupInfo(info);
    return { ok: true, method: "browser" };
  } catch (e: any) {
    return { ok: false, method: "browser", error: e?.message };
  }
}

let autoTimer: number | null = null;
let started = false;
export function startDiskBackup() {
  if (started) return;
  started = true;
  // أول تشغيل فوري
  runDiskBackup().catch(() => {});
  autoTimer = window.setInterval(() => { runDiskBackup().catch(() => {}); }, getDiskBackupIntervalMs());
  window.addEventListener("beforeunload", () => { runDiskBackup(true).catch(() => {}); });
}
export function stopDiskBackup() {
  if (autoTimer != null) clearInterval(autoTimer);
  autoTimer = null;
  started = false;
}
