import { clampRect, normalizeRect, rectHasArea, type Point, type Rect } from "../core/geometry";
import type { ImageDocument } from "../core/imageDocument";
import type { EditorTool } from "../tools/editorTool";

type EditorElements = {
  canvas: HTMLCanvasElement;
  dropZone: HTMLElement;
  emptyState: HTMLElement;
  mosaicTab: HTMLButtonElement;
  sliceTab: HTMLButtonElement;
  mosaicPanel: HTMLElement;
  slicePanel: HTMLElement;
  fileInput: HTMLInputElement;
  cellSize: HTMLInputElement;
  cellSizeValue: HTMLOutputElement;
  exportName: HTMLInputElement;
  selectionCount: HTMLElement;
  showGrid: HTMLInputElement;
  sliceCount: HTMLElement;
  verticalLineCount: HTMLElement;
  horizontalLineCount: HTMLElement;
  applyButton: HTMLButtonElement;
  clearSelectionButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  downloadButton: HTMLButtonElement;
  addVerticalLineButton: HTMLButtonElement;
  addHorizontalLineButton: HTMLButtonElement;
  undoCutLineButton: HTMLButtonElement;
  clearCutLinesButton: HTMLButtonElement;
  downloadSlicesButton: HTMLButtonElement;
  documentState: ImageDocument;
  activeTool: EditorTool;
};

type EditorMode = "mosaic" | "slice";
type PendingCutLine = "vertical" | "horizontal" | null;

type Viewport = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function createEditorController(elements: EditorElements): void {
  const context = elements.canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  let selections: Rect[] = [];
  let draftSelection: Rect | null = null;
  let dragStart: Point | null = null;
  let mode: EditorMode = "mosaic";
  let pendingCutLine: PendingCutLine = null;
  let verticalLines: number[] = [];
  let horizontalLines: number[] = [];
  let cutHistory: Array<{ direction: Exclude<PendingCutLine, null>; value: number }> = [];
  let viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

  const render = () => {
    const bitmap = elements.documentState.bitmap;
    const bounds = elements.dropZone.getBoundingClientRect();
    const density = window.devicePixelRatio || 1;

    elements.canvas.width = Math.max(1, Math.floor(bounds.width * density));
    elements.canvas.height = Math.max(1, Math.floor(bounds.height * density));
    elements.canvas.style.width = `${bounds.width}px`;
    elements.canvas.style.height = `${bounds.height}px`;

    context.setTransform(density, 0, 0, density, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);

    if (!bitmap) {
      updateControls();
      return;
    }

    viewport = getViewport(bitmap, bounds.width, bounds.height);
    context.imageSmoothingEnabled = true;
    context.drawImage(
      bitmap,
      viewport.offsetX,
      viewport.offsetY,
      bitmap.width * viewport.scale,
      bitmap.height * viewport.scale
    );

    if (mode === "mosaic") {
      selections.forEach((selection, index) => {
        drawSelection(context, selection, viewport, String(index + 1));
      });

      if (draftSelection && rectHasArea(draftSelection)) {
        drawSelection(context, draftSelection, viewport);
      }
    } else if (elements.showGrid.checked) {
      drawSliceGrid(context, bitmap, viewport, verticalLines, horizontalLines, pendingCutLine);
    }

    updateControls();
  };

  const updateControls = () => {
    const hasImage = elements.documentState.hasImage;
    const hasSelection = selections.length > 0;
    const hasCutLines = verticalLines.length + horizontalLines.length > 0;

    elements.emptyState.hidden = hasImage;
    elements.mosaicTab.classList.toggle("is-active", mode === "mosaic");
    elements.sliceTab.classList.toggle("is-active", mode === "slice");
    elements.mosaicPanel.hidden = mode !== "mosaic";
    elements.slicePanel.hidden = mode !== "slice";
    elements.applyButton.disabled = !hasImage || !hasSelection;
    elements.clearSelectionButton.disabled = !hasSelection;
    elements.undoButton.disabled = !elements.documentState.canUndo;
    elements.resetButton.disabled = !hasImage;
    elements.downloadButton.disabled = !hasImage;
    elements.addVerticalLineButton.disabled = !hasImage;
    elements.addHorizontalLineButton.disabled = !hasImage;
    elements.undoCutLineButton.disabled = !hasCutLines;
    elements.clearCutLinesButton.disabled = !hasCutLines;
    elements.downloadSlicesButton.disabled = !hasImage || !hasCutLines;
    elements.cellSizeValue.value = `${elements.cellSize.value} px`;
    elements.selectionCount.textContent = String(selections.length);
    elements.verticalLineCount.textContent = String(verticalLines.length);
    elements.horizontalLineCount.textContent = String(horizontalLines.length);
    elements.sliceCount.textContent = String((verticalLines.length + 1) * (horizontalLines.length + 1));
  };

  const loadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    await elements.documentState.load(file);
    selections = [];
    draftSelection = null;
    clearCutLines();
    render();
  };

  elements.mosaicTab.addEventListener("click", () => {
    mode = "mosaic";
    pendingCutLine = null;
    render();
  });

  elements.sliceTab.addEventListener("click", () => {
    mode = "slice";
    selections = [];
    draftSelection = null;
    dragStart = null;
    render();
  });

  elements.fileInput.addEventListener("change", async () => {
    const file = elements.fileInput.files?.[0];

    if (file) {
      await loadFile(file);
    }
  });

  elements.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });

  elements.dropZone.addEventListener("dragleave", () => {
    elements.dropZone.classList.remove("is-dragging");
  });

  elements.dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
    const file = event.dataTransfer?.files[0];

    if (file) {
      await loadFile(file);
    }
  });

  elements.canvas.addEventListener("pointerdown", (event) => {
    const bitmap = elements.documentState.bitmap;

    if (!bitmap) {
      return;
    }

    const point = toImagePoint(event, elements.canvas, viewport);

    if (mode === "slice") {
      addPendingCutLine(point, bitmap);
      return;
    }

    dragStart = point;
    draftSelection = { x: point.x, y: point.y, width: 0, height: 0 };
    elements.canvas.setPointerCapture(event.pointerId);
    render();
  });

  elements.canvas.addEventListener("pointermove", (event) => {
    const bitmap = elements.documentState.bitmap;

    if (!bitmap || !dragStart) {
      return;
    }

    const point = toImagePoint(event, elements.canvas, viewport);
    draftSelection = clampRect(normalizeRect(dragStart, point), bitmap.width, bitmap.height);
    render();
  });

  elements.canvas.addEventListener("pointerup", (event) => {
    if (draftSelection && rectHasArea(draftSelection)) {
      selections = [...selections, draftSelection];
    }

    dragStart = null;
    draftSelection = null;
    if (elements.canvas.hasPointerCapture(event.pointerId)) {
      elements.canvas.releasePointerCapture(event.pointerId);
    }
    render();
  });

  elements.canvas.addEventListener("pointercancel", () => {
    dragStart = null;
    draftSelection = null;
    render();
  });

  elements.cellSize.addEventListener("input", updateControls);
  elements.showGrid.addEventListener("change", render);

  elements.addVerticalLineButton.addEventListener("click", () => {
    pendingCutLine = "vertical";
    render();
  });

  elements.addHorizontalLineButton.addEventListener("click", () => {
    pendingCutLine = "horizontal";
    render();
  });

  elements.undoCutLineButton.addEventListener("click", () => {
    const last = cutHistory.pop();

    if (!last) {
      return;
    }

    if (last.direction === "vertical") {
      verticalLines = verticalLines.filter((line) => line !== last.value);
    } else {
      horizontalLines = horizontalLines.filter((line) => line !== last.value);
    }

    pendingCutLine = null;
    render();
  });

  elements.clearCutLinesButton.addEventListener("click", () => {
    clearCutLines();
    render();
  });

  elements.downloadSlicesButton.addEventListener("click", async () => {
    const bitmap = elements.documentState.bitmap;

    if (!bitmap) {
      return;
    }

    const zipBlob = await createSlicesZip(bitmap, verticalLines, horizontalLines);
    downloadBlob(zipBlob, getZipName(elements.exportName.value));
  });

  elements.applyButton.addEventListener("click", async () => {
    const bitmap = elements.documentState.bitmap;

    if (!bitmap || selections.length === 0) {
      return;
    }

    const result = await applyToolToRegions(elements.activeTool, bitmap, selections, {
      cellSize: Number(elements.cellSize.value)
    });

    await elements.documentState.replaceWith(result);
    selections = [];
    draftSelection = null;
    render();
  });

  elements.clearSelectionButton.addEventListener("click", () => {
    selections = [];
    draftSelection = null;
    render();
  });

  elements.undoButton.addEventListener("click", () => {
    elements.documentState.undo();
    selections = [];
    draftSelection = null;
    render();
  });

  elements.resetButton.addEventListener("click", async () => {
    await elements.documentState.reset();
    selections = [];
    draftSelection = null;
    render();
  });

  elements.downloadButton.addEventListener("click", async () => {
    const bitmap = elements.documentState.bitmap;

    if (!bitmap) {
      return;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = bitmap.width;
    exportCanvas.height = bitmap.height;
    const exportContext = exportCanvas.getContext("2d");

    if (!exportContext) {
      return;
    }

    exportContext.drawImage(bitmap, 0, 0);
    const blob = await canvasToBlob(exportCanvas);
    downloadBlob(blob, getExportName(elements.exportName.value));
  });

  window.addEventListener("resize", render);
  render();

  function addPendingCutLine(point: Point, bitmap: ImageBitmap): void {
    if (pendingCutLine === "vertical") {
      const x = Math.round(clamp(point.x, 1, bitmap.width - 1));
      verticalLines = addUniqueLine(verticalLines, x);
      cutHistory = [...cutHistory, { direction: "vertical", value: x }];
      pendingCutLine = null;
      render();
      return;
    }

    if (pendingCutLine === "horizontal") {
      const y = Math.round(clamp(point.y, 1, bitmap.height - 1));
      horizontalLines = addUniqueLine(horizontalLines, y);
      cutHistory = [...cutHistory, { direction: "horizontal", value: y }];
      pendingCutLine = null;
      render();
    }
  }

  function clearCutLines(): void {
    verticalLines = [];
    horizontalLines = [];
    cutHistory = [];
    pendingCutLine = null;
  }
}

async function applyToolToRegions(
  tool: EditorTool,
  source: ImageBitmap,
  regions: Rect[],
  settings: Record<string, number | string | boolean>
): Promise<HTMLCanvasElement> {
  if (tool.applyBatch) {
    return tool.applyBatch({
      source,
      regions,
      settings
    });
  }

  let workingSource = source;
  let previousIntermediate: ImageBitmap | null = null;
  let result: HTMLCanvasElement | null = null;

  for (const region of regions) {
    result = tool.apply({
      source: workingSource,
      region,
      settings: {
        ...settings
      }
    });

    if (previousIntermediate) {
      previousIntermediate.close();
    }

    previousIntermediate = await createImageBitmap(result);
    workingSource = previousIntermediate;
  }

  previousIntermediate?.close();

  if (!result) {
    throw new Error("No regions to apply.");
  }

  return result;
}

function getViewport(bitmap: ImageBitmap, width: number, height: number): Viewport {
  const scale = Math.min(width / bitmap.width, height / bitmap.height);
  const renderedWidth = bitmap.width * scale;
  const renderedHeight = bitmap.height * scale;

  return {
    scale,
    offsetX: (width - renderedWidth) / 2,
    offsetY: (height - renderedHeight) / 2
  };
}

function toImagePoint(event: PointerEvent, canvas: HTMLCanvasElement, viewport: Viewport): Point {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left - viewport.offsetX) / viewport.scale;
  const y = (event.clientY - bounds.top - viewport.offsetY) / viewport.scale;

  return { x, y };
}

function drawSelection(
  context: CanvasRenderingContext2D,
  selection: Rect,
  viewport: Viewport,
  label?: string
): void {
  const x = selection.x * viewport.scale + viewport.offsetX;
  const y = selection.y * viewport.scale + viewport.offsetY;
  const width = selection.width * viewport.scale;
  const height = selection.height * viewport.scale;

  context.save();
  context.fillStyle = "rgba(56, 189, 248, 0.18)";
  context.strokeStyle = "#0ea5e9";
  context.lineWidth = 2;
  context.setLineDash([8, 6]);
  context.fillRect(x, y, width, height);
  context.strokeRect(x, y, width, height);

  if (label) {
    context.setLineDash([]);
    context.fillStyle = "#0ea5e9";
    context.fillRect(x, y, 26, 22);
    context.fillStyle = "#ffffff";
    context.font = "700 13px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, x + 13, y + 11);
  }

  context.restore();
}

function drawSliceGrid(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  viewport: Viewport,
  verticalLines: number[],
  horizontalLines: number[],
  pendingCutLine: PendingCutLine
): void {
  const x = viewport.offsetX;
  const y = viewport.offsetY;
  const width = bitmap.width * viewport.scale;
  const height = bitmap.height * viewport.scale;

  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.62)";
  context.lineWidth = 1;
  context.setLineDash([4, 5]);
  context.strokeRect(x, y, width, height);

  context.setLineDash([]);
  context.strokeStyle = "#ef4444";
  context.lineWidth = 2;

  verticalLines.forEach((line, index) => {
    const lineX = x + line * viewport.scale;
    context.beginPath();
    context.moveTo(lineX, y);
    context.lineTo(lineX, y + height);
    context.stroke();
    drawLineLabel(context, `V${index + 1}`, lineX + 4, y + 18);
  });

  context.strokeStyle = "#0f766e";
  horizontalLines.forEach((line, index) => {
    const lineY = y + line * viewport.scale;
    context.beginPath();
    context.moveTo(x, lineY);
    context.lineTo(x + width, lineY);
    context.stroke();
    drawLineLabel(context, `H${index + 1}`, x + 4, lineY - 4);
  });

  if (pendingCutLine) {
    context.fillStyle = "rgba(15, 23, 42, 0.72)";
    context.font = "700 14px system-ui, sans-serif";
    context.fillText(pendingCutLine === "vertical" ? "點擊圖片新增直線" : "點擊圖片新增橫線", x + 12, y + 24);
  }

  context.restore();
}

function drawLineLabel(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number
): void {
  context.save();
  context.fillStyle = "rgba(15, 23, 42, 0.78)";
  context.fillRect(x, y - 14, 28, 20);
  context.fillStyle = "#ffffff";
  context.font = "700 12px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x + 14, y - 4);
  context.restore();
}

function getExportName(value: string): string {
  const name = value.trim() || "mosaic-image.png";
  return name.toLowerCase().endsWith(".png") ? name : `${name}.png`;
}

function getZipName(value: string): string {
  const base = value.trim().replace(/\.(png|jpe?g|webp|zip)$/i, "") || "sliced-image";
  return `${base}-slices.zip`;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Could not export PNG."));
    }, "image/png");
  });
}

async function createSlicesZip(
  bitmap: ImageBitmap,
  verticalLines: number[],
  horizontalLines: number[]
): Promise<Blob> {
  const xBounds = [0, ...sortNumbers(verticalLines), bitmap.width];
  const yBounds = [0, ...sortNumbers(horizontalLines), bitmap.height];
  const files: Array<{ name: string; data: Uint8Array }> = [];

  for (let row = 0; row < yBounds.length - 1; row += 1) {
    for (let column = 0; column < xBounds.length - 1; column += 1) {
      const canvas = document.createElement("canvas");
      const sourceX = xBounds[column];
      const sourceY = yBounds[row];
      const width = xBounds[column + 1] - sourceX;
      const height = yBounds[row + 1] - sourceY;
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas is not supported.");
      }

      context.drawImage(bitmap, sourceX, sourceY, width, height, 0, 0, width, height);
      const blob = await canvasToBlob(canvas);
      files.push({
        name: `slice-r${row + 1}-c${column + 1}.png`,
        data: new Uint8Array(await blob.arrayBuffer())
      });
    }
  }

  return createZip(files);
}

function createZip(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const localHeader = concatBytes(
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(file.data.byteLength),
      uint32(file.data.byteLength),
      uint16(nameBytes.byteLength),
      uint16(0),
      nameBytes
    );
    const centralHeader = concatBytes(
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(file.data.byteLength),
      uint32(file.data.byteLength),
      uint16(nameBytes.byteLength),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBytes
    );

    localParts.push(localHeader, file.data);
    centralParts.push(centralHeader);
    offset += localHeader.byteLength + file.data.byteLength;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const endRecord = concatBytes(
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralSize),
    uint32(centralOffset),
    uint16(0)
  );

  const zipBytes = concatBytes(...localParts, ...centralParts, endRecord);
  const zipBuffer = new ArrayBuffer(zipBytes.byteLength);
  new Uint8Array(zipBuffer).set(zipBytes);

  return new Blob([zipBuffer], { type: "application/zip" });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function addUniqueLine(lines: number[], line: number): number[] {
  if (lines.some((existing) => Math.abs(existing - line) <= 1)) {
    return sortNumbers(lines);
  }

  return sortNumbers([...lines, line]);
}

function sortNumbers(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.byteLength;
  });

  return output;
}

function uint16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, value, true);
  return bytes;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, true);
  return bytes;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  data.forEach((byte) => {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  });

  return (crc ^ 0xffffffff) >>> 0;
}
