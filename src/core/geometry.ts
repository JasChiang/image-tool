export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RectSelection = {
  id: string;
  kind: "rect";
  rect: Rect;
};

export type BrushSelection = {
  id: string;
  kind: "brush";
  points: Point[];
  radius: number;
};

export type PolygonSelection = {
  id: string;
  kind: "polygon";
  points: Point[];
};

export type SelectionShape = RectSelection | BrushSelection | PolygonSelection;

export function normalizeRect(start: Point, end: Point): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}

export function clampRect(rect: Rect, maxWidth: number, maxHeight: number): Rect {
  const x = clamp(rect.x, 0, maxWidth);
  const y = clamp(rect.y, 0, maxHeight);
  const right = clamp(rect.x + rect.width, 0, maxWidth);
  const bottom = clamp(rect.y + rect.height, 0, maxHeight);

  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y)
  };
}

export function rectHasArea(rect: Rect): boolean {
  return rect.width >= 2 && rect.height >= 2;
}

export function selectionHasArea(selection: SelectionShape): boolean {
  switch (selection.kind) {
    case "rect":
      return rectHasArea(selection.rect);
    case "brush":
      return selection.points.length > 1;
    case "polygon":
      return selection.points.length >= 3;
  }
}

export function getSelectionBounds(selection: SelectionShape): Rect {
  switch (selection.kind) {
    case "rect":
      return selection.rect;
    case "brush": {
      const xs = selection.points.map((point) => point.x);
      const ys = selection.points.map((point) => point.y);
      const minX = Math.min(...xs) - selection.radius;
      const minY = Math.min(...ys) - selection.radius;
      const maxX = Math.max(...xs) + selection.radius;
      const maxY = Math.max(...ys) + selection.radius;
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
    case "polygon": {
      const xs = selection.points.map((point) => point.x);
      const ys = selection.points.map((point) => point.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
  }
}

export function getSelectionDisplayLabel(selection: SelectionShape): string {
  switch (selection.kind) {
    case "rect":
      return "矩形";
    case "brush":
      return `筆刷 ${selection.radius}px`;
    case "polygon":
      return `多邊形 ${selection.points.length} 點`;
  }
}

export function selectionToRects(selection: SelectionShape, maxWidth: number, maxHeight: number): Rect[] {
  switch (selection.kind) {
    case "rect":
      return [clampRect(selection.rect, maxWidth, maxHeight)].filter(
        (rect) => rect.width >= 1 && rect.height >= 1
      );
    case "brush":
      return rasterizeSelection(selection, maxWidth, maxHeight);
    case "polygon":
      return rasterizeSelection(selection, maxWidth, maxHeight);
  }
}

export function drawSelectionShape(
  context: CanvasRenderingContext2D,
  selection: SelectionShape,
  viewport: { scale: number; offsetX: number; offsetY: number },
  style?: { fill?: string; stroke?: string; lineWidth?: number; dashed?: boolean; label?: string }
): void {
  context.save();
  context.fillStyle = style?.fill ?? "rgba(56, 189, 248, 0.18)";
  context.strokeStyle = style?.stroke ?? "#0ea5e9";
  context.lineWidth = style?.lineWidth ?? 2;
  context.setLineDash(style?.dashed === false ? [] : [8, 6]);

  const path = new Path2D();

  if (selection.kind === "rect") {
    const x = selection.rect.x * viewport.scale + viewport.offsetX;
    const y = selection.rect.y * viewport.scale + viewport.offsetY;
    const width = selection.rect.width * viewport.scale;
    const height = selection.rect.height * viewport.scale;
    path.rect(x, y, width, height);
  } else if (selection.kind === "brush") {
    if (selection.points.length > 0) {
      const first = selection.points[0];
      path.moveTo(first.x * viewport.scale + viewport.offsetX, first.y * viewport.scale + viewport.offsetY);
      selection.points.slice(1).forEach((point) => {
        path.lineTo(point.x * viewport.scale + viewport.offsetX, point.y * viewport.scale + viewport.offsetY);
      });
      context.lineWidth = Math.max(2, selection.radius * 2 * viewport.scale);
      context.lineCap = "round";
      context.lineJoin = "round";
    }
  } else {
    if (selection.points.length > 0) {
      path.moveTo(
        selection.points[0].x * viewport.scale + viewport.offsetX,
        selection.points[0].y * viewport.scale + viewport.offsetY
      );
      selection.points.slice(1).forEach((point) => {
        path.lineTo(point.x * viewport.scale + viewport.offsetX, point.y * viewport.scale + viewport.offsetY);
      });
      path.closePath();
    }
  }

  if (selection.kind === "brush") {
    context.stroke(path);
  } else {
    context.fill(path);
    context.stroke(path);
  }

  if (style?.label) {
    const bounds = getSelectionBounds(selection);
    const labelX = bounds.x * viewport.scale + viewport.offsetX;
    const labelY = bounds.y * viewport.scale + viewport.offsetY;
    context.setLineDash([]);
    context.fillStyle = "#0ea5e9";
    context.fillRect(labelX, labelY, 28, 22);
    context.fillStyle = "#ffffff";
    context.font = "700 13px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(style.label, labelX + 14, labelY + 11);
  }

  context.restore();
}

function rasterizeSelection(
  selection: BrushSelection | PolygonSelection,
  maxWidth: number,
  maxHeight: number
): Rect[] {
  const bounds = clampRect(getSelectionBounds(selection), maxWidth, maxHeight);
  const width = Math.max(1, Math.ceil(bounds.width));
  const height = Math.max(1, Math.ceil(bounds.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.fillStyle = "#000000";
  context.beginPath();

  if (selection.kind === "brush") {
    if (selection.points.length > 0) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = selection.radius * 2;
      context.moveTo(selection.points[0].x - bounds.x, selection.points[0].y - bounds.y);
      selection.points.slice(1).forEach((point) => {
        context.lineTo(point.x - bounds.x, point.y - bounds.y);
      });
      context.stroke();
    }
  } else if (selection.points.length > 0) {
    context.moveTo(selection.points[0].x - bounds.x, selection.points[0].y - bounds.y);
    selection.points.slice(1).forEach((point) => {
      context.lineTo(point.x - bounds.x, point.y - bounds.y);
    });
    context.closePath();
    context.fill();
  }

  const imageData = context.getImageData(0, 0, width, height).data;
  const rects: Rect[] = [];

  for (let y = 0; y < height; y += 1) {
    let runStart = -1;

    for (let x = 0; x < width; x += 1) {
      const alpha = imageData[(y * width + x) * 4 + 3];
      if (alpha > 0 && runStart === -1) {
        runStart = x;
      }

      if ((alpha === 0 || x === width - 1) && runStart !== -1) {
        const runEnd = alpha > 0 && x === width - 1 ? x + 1 : x;
        rects.push({
          x: bounds.x + runStart,
          y: bounds.y + y,
          width: runEnd - runStart,
          height: 1
        });
        runStart = -1;
      }
    }
  }

  return rects.filter((rect) => rect.width >= 1 && rect.height >= 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
