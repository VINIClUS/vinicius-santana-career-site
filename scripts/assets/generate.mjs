import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { sceneIds } from "./scenes.mjs";
import { createInitialInfraState, transitionInfrastructure } from "../../src/features/explorer/simulation/infrastructure.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const mime = {
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".html": "text/html",
};
const server = createServer(async (req, res) => {
  try {
    const file = resolve(
      root,
      `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`,
    );
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep))
      throw Error("Outside root");
    res.setHeader(
      "Content-Type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error(error));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/scripts/assets/harness.html`,
  );
  await page.waitForFunction(() => window.assetReady);
  await mkdir(resolve(root, "public/assets/scenes"), { recursive: true });
  await mkdir(resolve(root, "public/assets/posters"), { recursive: true });
  let metadata = {};
  try {
    metadata = JSON.parse(
      await readFile(
        resolve(root, "src/content/scenes/generated.json"),
        "utf8",
      ),
    );
  } catch {}
  for (const id of process.argv.slice(2).length
    ? process.argv.slice(2)
    : [...sceneIds, "detail-infrastructure-failed"]) {
    const failure = id === "detail-infrastructure-failed";
    if (!sceneIds.includes(id) && !failure) throw Error(`Unknown scene ${id}`);
    const entry = { posters: {}, cameras: {} };
    for (const [variant, width, height] of [
      ["desktop", 1200, 800],
      ["mobile", 720, 900],
    ]) {
      const result = await page.evaluate(
        async ({ id, width, height, state }) =>
          window.generateAsset(id, width, height, state),
        { id: failure ? "detail-infrastructure" : id, width, height, state: failure ? transitionInfrastructure(createInitialInfraState(), { type: "FAIL_NODE", nodeId: "node-02" }) : undefined },
      );
      const src = `/assets/posters/${id}-${variant}.webp`;
      const buffer = Buffer.from(result.poster.split(",")[1], "base64");
      await writeFile(resolve(root, `public${src}`), buffer);
      entry.posters[variant] = { src, width, height, bytes: buffer.length };
      entry.cameras[variant] = result.camera;
      if (variant === "desktop") {
        entry.camera = result.camera;
        if (result.districtPositions) {
          entry.layouts = result.layouts;
          entry.districtPositions = result.districtPositions;
          entry.districtScale = result.districtScale;
        }
        if (id !== "overview" && !failure) {
          const src = `/assets/scenes/${id}.glb`;
          const buffer = Buffer.from(result.glb, "base64");
          await writeFile(resolve(root, `public${src}`), buffer);
          entry.model = {
            src,
            bytes: buffer.length,
            bounds: result.bounds,
            anchors: result.anchors,
          };
        }
      }
    }
    metadata[id] = entry;
    console.log(`Generated ${id}`);
  }
  await writeFile(
    resolve(root, "src/content/scenes/generated.json"),
    JSON.stringify(metadata, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
