import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const testDir = "/tmp/image-tool-download-test";
const inputPath = path.join(testDir, "input.png");
const outputPath = path.join(testDir, "output.png");
const slicesPath = path.join(testDir, "slices.zip");

await fs.mkdir(testDir, { recursive: true });
await fs.writeFile(inputPath, createPng(160, 120));

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true
});

try {
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1280, height: 820 } });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

  await page.setInputFiles("#fileInput", inputPath);
  await page.waitForFunction(() => {
    const emptyState = document.querySelector("#emptyState");
    return emptyState instanceof HTMLElement && emptyState.hidden;
  });

  const defaultExportName = await page.locator("#exportName").inputValue();
  if (defaultExportName !== "input.png") {
    throw new Error(`Expected export name to default to input.png, received ${defaultExportName}.`);
  }

  await page.locator("#cellSize").fill("40");

  const viewport = await page.locator("#imageCanvas").evaluate((canvas) => {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / 160, bounds.height / 120);
    const offsetX = (bounds.width - 160 * scale) / 2;
    const offsetY = (bounds.height - 120 * scale) / 2;

    return {
      left: bounds.left,
      top: bounds.top,
      offsetX,
      offsetY,
      scale
    };
  });

  const firstSampleBefore = await sampleCanvasPixel(page, viewport, { x: 45, y: 45 });
  const secondSampleBefore = await sampleCanvasPixel(page, viewport, { x: 115, y: 75 });

  await dragImageRect(page, viewport, { x: 20, y: 20 }, { x: 70, y: 70 });
  await dragImageRect(page, viewport, { x: 95, y: 45 }, { x: 145, y: 105 });

  const selectionCount = await page.locator("#selectionCount").textContent();
  if (selectionCount !== "2") {
    throw new Error(`Expected two selections before applying, received ${selectionCount}.`);
  }

  await page.click("#applyButton");
  await page.waitForFunction(() => document.querySelector("#selectionCount")?.textContent === "0");

  const firstSampleAfter = await sampleCanvasPixel(page, viewport, { x: 45, y: 45 });
  const secondSampleAfter = await sampleCanvasPixel(page, viewport, { x: 115, y: 75 });

  assertPixelChanged(firstSampleBefore, firstSampleAfter, "first region");
  assertPixelChanged(secondSampleBefore, secondSampleAfter, "second region");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#downloadButton")
  ]);

  await download.saveAs(outputPath);

  await page.click("#sliceTab");
  await page.click("#addVerticalLineButton");
  await clickImagePoint(page, viewport, { x: 80, y: 60 });
  await page.click("#addHorizontalLineButton");
  await clickImagePoint(page, viewport, { x: 80, y: 60 });

  const sliceCount = await page.locator("#sliceCount").textContent();
  if (sliceCount !== "4") {
    throw new Error(`Expected four slices, received ${sliceCount}.`);
  }

  const [slicesDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#downloadSlicesButton")
  ]);

  const suggestedSlicesName = slicesDownload.suggestedFilename();
  if (suggestedSlicesName !== "input-slices.zip") {
    throw new Error(`Expected slices filename input-slices.zip, received ${suggestedSlicesName}.`);
  }

  await slicesDownload.saveAs(slicesPath);
} finally {
  await browser.close();
}

const output = await fs.readFile(outputPath);
const pngSignature = "89504e470d0a1a0a";
const signature = output.subarray(0, 8).toString("hex");

if (signature !== pngSignature) {
  throw new Error(`Downloaded file is not a PNG. Signature: ${signature}`);
}

if (output.byteLength < 500) {
  throw new Error(`Downloaded PNG is unexpectedly small: ${output.byteLength} bytes.`);
}

const slices = await fs.readFile(slicesPath);
const zipSignature = slices.subarray(0, 4).toString("hex");
if (zipSignature !== "504b0304") {
  throw new Error(`Downloaded slices file is not a ZIP. Signature: ${zipSignature}`);
}

const zipText = slices.toString("latin1");
["slice-r1-c1.png", "slice-r1-c2.png", "slice-r2-c1.png", "slice-r2-c2.png"].forEach((name) => {
  if (!zipText.includes(name)) {
    throw new Error(`Downloaded ZIP is missing ${name}.`);
  }
});

console.log(`Download OK: ${outputPath} (${output.byteLength} bytes)`);
console.log(`Slices ZIP OK: ${slicesPath} (${slices.byteLength} bytes)`);

function createPng(width, height) {
  const rawRows = [];

  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;

    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4;
      const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2;
      row[offset] = checker ? 245 : 20;
      row[offset + 1] = checker ? 30 : 220;
      row[offset + 2] = x > width / 2 ? 245 : 45;
      row[offset + 3] = 255;
    }

    rawRows.push(row);
  }

  const header = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = pngChunk("IHDR", Buffer.concat([
    uint32(width),
    uint32(height),
    Buffer.from([8, 6, 0, 0, 0])
  ]));
  const idat = pngChunk("IDAT", zlib.deflateSync(Buffer.concat(rawRows)));
  const iend = pngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  return Buffer.concat([
    uint32(data.byteLength),
    typeBuffer,
    data,
    uint32(crc32(Buffer.concat([typeBuffer, data])))
  ]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

async function dragImageRect(page, viewport, start, end) {
  await page.mouse.move(imageToClientX(viewport, start.x), imageToClientY(viewport, start.y));
  await page.mouse.down();
  await page.mouse.move(imageToClientX(viewport, end.x), imageToClientY(viewport, end.y), {
    steps: 8
  });
  await page.mouse.up();
}

async function clickImagePoint(page, viewport, point) {
  await page.mouse.click(imageToClientX(viewport, point.x), imageToClientY(viewport, point.y));
}

async function sampleCanvasPixel(page, viewport, point) {
  return page.locator("#imageCanvas").evaluate(
    (canvas, args) => {
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context is unavailable.");
      }

      const density = window.devicePixelRatio || 1;
      const x = Math.round((args.viewport.offsetX + args.point.x * args.viewport.scale) * density);
      const y = Math.round((args.viewport.offsetY + args.point.y * args.viewport.scale) * density);
      return [...context.getImageData(x, y, 1, 1).data];
    },
    { viewport, point }
  );
}

function assertPixelChanged(before, after, label) {
  const distance = Math.abs(before[0] - after[0]) + Math.abs(before[1] - after[1]) + Math.abs(before[2] - after[2]);

  if (distance < 20) {
    throw new Error(`${label} did not change enough after applying mosaic. Before=${before.join(",")} After=${after.join(",")}`);
  }
}

function imageToClientX(viewport, x) {
  return viewport.left + viewport.offsetX + x * viewport.scale;
}

function imageToClientY(viewport, y) {
  return viewport.top + viewport.offsetY + y * viewport.scale;
}
