import { clampRect, normalizeRect, rectHasArea, type Point, type Rect } from "../core/geometry";
import { ImageDocument } from "../core/imageDocument";
import { blackoutTool } from "../tools/blackoutTool";
import { blurTool } from "../tools/blurTool";
import { coverTool } from "../tools/coverTool";
import { mosaicTool } from "../tools/mosaicTool";
import type { EditorTool } from "../tools/editorTool";

type ExportFormat = "png" | "jpeg" | "webp";
type EditorMode = "edit" | "slice";
type PendingCutLine = "vertical" | "horizontal" | null;
type ToolId = "mosaic" | "blur" | "blackout" | "cover";

type Viewport = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type UiSettings = {
  activeToolId: ToolId;
  strengthValues: Record<"mosaic" | "blur", number>;
  coverColor: string;
  exportFormat: ExportFormat;
  exportQuality: number;
  workspaceSize: number;
  gridSize: number;
  showGrid: boolean;
};

type ImageEntry = {
  id: string;
  name: string;
  document: ImageDocument;
  thumbnailUrl: string;
};

type EditorElements = {
  canvas: HTMLCanvasElement;
  fileInput: HTMLInputElement;
  canvasPanel: HTMLElement;
  dropZone: HTMLElement;
  emptyState: HTMLElement;
  editTab: HTMLButtonElement;
  sliceTab: HTMLButtonElement;
  editPanel: HTMLElement;
  slicePanel: HTMLElement;
  imageList: HTMLElement;
  activeImageMeta: HTMLElement;
  mosaicToolButton: HTMLButtonElement;
  blurToolButton: HTMLButtonElement;
  blackoutToolButton: HTMLButtonElement;
  coverToolButton: HTMLButtonElement;
  effectStrengthLabel: HTMLLabelElement;
  cellSize: HTMLInputElement;
  cellSizeValue: HTMLOutputElement;
  effectHint: HTMLElement;
  coverColorGroup: HTMLElement;
  coverColor: HTMLInputElement;
  exportName: HTMLInputElement;
  exportFormat: HTMLSelectElement;
  exportQuality: HTMLInputElement;
  exportQualityValue: HTMLOutputElement;
  workspaceSize: HTMLInputElement;
  workspaceSizeValue: HTMLOutputElement;
  selectionCount: HTMLElement;
  selectionSummary: HTMLElement;
  selectionList: HTMLElement;
  compareToggle: HTMLInputElement;
  cropButton: HTMLButtonElement;
  rotateLeftButton: HTMLButtonElement;
  rotateRightButton: HTMLButtonElement;
  flipHorizontalButton: HTMLButtonElement;
  flipVerticalButton: HTMLButtonElement;
  showGrid: HTMLInputElement;
  gridSize: HTMLInputElement;
  gridSizeValue: HTMLOutputElement;
  sliceCount: HTMLElement;
  verticalLineCount: HTMLElement;
  horizontalLineCount: HTMLElement;
  applyButton: HTMLButtonElement;
  removeLastSelectionButton: HTMLButtonElement;
  clearSelectionButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  downloadButton: HTMLButtonElement;
  downloadAllButton: HTMLButtonElement;
  addVerticalLineButton: HTMLButtonElement;
  addHorizontalLineButton: HTMLButtonElement;
  undoCutLineButton: HTMLButtonElement;
  clearCutLinesButton: HTMLButtonElement;
  downloadSlicesButton: HTMLButtonElement;
  processingStatus: HTMLElement;
};

const SETTINGS_KEY = "image-tool-ui-settings-v1";

const DEFAULT_SETTINGS: UiSettings = {
  activeToolId: "mosaic",
  strengthValues: {
    mosaic: 18,
    blur: 12
  },
  coverColor: "#111827",
  exportFormat: "png",
  exportQuality: 92,
  workspaceSize: 100,
  gridSize: 100,
  showGrid: true
};

const TOOL_CONFIG: Record<ToolId, {
  tool: EditorTool;
  label: string;
  hint: string;
  min: number;
  max: number;
  defaultValue: number;
  suffix: string;
  buttonLabel: string;
  usesStrength: boolean;
}> = {
  mosaic: {
    tool: mosaicTool,
    label: "馬賽克格子",
    hint: "拖曳多個區域後，一次套用像素化遮蔽。",
    min: 4,
    max: 80,
    defaultValue: 18,
    suffix: "px",
    buttonLabel: "套用全部馬賽克",
    usesStrength: true
  },
  blur: {
    tool: blurTool,
    label: "模糊半徑",
    hint: "適合柔化文字、臉部或背景資訊。",
    min: 2,
    max: 40,
    defaultValue: 12,
    suffix: "px",
    buttonLabel: "套用全部模糊",
    usesStrength: true
  },
  blackout: {
    tool: blackoutTool,
    label: "黑條模式",
    hint: "用實心黑條快速遮住敏感內容。",
    min: 4,
    max: 80,
    defaultValue: 18,
    suffix: "固定",
    buttonLabel: "套用全部黑條",
    usesStrength: false
  },
  cover: {
    tool: coverTool,
    label: "純色遮蓋",
    hint: "自訂顏色覆蓋資訊，適合標註或統一樣式遮蓋。",
    min: 4,
    max: 80,
    defaultValue: 18,
    suffix: "固定",
    buttonLabel: "套用全部純色遮蓋",
    usesStrength: false
  }
};

export function createEditorController(elements: EditorElements): void {
  const context = elements.canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  const settings = loadSettings();
  const images: ImageEntry[] = [];

  let activeImageId: string | null = null;
  let selections: Rect[] = [];
  let draftSelection: Rect | null = null;
  let dragStart: Point | null = null;
  let mode: EditorMode = "edit";
  let pendingCutLine: PendingCutLine = null;
  let verticalLines: number[] = [];
  let horizontalLines: number[] = [];
  let cutHistory: Array<{ direction: Exclude<PendingCutLine, null>; value: number }> = [];
  let viewport: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };
  let isBusy = false;
  let activeToolId: ToolId = settings.activeToolId;

  hydrateUiFromSettings();

  const reportError = (error: unknown, fallbackMessage: string) => {
    console.error(error);
    const message = error instanceof Error ? error.message : fallbackMessage;
    window.alert(message);
  };

  const getActiveEntry = (): ImageEntry | null =>
    images.find((entry) => entry.id === activeImageId) ?? null;

  const getCurrentBitmap = (): ImageBitmap | null => getActiveEntry()?.document.bitmap ?? null;
  const getOriginalBitmap = (): ImageBitmap | null => getActiveEntry()?.document.originalBitmap ?? null;
  const getDisplayBitmap = (): ImageBitmap | null =>
    elements.compareToggle.checked ? getOriginalBitmap() ?? getCurrentBitmap() : getCurrentBitmap();

  const getActiveToolConfig = () => TOOL_CONFIG[activeToolId];

  const saveSettings = () => {
    const next: UiSettings = {
      activeToolId,
      strengthValues: {
        mosaic: settings.strengthValues.mosaic,
        blur: settings.strengthValues.blur
      },
      coverColor: elements.coverColor.value,
      exportFormat: elements.exportFormat.value as ExportFormat,
      exportQuality: Number(elements.exportQuality.value),
      workspaceSize: Number(elements.workspaceSize.value),
      gridSize: Number(elements.gridSize.value),
      showGrid: elements.showGrid.checked
    };

    Object.assign(settings, next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const clearSelections = () => {
    selections = [];
    draftSelection = null;
    dragStart = null;
  };

  const clearCutLines = () => {
    verticalLines = [];
    horizontalLines = [];
    cutHistory = [];
    pendingCutLine = null;
  };

  const resetEphemeralState = () => {
    clearSelections();
    clearCutLines();
    elements.compareToggle.checked = false;
  };

  const setBusy = (busy: boolean, message?: string) => {
    isBusy = busy;
    elements.dropZone.classList.toggle("is-busy", busy);
    elements.processingStatus.textContent = message
      ? message
      : "所有處理都在本機瀏覽器完成，不會上傳圖片。";
  };

  const syncToolUi = () => {
    const config = getActiveToolConfig();

    elements.mosaicToolButton.classList.toggle("is-active", activeToolId === "mosaic");
    elements.blurToolButton.classList.toggle("is-active", activeToolId === "blur");
    elements.blackoutToolButton.classList.toggle("is-active", activeToolId === "blackout");
    elements.coverToolButton.classList.toggle("is-active", activeToolId === "cover");
    elements.effectStrengthLabel.textContent = config.label;
    elements.effectHint.textContent = config.hint;
    elements.applyButton.textContent = config.buttonLabel;
    elements.coverColorGroup.hidden = activeToolId !== "cover";

    if (config.usesStrength) {
      const strength = settings.strengthValues[activeToolId as "mosaic" | "blur"] ?? config.defaultValue;
      elements.cellSize.disabled = false;
      elements.cellSize.min = String(config.min);
      elements.cellSize.max = String(config.max);
      elements.cellSize.value = String(strength);
      elements.cellSizeValue.value = `${strength} ${config.suffix}`;
    } else {
      elements.cellSize.disabled = true;
      elements.cellSize.value = String(config.defaultValue);
      elements.cellSizeValue.value = config.suffix;
    }
  };

  const renderSelectionList = () => {
    if (selections.length === 0) {
      elements.selectionSummary.textContent = "尚未建立選區";
      elements.selectionList.innerHTML =
        '<p class="selection-list-empty">拖曳畫面建立第一個選區。</p>';
      return;
    }

    const totalArea = selections.reduce((sum, selection) => sum + selection.width * selection.height, 0);
    elements.selectionSummary.textContent = `${selections.length} 個區域 / ${Math.round(totalArea)} px²`;
    elements.selectionList.innerHTML = selections
      .map((selection, index) => {
        const width = Math.round(selection.width);
        const height = Math.round(selection.height);
        const x = Math.round(selection.x);
        const y = Math.round(selection.y);

        return `
          <div class="selection-item">
            <div>
              <strong>區域 ${index + 1}</strong>
              <p>${x}, ${y} / ${width} × ${height}</p>
            </div>
            <button type="button" class="selection-remove-button" data-selection-index="${index}">
              刪除
            </button>
          </div>
        `;
      })
      .join("");
  };

  const renderImageList = () => {
    if (images.length === 0) {
      elements.imageList.innerHTML =
        '<p class="image-list-empty">可同時放入多張圖片，逐張切換編輯，再一次匯出。</p>';
      return;
    }

    elements.imageList.innerHTML = images
      .map((entry) => {
        const isActive = entry.id === activeImageId;
        return `
          <button type="button" class="image-card${isActive ? " is-active" : ""}" data-switch-image="${
            entry.id
          }">
            <img src="${entry.thumbnailUrl}" alt="${escapeHtml(entry.name)} 的縮圖" />
            <span>${escapeHtml(entry.name)}</span>
            <span class="image-card-remove" data-remove-image="${entry.id}">移除</span>
          </button>
        `;
      })
      .join("");
  };

  const updateActiveMeta = () => {
    const entry = getActiveEntry();
    const bitmap = entry?.document.bitmap;

    if (!entry || !bitmap) {
      elements.activeImageMeta.textContent = "尚未載入圖片";
      return;
    }

    elements.activeImageMeta.textContent = `${entry.name} / ${bitmap.width} × ${bitmap.height} / 共 ${images.length} 張`;
  };

  const updateControls = () => {
    const activeEntry = getActiveEntry();
    const bitmap = activeEntry?.document.bitmap ?? null;
    const hasImage = bitmap !== null;
    const hasSelection = selections.length > 0;
    const hasDraftSelection = draftSelection !== null;
    const hasCutLines = verticalLines.length + horizontalLines.length > 0;
    const canCrop = hasImage && selections.length > 0;

    elements.emptyState.hidden = hasImage;
    elements.editTab.classList.toggle("is-active", mode === "edit");
    elements.sliceTab.classList.toggle("is-active", mode === "slice");
    elements.editPanel.hidden = mode !== "edit";
    elements.slicePanel.hidden = mode !== "slice";
    elements.applyButton.disabled = !hasImage || !hasSelection || isBusy;
    elements.removeLastSelectionButton.disabled = !hasSelection || isBusy;
    elements.clearSelectionButton.disabled = !hasSelection || isBusy;
    elements.undoButton.disabled =
      !hasImage || (!activeEntry?.document.canUndo && !hasSelection && !hasDraftSelection) || isBusy;
    elements.redoButton.disabled = !activeEntry?.document.canRedo || isBusy;
    elements.resetButton.disabled = !hasImage || isBusy;
    elements.cropButton.disabled = !canCrop || isBusy;
    elements.rotateLeftButton.disabled = !hasImage || isBusy;
    elements.rotateRightButton.disabled = !hasImage || isBusy;
    elements.flipHorizontalButton.disabled = !hasImage || isBusy;
    elements.flipVerticalButton.disabled = !hasImage || isBusy;
    elements.downloadButton.disabled = !hasImage || isBusy;
    elements.downloadAllButton.disabled = images.length === 0 || isBusy;
    elements.addVerticalLineButton.disabled = !hasImage || isBusy;
    elements.addHorizontalLineButton.disabled = !hasImage || isBusy;
    elements.addVerticalLineButton.classList.toggle("is-active", pendingCutLine === "vertical");
    elements.addHorizontalLineButton.classList.toggle("is-active", pendingCutLine === "horizontal");
    elements.undoCutLineButton.disabled = !hasCutLines || isBusy;
    elements.clearCutLinesButton.disabled = !hasCutLines || isBusy;
    elements.downloadSlicesButton.disabled = !hasImage || !hasCutLines || isBusy;
    elements.selectionCount.textContent = String(selections.length);
    elements.verticalLineCount.textContent = String(verticalLines.length);
    elements.horizontalLineCount.textContent = String(horizontalLines.length);
    elements.sliceCount.textContent = String((verticalLines.length + 1) * (horizontalLines.length + 1));
    elements.exportQualityValue.value = `${elements.exportQuality.value}%`;
    elements.workspaceSizeValue.value = `${elements.workspaceSize.value}%`;
    elements.gridSizeValue.value = `${elements.gridSize.value} px`;
    renderSelectionList();
    renderImageList();
    updateActiveMeta();
    syncToolUi();
  };

  const render = () => {
    const bitmap = getDisplayBitmap();
    updateWorkspaceFrame(bitmap);
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

    if (mode === "edit") {
      selections.forEach((selection, index) => {
        drawSelection(context, selection, viewport, String(index + 1));
      });

      if (draftSelection && rectHasArea(draftSelection)) {
        drawSelection(context, draftSelection, viewport);
      }
    } else if (elements.showGrid.checked) {
      drawSliceGrid(
        context,
        bitmap,
        viewport,
        verticalLines,
        horizontalLines,
        pendingCutLine,
        Number(elements.gridSize.value)
      );
    }

    updateControls();
  };

  const updateThumbnail = async (entry: ImageEntry) => {
    const bitmap = entry.document.bitmap;
    if (!bitmap) {
      return;
    }

    entry.thumbnailUrl = await bitmapToThumbnailUrl(bitmap);
  };

  const syncExportName = () => {
    const activeEntry = getActiveEntry();
    if (!activeEntry) {
      elements.exportName.value = "image";
      return;
    }

    elements.exportName.value = getBaseName(activeEntry.name);
  };

  const switchToImage = (id: string) => {
    if (!images.some((entry) => entry.id === id)) {
      return;
    }

    activeImageId = id;
    resetEphemeralState();
    syncExportName();
    render();
  };

  const removeImage = (id: string) => {
    const index = images.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return;
    }

    const [entry] = images.splice(index, 1);
    entry.document.reset().catch(() => undefined);
    if (activeImageId === id) {
      activeImageId = images[index]?.id ?? images[index - 1]?.id ?? images[0]?.id ?? null;
      resetEphemeralState();
      syncExportName();
    }
    render();
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (incoming.length === 0) {
      return;
    }

    setBusy(true, "載入圖片中...");

    try {
      for (const file of incoming) {
        const document = new ImageDocument();
        await document.load(file);

        const entry: ImageEntry = {
          id: crypto.randomUUID(),
          name: file.name,
          document,
          thumbnailUrl: ""
        };

        await updateThumbnail(entry);
        images.push(entry);
        activeImageId = entry.id;
      }

      syncExportName();
      resetEphemeralState();
    } catch (error) {
      reportError(error, "圖片載入失敗，請重新選擇檔案。");
    } finally {
      elements.fileInput.value = "";
      setBusy(false);
      render();
    }
  };

  const transformCurrentImage = async (
    transformer: (bitmap: ImageBitmap) => HTMLCanvasElement,
    options?: { clearSelection?: boolean; message?: string }
  ) => {
    const activeEntry = getActiveEntry();
    const bitmap = activeEntry?.document.bitmap;

    if (!activeEntry || !bitmap || isBusy) {
      return;
    }

    try {
      setBusy(true, options?.message);
      const result = transformer(bitmap);
      await activeEntry.document.replaceWith(result);
      await updateThumbnail(activeEntry);
      if (options?.clearSelection ?? true) {
        clearSelections();
        clearCutLines();
      }
    } catch (error) {
      reportError(error, "圖片處理失敗，請稍後再試。");
    } finally {
      setBusy(false);
      render();
    }
  };

  const removeSelectionAt = (index: number) => {
    if (index < 0 || index >= selections.length || isBusy) {
      return;
    }
    selections = selections.filter((_, currentIndex) => currentIndex !== index);
    render();
  };

  const applyCurrentTool = async () => {
    const activeEntry = getActiveEntry();
    const bitmap = activeEntry?.document.bitmap;

    if (!activeEntry || !bitmap || selections.length === 0 || isBusy) {
      return;
    }

    try {
      setBusy(true, `${getActiveToolConfig().buttonLabel}處理中...`);
      const tool = getActiveToolConfig().tool;
      const result = await applyToolToRegions(tool, bitmap, selections, {
        cellSize: Number(elements.cellSize.value),
        coverColor: elements.coverColor.value
      });

      await activeEntry.document.replaceWith(result);
      await updateThumbnail(activeEntry);
      clearSelections();
    } catch (error) {
      reportError(error, "套用效果失敗，請稍後再試。");
    } finally {
      setBusy(false);
      render();
    }
  };

  const exportCurrent = async () => {
    const activeEntry = getActiveEntry();
    const bitmap = activeEntry?.document.bitmap;
    if (!activeEntry || !bitmap || isBusy) {
      return;
    }

    try {
      setBusy(true, "圖片匯出中...");
      const blob = await exportBitmap(bitmap, elements.exportFormat.value as ExportFormat, Number(elements.exportQuality.value));
      downloadBlob(blob, `${sanitizeFileName(elements.exportName.value || getBaseName(activeEntry.name))}.${getFileExtension(elements.exportFormat.value as ExportFormat)}`);
    } catch (error) {
      reportError(error, "下載圖片失敗，請稍後再試。");
    } finally {
      setBusy(false);
      render();
    }
  };

  const exportAll = async () => {
    if (images.length === 0 || isBusy) {
      return;
    }

    try {
      setBusy(true, "批次 ZIP 產生中...");
      const files: Array<{ name: string; data: Uint8Array }> = [];

      for (const entry of images) {
        const bitmap = entry.document.bitmap;
        if (!bitmap) {
          continue;
        }

        const format = elements.exportFormat.value as ExportFormat;
        const blob = await exportBitmap(bitmap, format, Number(elements.exportQuality.value));
        files.push({
          name: `${sanitizeFileName(getBaseName(entry.name))}.${getFileExtension(format)}`,
          data: new Uint8Array(await blob.arrayBuffer())
        });
      }

      const zipBlob = createZip(files);
      downloadBlob(zipBlob, `${sanitizeFileName(elements.exportName.value || "batch-export")}.zip`);
    } catch (error) {
      reportError(error, "批次下載失敗，請稍後再試。");
    } finally {
      setBusy(false);
      render();
    }
  };

  const exportSlices = async () => {
    const bitmap = getCurrentBitmap();
    if (!bitmap || isBusy) {
      return;
    }

    try {
      setBusy(true, "切片 ZIP 產生中...");
      const zipBlob = await createSlicesZip(bitmap, verticalLines, horizontalLines);
      downloadBlob(zipBlob, `${sanitizeFileName(elements.exportName.value || "sliced-image")}-slices.zip`);
    } catch (error) {
      reportError(error, "下載切片失敗，請稍後再試。");
    } finally {
      setBusy(false);
      render();
    }
  };

  elements.editTab.addEventListener("click", () => {
    if (isBusy) {
      return;
    }
    mode = "edit";
    pendingCutLine = null;
    render();
  });

  elements.sliceTab.addEventListener("click", () => {
    if (isBusy) {
      return;
    }
    mode = "slice";
    clearSelections();
    render();
  });

  elements.fileInput.addEventListener("change", async () => {
    await addFiles(elements.fileInput.files);
  });

  elements.dropZone.addEventListener("dragover", (event) => {
    if (isBusy) {
      return;
    }
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });

  elements.dropZone.addEventListener("dragleave", () => {
    elements.dropZone.classList.remove("is-dragging");
  });

  elements.dropZone.addEventListener("drop", async (event) => {
    if (isBusy) {
      return;
    }
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
    await addFiles(event.dataTransfer?.files ?? null);
  });

  elements.imageList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const removeButton = target.closest<HTMLElement>("[data-remove-image]");
    if (removeButton) {
      removeImage(removeButton.dataset.removeImage ?? "");
      return;
    }

    const switchButton = target.closest<HTMLElement>("[data-switch-image]");
    if (switchButton) {
      switchToImage(switchButton.dataset.switchImage ?? "");
    }
  });

  elements.mosaicToolButton.addEventListener("click", () => {
    activeToolId = "mosaic";
    saveSettings();
    render();
  });
  elements.blurToolButton.addEventListener("click", () => {
    activeToolId = "blur";
    saveSettings();
    render();
  });
  elements.blackoutToolButton.addEventListener("click", () => {
    activeToolId = "blackout";
    saveSettings();
    render();
  });
  elements.coverToolButton.addEventListener("click", () => {
    activeToolId = "cover";
    saveSettings();
    render();
  });

  elements.cellSize.addEventListener("input", () => {
    if (activeToolId === "mosaic" || activeToolId === "blur") {
      settings.strengthValues[activeToolId] = Number(elements.cellSize.value);
    }
    saveSettings();
    render();
  });

  elements.coverColor.addEventListener("input", () => {
    saveSettings();
    render();
  });

  elements.exportFormat.addEventListener("change", () => {
    saveSettings();
    render();
  });

  elements.exportQuality.addEventListener("input", () => {
    saveSettings();
    render();
  });

  elements.workspaceSize.addEventListener("input", () => {
    saveSettings();
    render();
  });

  elements.gridSize.addEventListener("input", () => {
    saveSettings();
    render();
  });

  elements.showGrid.addEventListener("change", () => {
    saveSettings();
    render();
  });

  elements.compareToggle.addEventListener("change", render);

  elements.selectionList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>("[data-selection-index]");
    if (!button) {
      return;
    }
    const index = Number(button.dataset.selectionIndex);
    if (!Number.isNaN(index)) {
      removeSelectionAt(index);
    }
  });

  elements.canvas.addEventListener("pointerdown", (event) => {
    const bitmap = getDisplayBitmap();
    if (!bitmap || isBusy) {
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
    const bitmap = getDisplayBitmap();
    if (!bitmap || !dragStart || isBusy) {
      return;
    }

    const point = toImagePoint(event, elements.canvas, viewport);
    draftSelection = clampRect(normalizeRect(dragStart, point), bitmap.width, bitmap.height);
    render();
  });

  elements.canvas.addEventListener("pointerup", (event) => {
    if (isBusy) {
      return;
    }
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

  elements.applyButton.addEventListener("click", applyCurrentTool);
  elements.removeLastSelectionButton.addEventListener("click", () => {
    if (selections.length === 0 || isBusy) {
      return;
    }
    selections = selections.slice(0, -1);
    render();
  });
  elements.clearSelectionButton.addEventListener("click", () => {
    if (isBusy) {
      return;
    }
    clearSelections();
    render();
  });

  elements.undoButton.addEventListener("click", async () => {
    const activeEntry = getActiveEntry();
    if (!activeEntry || isBusy) {
      return;
    }

    if (draftSelection) {
      draftSelection = null;
      dragStart = null;
      render();
      return;
    }

    if (selections.length > 0) {
      selections = selections.slice(0, -1);
      render();
      return;
    }

    activeEntry.document.undo();
    await updateThumbnail(activeEntry);
    render();
  });

  elements.redoButton.addEventListener("click", async () => {
    const activeEntry = getActiveEntry();
    if (!activeEntry || isBusy) {
      return;
    }

    activeEntry.document.redo();
    await updateThumbnail(activeEntry);
    render();
  });

  elements.resetButton.addEventListener("click", async () => {
    const activeEntry = getActiveEntry();
    if (!activeEntry || isBusy) {
      return;
    }

    try {
      setBusy(true, "重置圖片中...");
      await activeEntry.document.reset();
      await updateThumbnail(activeEntry);
      resetEphemeralState();
    } catch (error) {
      reportError(error, "重置圖片失敗，請重新載入圖片。");
    } finally {
      setBusy(false);
      render();
    }
  });

  elements.cropButton.addEventListener("click", async () => {
    const lastSelection = selections.at(-1);
    if (!lastSelection) {
      return;
    }

    await transformCurrentImage((bitmap) => cropBitmap(bitmap, lastSelection), {
      message: "裁切圖片中..."
    });
  });

  elements.rotateLeftButton.addEventListener("click", async () => {
    await transformCurrentImage((bitmap) => rotateBitmap(bitmap, -90), {
      message: "旋轉圖片中..."
    });
  });

  elements.rotateRightButton.addEventListener("click", async () => {
    await transformCurrentImage((bitmap) => rotateBitmap(bitmap, 90), {
      message: "旋轉圖片中..."
    });
  });

  elements.flipHorizontalButton.addEventListener("click", async () => {
    await transformCurrentImage((bitmap) => flipBitmap(bitmap, "horizontal"), {
      message: "翻轉圖片中..."
    });
  });

  elements.flipVerticalButton.addEventListener("click", async () => {
    await transformCurrentImage((bitmap) => flipBitmap(bitmap, "vertical"), {
      message: "翻轉圖片中..."
    });
  });

  elements.downloadButton.addEventListener("click", exportCurrent);
  elements.downloadAllButton.addEventListener("click", exportAll);

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
    render();
  });

  elements.clearCutLinesButton.addEventListener("click", () => {
    clearCutLines();
    render();
  });

  elements.downloadSlicesButton.addEventListener("click", exportSlices);

  window.addEventListener("resize", render);
  render();

  function hydrateUiFromSettings(): void {
    elements.exportFormat.value = settings.exportFormat;
    elements.exportQuality.value = String(settings.exportQuality);
    elements.exportQualityValue.value = `${settings.exportQuality}%`;
    elements.workspaceSize.value = String(settings.workspaceSize);
    elements.workspaceSizeValue.value = `${settings.workspaceSize}%`;
    elements.gridSize.value = String(settings.gridSize);
    elements.gridSizeValue.value = `${settings.gridSize} px`;
    elements.showGrid.checked = settings.showGrid;
    elements.coverColor.value = settings.coverColor;
  }

  function updateWorkspaceFrame(bitmap: ImageBitmap | null): void {
    if (!bitmap) {
      elements.dropZone.classList.remove("has-image");
      elements.dropZone.style.removeProperty("aspect-ratio");
      elements.dropZone.style.removeProperty("width");
      elements.dropZone.style.removeProperty("height");
      return;
    }

    const panelBounds = elements.canvasPanel.getBoundingClientRect();
    const panelStyle = window.getComputedStyle(elements.canvasPanel);
    const horizontalPadding =
      Number.parseFloat(panelStyle.paddingLeft) + Number.parseFloat(panelStyle.paddingRight);
    const verticalPadding =
      Number.parseFloat(panelStyle.paddingTop) + Number.parseFloat(panelStyle.paddingBottom);
    const availableWidth = Math.max(320, panelBounds.width - horizontalPadding);
    const availableHeight = Math.max(
      280,
      window.innerHeight - panelBounds.top - verticalPadding - 18
    );
    const sizeRatio = Number(elements.workspaceSize.value) / 100;
    const maxWidth = availableWidth * sizeRatio;
    const maxHeight = availableHeight * sizeRatio;
    const imageRatio = bitmap.width / bitmap.height;
    const frameWidth = Math.min(maxWidth, maxHeight * imageRatio);
    const frameHeight = frameWidth / imageRatio;

    elements.dropZone.classList.add("has-image");
    elements.dropZone.style.aspectRatio = `${bitmap.width} / ${bitmap.height}`;
    elements.dropZone.style.width = `${Math.round(frameWidth)}px`;
    elements.dropZone.style.height = `${Math.round(frameHeight)}px`;
  }

  function addPendingCutLine(point: Point, bitmap: ImageBitmap): void {
    if (pendingCutLine === "vertical") {
      const x = Math.round(clamp(point.x, 1, bitmap.width - 1));
      verticalLines = addUniqueLine(verticalLines, x);
      cutHistory = [...cutHistory, { direction: "vertical", value: x }];
      render();
      return;
    }

    if (pendingCutLine === "horizontal") {
      const y = Math.round(clamp(point.y, 1, bitmap.height - 1));
      horizontalLines = addUniqueLine(horizontalLines, y);
      cutHistory = [...cutHistory, { direction: "horizontal", value: y }];
      render();
    }
  }
}

async function applyToolToRegions(
  tool: EditorTool,
  source: ImageBitmap,
  regions: Rect[],
  settings: Record<string, number | string | boolean>
): Promise<HTMLCanvasElement> {
  if (tool.applyBatch) {
    return tool.applyBatch({ source, regions, settings });
  }

  let workingSource = source;
  let previousIntermediate: ImageBitmap | null = null;
  let result: HTMLCanvasElement | null = null;

  for (const region of regions) {
    result = tool.apply({ source: workingSource, region, settings: { ...settings } });

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
  pendingCutLine: PendingCutLine,
  gridSize: number
): void {
  const x = viewport.offsetX;
  const y = viewport.offsetY;
  const width = bitmap.width * viewport.scale;
  const height = bitmap.height * viewport.scale;

  context.save();
  drawGuideGrid(context, bitmap, viewport, gridSize);

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
    context.fillText(
      pendingCutLine === "vertical" ? "點擊圖片新增直線" : "點擊圖片新增橫線",
      x + 12,
      y + 24
    );
  }

  context.restore();
}

function drawGuideGrid(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  viewport: Viewport,
  gridSize: number
): void {
  const x = viewport.offsetX;
  const y = viewport.offsetY;
  const width = bitmap.width * viewport.scale;
  const height = bitmap.height * viewport.scale;
  const safeGridSize = clamp(Math.round(gridSize), 10, Math.max(bitmap.width, bitmap.height));

  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.22)";
  context.lineWidth = 1;
  context.setLineDash([]);

  for (let lineX = safeGridSize; lineX < bitmap.width; lineX += safeGridSize) {
    const canvasX = x + lineX * viewport.scale;
    context.beginPath();
    context.moveTo(canvasX, y);
    context.lineTo(canvasX, y + height);
    context.stroke();
  }

  for (let lineY = safeGridSize; lineY < bitmap.height; lineY += safeGridSize) {
    const canvasY = y + lineY * viewport.scale;
    context.beginPath();
    context.moveTo(x, canvasY);
    context.lineTo(x + width, canvasY);
    context.stroke();
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

function cropBitmap(bitmap: ImageBitmap, selection: Rect): HTMLCanvasElement {
  const rect = clampRect(selection, bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }
  context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return canvas;
}

function rotateBitmap(bitmap: ImageBitmap, degrees: 90 | -90): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.height;
  canvas.height = bitmap.width;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return canvas;
}

function flipBitmap(bitmap: ImageBitmap, axis: "horizontal" | "vertical"): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.save();
  if (axis === "horizontal") {
    context.translate(bitmap.width, 0);
    context.scale(-1, 1);
  } else {
    context.translate(0, bitmap.height);
    context.scale(1, -1);
  }
  context.drawImage(bitmap, 0, 0);
  context.restore();
  return canvas;
}

async function exportBitmap(bitmap: ImageBitmap, format: ExportFormat, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.drawImage(bitmap, 0, 0);
  return canvasToBlob(canvas, format, quality);
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  const mimeType = getMimeType(format);
  const normalizedQuality = Math.min(1, Math.max(0.4, quality / 100));
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not export image."));
      },
      mimeType,
      format === "png" ? undefined : normalizedQuality
    );
  });
}

async function bitmapToThumbnailUrl(bitmap: ImageBitmap): Promise<string> {
  const canvas = document.createElement("canvas");
  const maxWidth = 120;
  const maxHeight = 84;
  const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
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
      const blob = await canvasToBlob(canvas, "png", 100);
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

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function getFileExtension(format: ExportFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

function getBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "image";
  }
  return trimmed.replace(/\.[^/.]+$/, "") || "image";
}

function sanitizeFileName(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/\s+/g, "-") || "image";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadSettings(): UiSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return structuredClone(DEFAULT_SETTINGS);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    return {
      activeToolId: (parsed.activeToolId as ToolId) || DEFAULT_SETTINGS.activeToolId,
      strengthValues: {
        mosaic: parsed.strengthValues?.mosaic ?? DEFAULT_SETTINGS.strengthValues.mosaic,
        blur: parsed.strengthValues?.blur ?? DEFAULT_SETTINGS.strengthValues.blur
      },
      coverColor: parsed.coverColor ?? DEFAULT_SETTINGS.coverColor,
      exportFormat: (parsed.exportFormat as ExportFormat) || DEFAULT_SETTINGS.exportFormat,
      exportQuality: parsed.exportQuality ?? DEFAULT_SETTINGS.exportQuality,
      workspaceSize: parsed.workspaceSize ?? DEFAULT_SETTINGS.workspaceSize,
      gridSize: parsed.gridSize ?? DEFAULT_SETTINGS.gridSize,
      showGrid: parsed.showGrid ?? DEFAULT_SETTINGS.showGrid
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}
