import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
if ("serviceWorker" in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").then(async () => {
    if (!("caches" in window)) return;
    const cache = await caches.open("raei-offline-v1");
    const urls = [window.location.href, ...performance.getEntriesByType("resource").map((e) => (e as PerformanceResourceTiming).name)]
      .filter((url) => url.startsWith(window.location.origin));
    await Promise.allSettled(urls.map((url) => cache.add(url)));
  }).catch(() => {}));
} else {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
}

createRoot(document.getElementById("root")!).render(<App />);
