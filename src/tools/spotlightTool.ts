import { clampRect } from "../core/geometry";
import type { Rect } from "../core/geometry";
import type { EditorTool } from "./editorTool";

export const spotlightTool: EditorTool = {
  id: "spotlight",
  label: "反白聚光",
  apply({ source, region, settings }) {
    return createSpotlightCanvas(source, [region], settings);
  },
  applyBatch({ source, regions, settings }) {
    return createSpotlightCanvas(source, regions, settings);
  }
};

function createSpotlightCanvas(
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

  // cellSize is reused as the dim-outside strength percentage for this tool.
  const dim = Math.min(0.95, Math.max(0.1, (Number(settings.cellSize) || 60) / 100));

  // Darken the whole image, then paint the highlighted regions back at full brightness.
  context.save();
  context.fillStyle = `rgba(0, 0, 0, ${dim})`;
  context.fillRect(0, 0, source.width, source.height);
  for (const region of regions) {
    const rect = clampRect(region, source.width, source.height);
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }
    context.drawImage(
      source,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      rect.x,
      rect.y,
      rect.width,
      rect.height
    );
  }
  context.restore();

  return canvas;
}
