// Resize approved generated portraits for the web, preserving their alpha.
// Usage: node scripts/prepare-mastermind-art.mjs [manifest.json]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const manifest = JSON.parse(await readFile(process.argv[2] ?? "assets/mastermind/ART_PROMPTS.json", "utf8"));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const hero of manifest.heroes) {
    const bytes = await readFile(hero.source);
    const result = await page.evaluate(async url => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      const scale = 256 / Math.max(image.width, image.height);
      const width = image.width * scale, height = image.height * scale;
      context.drawImage(image, (256 - width) / 2, (256 - height) / 2, width, height);
      const pixels = context.getImageData(0, 0, 256, 256).data;
      if (!pixels.some((value, index) => index % 4 === 3 && value === 0)) throw Error("Missing transparent background");
      return canvas.toDataURL("image/webp", 0.9).split(",")[1];
    }, `data:image/png;base64,${bytes.toString("base64")}`);
    await mkdir("assets/mastermind", { recursive: true });
    await writeFile(hero.file, Buffer.from(result, "base64"));
    console.log(hero.file);
  }
} finally {
  await browser.close();
}
