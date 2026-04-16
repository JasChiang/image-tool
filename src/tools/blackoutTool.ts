import { clampRect } from "../core/geometry";
import type { Rect } from "../core/geometry";
import type { EditorTool } from "./editorTool";

export const blackoutTool: EditorTool = {
  id: "blackout",
  label: "黑條",
  apply({ source, region }) {
    return createBlackoutCanvas(source, [region]);
  },
  applyBatch({ source, regions }) {
    return createBlackoutCanvas(source, regions);
  }
};

function createBlackoutCanvas(source: ImageBitmap, regions: Rect[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.drawImage(source, 0, 0);
  context.fillStyle = "#111827";

  for (const region of regions) {
    const rect = clampRect(region, source.width, source.height);
    if (rect.width < 1 || rect.height < 1) {
      continue;
    }
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  return canvas;
}
