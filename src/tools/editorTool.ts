import type { Rect } from "../core/geometry";

export type ToolContext = {
  source: ImageBitmap;
  region: Rect;
  settings: Record<string, number | string | boolean>;
};

export type BatchToolContext = {
  source: ImageBitmap;
  regions: Rect[];
  settings: Record<string, number | string | boolean>;
};

export type EditorTool = {
  id: string;
  label: string;
  apply(context: ToolContext): HTMLCanvasElement;
  applyBatch?(context: BatchToolContext): HTMLCanvasElement;
};
