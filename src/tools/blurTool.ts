import { clampRect } from "../core/geometry";
import type { Rect } from "../core/geometry";
import type { EditorTool } from "./editorTool";

export const blurTool: EditorTool = {
  id: "blur",
  label: "模糊",
  apply({ source, region, settings }) {
    return createBlurCanvas(source, [region], settings);
  },
  applyBatch({ source, regions, settings }) {
    return createBlurCanvas(source, regions, settings);
  }
};

function createBlurCanvas(
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
  const radius = Number(settings.cellSize) || 12;

  for (const region of regions) {
    applyBlurRegion(context, source, region, radius);
  }

  return canvas;
}

function applyBlurRegion(
  context: CanvasRenderingContext2D,
  source: ImageBitmap,
  region: Rect,
  radius: number
): void {
  const rect = clampRect(region, source.width, source.height);
  if (rect.width < 1 || rect.height < 1) {
    return;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = rect.width;
  tempCanvas.height = rect.height;
  const tempContext = tempCanvas.getContext("2d");

  if (!tempContext) {
    throw new Error("Canvas is not supported.");
  }

  tempContext.drawImage(
    source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height
  );

  context.save();
  context.beginPath();
  context.rect(rect.x, rect.y, rect.width, rect.height);
  context.clip();
  context.filter = `blur(${Math.max(2, Math.round(radius))}px)`;
  context.drawImage(tempCanvas, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}
