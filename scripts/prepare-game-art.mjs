// Package generated artwork for delivery; no game runtime dependency is added.
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const manifestPath = process.argv[2] ?? "output/generated-art.json";
const jobs = JSON.parse(await readFile(manifestPath, "utf8"));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const atlasPath = "assets/town/buildings-atlas.webp";
  const order = ["knight", "thief", "bard", "cleric", "barbarian", "ranger", "mage", "alchemist", "tavern"];
  const finalLevels = order.map((type, index) => ({ id: `${type}-5`, kind: "building", type, level: 5, source: atlasPath, tile: index }));
  for (const job of [...finalLevels, ...jobs]) {
    if (!job.source) continue;
    const destination = job.kind === "command" ? `assets/commands/${job.id}.webp` : `assets/town/levels/${job.id}.webp`;
    try { await access(destination); continue; } catch {}
    const data = await readFile(job.source);
    const mime = path.extname(job.source) === ".webp" ? "image/webp" : "image/png";
    const result = await page.evaluate(async ({ url, job }) => {
      const image = new Image(); image.src = url; await image.decode();
      const source = document.createElement("canvas");
      source.width = job.tile === undefined ? image.naturalWidth : 512;
      source.height = job.tile === undefined ? image.naturalHeight : 512;
      const context = source.getContext("2d");
      if (job.tile === undefined) context.drawImage(image, 0, 0);
      else context.drawImage(image, (job.tile % 3) * 512, Math.floor(job.tile / 3) * 512, 512, 512, 0, 0, 512, 512);
      const output = document.createElement("canvas");
      const size = job.kind === "command" ? 256 : 512;
      output.width = size; output.height = size;
      const outputContext = output.getContext("2d");
      if (job.kind === "command") {
        const edge = Math.min(source.width, source.height);
        outputContext.drawImage(source, (source.width - edge) / 2, (source.height - edge) / 2, edge, edge, 0, 0, size, size);
      } else {
        const pixels = context.getImageData(0, 0, source.width, source.height).data;
        let minX = source.width, minY = source.height, maxX = 0, maxY = 0;
        for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
          if (pixels[(y * source.width + x) * 4 + 3] < 24) continue;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        const width = maxX - minX + 1, height = maxY - minY + 1;
        const developmentScale = [0.76, 0.83, 0.9, 0.96, 1][job.level - 1];
        const scale = 448 * developmentScale / Math.max(width, height);
        const w = width * scale, h = height * scale;
        outputContext.drawImage(source, minX, minY, width, height, (size - w) / 2, size - 28 - h, w, h);
      }
      return output.toDataURL("image/webp", 0.88).split(",")[1];
    }, { url: `data:${mime};base64,${data.toString("base64")}`, job });
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(result, "base64"));
    console.log(destination);
  }
} finally { await browser.close(); }
