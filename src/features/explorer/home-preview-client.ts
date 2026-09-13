import type { mountHomePreview } from "./scene/preview.ts";

// Keep compatibility independent of graphics, including a restored history entry.
const legacyProjects: Record<string, string> = {
  "#case-cnesdata": "cnesdata",
  "#case-aquafarm": "limnopulse",
  "#case-esus-pec-bootstrap": "infrastructure",
  "#case-infra-ansible": "infrastructure",
  "#case-packer-proxmox-templates": "infrastructure",
};
const redirectLegacyFragment = () => {
  const project = legacyProjects[location.hash];
  if (project) location.replace(`/explore/${project}/`);
};
window.addEventListener("hashchange", redirectLegacyFragment);
window.addEventListener("pageshow", redirectLegacyFragment);
redirectLegacyFragment();

const root = document.querySelector<HTMLElement>("[data-home-preview]");
if (root) {
  const host = root.querySelector<HTMLElement>("[data-preview-host]")!;
  type Preview = ReturnType<typeof mountHomePreview>;
  let scene: Preview | undefined;
  let loaded = document.readyState === "complete";
  let intersecting = false;
  let attempted = false;
  let stopped = false;
  let idle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let expiresAt = Infinity;
  let observer: IntersectionObserver | undefined;
  const lifetime = new AbortController();
  const connection = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const visible = () => {
    if (document.visibilityState !== "visible" || !intersecting) return false;
    const box = host.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth;
  };
  const eligible = () => !stopped && loaded && visible() && !connection()?.saveData;
  const cancelSchedule = () => {
    if (idle !== undefined) window.cancelIdleCallback(idle);
    idle = undefined;
    clearTimeout(timer);
    timer = undefined;
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelSchedule();
    clearTimeout(deadline);
    observer?.disconnect();
    lifetime.abort();
    scene?.dispose();
    scene = undefined;
    root.dataset.previewState = "fallback";
  };
  const supportsWebGL = () => {
    try {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) return false;
      const valid = !probe.isContextLost();
      probe.getExtension("WEBGL_lose_context")?.loseContext();
      return valid;
    } catch { return false; }
  };
  const activate = () => {
    idle = undefined;
    timer = undefined;
    if (attempted || !eligible()) return;
    attempted = true;
    // One deadline owns import, model fetch/parse, initialization and the real draw.
    expiresAt = performance.now() + 15_000;
    deadline = setTimeout(stop, 15_000);
    if (!supportsWebGL()) { stop(); return; }
    root.dataset.previewState = "loading";
    void import("./scene/preview.ts").then(({ mountHomePreview }) => {
      if (stopped) return;
      if (performance.now() >= expiresAt) { stop(); return; }
      const mounted = mountHomePreview({
        host, active: eligible(),
        onReady() {
          if (stopped) return;
          // Parsing or shader compilation may have delayed delivery of the timer.
          if (performance.now() >= expiresAt) { stop(); return; }
          clearTimeout(deadline);
          root.dataset.previewState = "ready";
        },
        onFailure: stop,
      });
      // Also guard a synchronous failure during mounting.
      if (stopped) mounted.dispose();
      else scene = mounted;
    }).catch(stop);
  };
  const update = () => {
    const active = eligible();
    scene?.setActive(active);
    if (!active) { cancelSchedule(); return; }
    if (attempted || idle !== undefined || timer !== undefined) return;
    if (typeof window.requestIdleCallback === "function" && typeof window.cancelIdleCallback === "function") {
      idle = window.requestIdleCallback(activate);
    } else {
      timer = setTimeout(activate, 200);
    }
  };
  window.addEventListener("pagehide", stop, { once: true, signal: lifetime.signal });
  // Without an observable viewport or visibility state, the HTML poster is final.
  if (typeof IntersectionObserver !== "function" || typeof document.visibilityState !== "string" || connection()?.saveData) {
    stop();
  } else {
    try {
      observer = new IntersectionObserver(entries => {
        intersecting = entries.some(entry => entry.target === host && entry.isIntersecting && entry.intersectionRatio > 0);
        update();
      });
      observer.observe(host);
      document.addEventListener("visibilitychange", update, { signal: lifetime.signal });
      window.addEventListener("load", () => { loaded = true; update(); }, { once: true, signal: lifetime.signal });
    } catch { stop(); }
  }
}
