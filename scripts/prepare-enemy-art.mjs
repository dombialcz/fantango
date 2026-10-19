// One-time delivery packaging: preserve transparency and fit each generated bust to a small WebP.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const jobs = JSON.parse(await readFile(process.argv[2] ?? "output/enemy-art-jobs.json", "utf8"));
const browser = await chromium.launch({ headless: true });
await mkdir("assets/enemies", { recursive: true });
try {
  const page = await browser.newPage();
  for (const job of jobs) {
    const source = await readFile(job.source);
    const data = await page.evaluate(async (url) => {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (minX > maxX || minY > maxY) throw Error("Empty enemy portrait");
      const padding = 10;
      minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
      maxX = Math.min(canvas.width - 1, maxX + padding); maxY = Math.min(canvas.height - 1, maxY + padding);
      const width = maxX - minX + 1, height = maxY - minY + 1;
      const output = document.createElement("canvas"); output.width = 256; output.height = 256;
      const scale = 240 / Math.max(width, height), w = width * scale, h = height * scale;
      output.getContext("2d").drawImage(canvas, minX, minY, width, height, (256 - w) / 2, 248 - h, w, h);
      return output.toDataURL("image/webp", .88).split(",")[1];
    }, `data:image/png;base64,${source.toString("base64")}`);
    await writeFile(`assets/enemies/${job.id}.webp`, Buffer.from(data, "base64"));
    console.log(`${job.id}: ${Math.round(Buffer.from(data, "base64").length / 1024)} KB`);
  }
} finally { await browser.close(); }
