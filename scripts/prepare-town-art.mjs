// One-time sprite packaging. The game itself only loads the finished WebP atlas.
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const [source, destination = "assets/town/buildings-atlas.webp"] = process.argv.slice(2);
if (!source) throw new Error("Usage: node scripts/prepare-town-art.mjs source.png [destination.webp]");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.resolve(source)).href);
  const result = await page.evaluate(() => {
    const image = document.querySelector("img");
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    sourceContext.drawImage(image, 0, 0);
    const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const { width, height, data } = pixels;
    const labels = new Int16Array(width * height);
    const queue = new Int32Array(labels.length);
    const components = [];
    let componentId = 0;
    const neighbors = (index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      return [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1, y + 1 < height ? index + width : -1];
    };

    // Opaque cores separate buildings even where their soft alpha edges touch.
    for (let index = 0; index < labels.length; index += 1) {
      if (labels[index] || data[index * 4 + 3] < 240) continue;
      componentId += 1;
      let head = 0;
      let tail = 1;
      let xSum = 0;
      let ySum = 0;
      queue[0] = index;
      labels[index] = componentId;
      while (head < tail) {
        const current = queue[head++];
        xSum += current % width;
        ySum += Math.floor(current / width);
        for (const next of neighbors(current)) {
          if (next < 0 || labels[next] || data[next * 4 + 3] < 240) continue;
          labels[next] = componentId;
          queue[tail++] = next;
        }
      }
      if (tail > 30000) components.push({ id: componentId, x: xSum / tail, y: ySum / tail });
    }
    if (components.length !== 9) throw new Error(`Expected nine building sprites; found ${components.length}.`);
    components.sort((a, b) => Math.floor(a.y / (height / 3)) - Math.floor(b.y / (height / 3)) || a.x - b.x);
    const coreToSprite = new Map(components.map((component, index) => [component.id, index + 1]));

    let head = 0;
    let tail = 0;
    for (let index = 0; index < labels.length; index += 1) {
      labels[index] = coreToSprite.get(labels[index]) ?? 0;
      if (labels[index]) queue[tail++] = index;
    }
    // Grow each core into its original soft edges; keep the generated colors and alpha.
    while (head < tail) {
      const current = queue[head++];
      for (const next of neighbors(current)) {
        if (next < 0 || labels[next] || data[next * 4 + 3] === 0) continue;
        labels[next] = labels[current];
        queue[tail++] = next;
      }
    }

    const tile = 512;
    const atlas = document.createElement("canvas");
    atlas.width = tile * 3;
    atlas.height = tile * 3;
    const atlasContext = atlas.getContext("2d");
    const bounds = [];
    for (let sprite = 1; sprite <= 9; sprite += 1) {
      const isolated = new ImageData(width, height);
      let minX = width, minY = height, maxX = 0, maxY = 0;
      for (let index = 0; index < labels.length; index += 1) {
        if (labels[index] !== sprite) continue;
        isolated.data.set(data.subarray(index * 4, index * 4 + 4), index * 4);
        const x = index % width, y = Math.floor(index / width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = width; spriteCanvas.height = height;
      spriteCanvas.getContext("2d").putImageData(isolated, 0, 0);
      const spriteWidth = maxX - minX + 1, spriteHeight = maxY - minY + 1;
      const scale = (tile - 72) / Math.max(spriteWidth, spriteHeight);
      const outputWidth = spriteWidth * scale, outputHeight = spriteHeight * scale;
      atlasContext.drawImage(spriteCanvas, minX, minY, spriteWidth, spriteHeight,
        ((sprite - 1) % 3) * tile + (tile - outputWidth) / 2,
        Math.floor((sprite - 1) / 3) * tile + tile - 36 - outputHeight,
        outputWidth, outputHeight);
      bounds.push({ minX, minY, maxX, maxY });
    }
    return { url: atlas.toDataURL("image/webp", 0.9), bounds };
  });
  await mkdir(path.dirname(destination), { recursive: true });
  const master = path.join(path.dirname(destination), "buildings-master.png");
  if (path.resolve(source) !== path.resolve(master)) await copyFile(source, master);
  await writeFile(destination, Buffer.from(result.url.split(",")[1], "base64"));
  console.log(JSON.stringify({ destination, sprites: result.bounds.length, tile: 512 }, null, 2));
} finally {
  await browser.close();
}
