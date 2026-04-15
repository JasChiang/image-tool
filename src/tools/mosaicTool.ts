import { clampRect } from "../core/geometry";
import type { Rect } from "../core/geometry";
import type { EditorTool } from "./editorTool";

export const mosaicTool: EditorTool = {
  id: "mosaic",
  label: "馬賽克",
  apply({ source, region, settings }) {
    return createMosaicCanvas(source, [region], settings);
  },
  applyBatch({ source, regions, settings }) {
    return createMosaicCanvas(source, regions, settings);
  }
};

function createMosaicCanvas(
  source: ImageBitmap,
  regions: Rect[],
  settings: Record<string, number | string | boolean>
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.drawImage(source, 0, 0);
  const cellSize = Number(settings.cellSize) || 18;

  for (const region of regions) {
    applyMosaicRegion(context, source, region, cellSize);
  }

  return canvas;
}

function applyMosaicRegion(
  context: CanvasRenderingContext2D,
  source: ImageBitmap,
  region: Rect,
  cellSize: number
): void {
  const rect = clampRect(region, source.width, source.height);

  for (let y = rect.y; y < rect.y + rect.height; y += cellSize) {
    for (let x = rect.x; x < rect.x + rect.width; x += cellSize) {
      const width = Math.min(cellSize, rect.x + rect.width - x);
      const height = Math.min(cellSize, rect.y + rect.height - y);
      const color = sampleAverageColor(context, x, y, width, height);

      context.fillStyle = color;
      context.fillRect(x, y, width, height);
    }
  }
}

function sampleAverageColor(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const imageData = context.getImageData(x, y, width, height).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  const pixels = imageData.length / 4;

  for (let index = 0; index < imageData.length; index += 4) {
    red += imageData[index];
    green += imageData[index + 1];
    blue += imageData[index + 2];
    alpha += imageData[index + 3];
  }

  return `rgba(${Math.round(red / pixels)}, ${Math.round(green / pixels)}, ${Math.round(
    blue / pixels
  )}, ${alpha / pixels / 255})`;
}
