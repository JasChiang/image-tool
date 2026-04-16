import { clampRect } from "../core/geometry";
import type { Rect } from "../core/geometry";
import type { EditorTool } from "./editorTool";

export const coverTool: EditorTool = {
  id: "cover",
  label: "純色遮蓋",
  apply({ source, region, settings }) {
    return createCoverCanvas(source, [region], settings);
  },
  applyBatch({ source, regions, settings }) {
    return createCoverCanvas(source, regions, settings);
  }
};

function createCoverCanvas(
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
  context.fillStyle = String(settings.coverColor || "#111827");

  for (const region of regions) {
    const rect = clampRect(region, source.width, source.height);
    if (rect.width < 1 || rect.height < 1) {
      continue;
    }
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  return canvas;
}
