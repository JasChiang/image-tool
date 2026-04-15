import { clampRect, normalizeRect, rectHasArea, type Point, type Rect } from "../core/geometry";
import type { ImageDocument } from "../core/imageDocument";
import type { EditorTool } from "../tools/editorTool";

type EditorElements = {
  canvas: HTMLCanvasElement;
  dropZone: HTMLElement;
  emptyState: HTMLElement;
  fileInput: HTMLInputElement;
  cellSize: HTMLInputElement;
  cellSizeValue: HTMLOutputElement;
  exportName: HTMLInputElement;
  selectionCount: HTMLElement;
  applyButton: HTMLButtonElement;
  clearSelectionButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  downloadButton: HTMLButtonElement;
  documentState: ImageDocument;
  activeTool: EditorTool;
};

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

    selections.forEach((selection, index) => {
      drawSelection(context, selection, viewport, String(index + 1));
    });

    if (draftSelection && rectHasArea(draftSelection)) {
      drawSelection(context, draftSelection, viewport);
    }

    updateControls();
  };

  const updateControls = () => {
    const hasImage = elements.documentState.hasImage;
    const hasSelection = selections.length > 0;

    elements.emptyState.hidden = hasImage;
    elements.applyButton.disabled = !hasImage || !hasSelection;
    elements.clearSelectionButton.disabled = !hasSelection;
    elements.undoButton.disabled = !elements.documentState.canUndo;
    elements.resetButton.disabled = !hasImage;
    elements.downloadButton.disabled = !hasImage;
    elements.cellSizeValue.value = `${elements.cellSize.value} px`;
    elements.selectionCount.textContent = String(selections.length);
  };

  const loadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    await elements.documentState.load(file);
    selections = [];
    draftSelection = null;
    render();
  };

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
    elements.canvas.releasePointerCapture(event.pointerId);
    render();
  });

  elements.canvas.addEventListener("pointercancel", () => {
    dragStart = null;
    draftSelection = null;
    render();
  });

  elements.cellSize.addEventListener("input", updateControls);

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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getExportName(elements.exportName.value);
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  window.addEventListener("resize", render);
  render();
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

function getExportName(value: string): string {
  const name = value.trim() || "mosaic-image.png";
  return name.toLowerCase().endsWith(".png") ? name : `${name}.png`;
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
