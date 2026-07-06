import { clampRect } from "../core/geometry";
import type { Rect } from "../core/geometry";
import type { EditorTool } from "./editorTool";

export const highlightTool: EditorTool = {
  id: "highlight",
  label: "半透明高亮",
  apply({ source, region, settings }) {
    return createHighlightCanvas(source, [region], settings);
  },
  applyBatch({ source, regions, settings }) {
    return createHighlightCanvas(source, regions, settings);
  }
};

function createHighlightCanvas(
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

  const color = String(settings.coverColor || "#facc15");
  // cellSize is reused as the fill opacity percentage for this tool.
  const opacity = Math.min(1, Math.max(0.05, (Number(settings.cellSize) || 35) / 100));

  context.save();
  // A translucent colour film — stays visible on both light and dark images.
  context.globalAlpha = opacity;
  context.fillStyle = color;
  for (const region of regions) {
    const rect = clampRect(region, source.width, source.height);
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
  context.restore();

  return canvas;
}
