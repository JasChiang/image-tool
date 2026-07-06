import { clampRect } from "../core/geometry";
import type { Rect } from "../core/geometry";
import type { EditorTool } from "./editorTool";

export const boxTool: EditorTool = {
  id: "box",
  label: "框線強調",
  apply({ source, region, settings }) {
    return createBoxCanvas(source, [region], settings);
  },
  applyBatch({ source, regions, settings }) {
    return createBoxCanvas(source, regions, settings);
  }
};

function createBoxCanvas(
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

  const color = String(settings.coverColor || "#ef4444");
  // cellSize is reused as the line width for this tool.
  const lineWidth = Math.max(1, Number(settings.cellSize) || 6);

  context.save();
  context.lineJoin = "round";
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  for (const region of regions) {
    const rect = clampRect(region, source.width, source.height);
    // Inset by half the stroke so the frame stays fully inside the selection.
    const inset = lineWidth / 2;
    context.strokeRect(
      rect.x + inset,
      rect.y + inset,
      Math.max(0, rect.width - lineWidth),
      Math.max(0, rect.height - lineWidth)
    );
  }
  context.restore();

  return canvas;
}
