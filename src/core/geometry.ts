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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
