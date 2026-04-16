import "./styles.css";
import { createEditorController } from "./ui/editorController";

const canvas = document.querySelector<HTMLCanvasElement>("#imageCanvas");
const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
const canvasPanel = document.querySelector<HTMLElement>("#canvasPanel");
const dropZone = document.querySelector<HTMLElement>("#dropZone");
const emptyState = document.querySelector<HTMLElement>("#emptyState");
const editTab = document.querySelector<HTMLButtonElement>("#editTab");
const sliceTab = document.querySelector<HTMLButtonElement>("#sliceTab");
const editPanel = document.querySelector<HTMLElement>("#editPanel");
const slicePanel = document.querySelector<HTMLElement>("#slicePanel");
const imageList = document.querySelector<HTMLElement>("#imageList");
const activeImageMeta = document.querySelector<HTMLElement>("#activeImageMeta");
const mosaicToolButton = document.querySelector<HTMLButtonElement>("#mosaicToolButton");
const blurToolButton = document.querySelector<HTMLButtonElement>("#blurToolButton");
const blackoutToolButton = document.querySelector<HTMLButtonElement>("#blackoutToolButton");
const coverToolButton = document.querySelector<HTMLButtonElement>("#coverToolButton");
const effectStrengthLabel = document.querySelector<HTMLLabelElement>("#effectStrengthLabel");
const cellSize = document.querySelector<HTMLInputElement>("#cellSize");
const cellSizeValue = document.querySelector<HTMLOutputElement>("#cellSizeValue");
const effectHint = document.querySelector<HTMLElement>("#effectHint");
const coverColorGroup = document.querySelector<HTMLElement>("#coverColorGroup");
const coverColor = document.querySelector<HTMLInputElement>("#coverColor");
const exportName = document.querySelector<HTMLInputElement>("#exportName");
const exportFormat = document.querySelector<HTMLSelectElement>("#exportFormat");
const exportQuality = document.querySelector<HTMLInputElement>("#exportQuality");
const exportQualityValue = document.querySelector<HTMLOutputElement>("#exportQualityValue");
const workspaceSize = document.querySelector<HTMLInputElement>("#workspaceSize");
const workspaceSizeValue = document.querySelector<HTMLOutputElement>("#workspaceSizeValue");
const selectionCount = document.querySelector<HTMLElement>("#selectionCount");
const selectionSummary = document.querySelector<HTMLElement>("#selectionSummary");
const selectionList = document.querySelector<HTMLElement>("#selectionList");
const compareToggle = document.querySelector<HTMLInputElement>("#compareToggle");
const cropButton = document.querySelector<HTMLButtonElement>("#cropButton");
const rotateLeftButton = document.querySelector<HTMLButtonElement>("#rotateLeftButton");
const rotateRightButton = document.querySelector<HTMLButtonElement>("#rotateRightButton");
const flipHorizontalButton = document.querySelector<HTMLButtonElement>("#flipHorizontalButton");
const flipVerticalButton = document.querySelector<HTMLButtonElement>("#flipVerticalButton");
const showGrid = document.querySelector<HTMLInputElement>("#showGrid");
const gridSize = document.querySelector<HTMLInputElement>("#gridSize");
const gridSizeValue = document.querySelector<HTMLOutputElement>("#gridSizeValue");
const sliceCount = document.querySelector<HTMLElement>("#sliceCount");
const verticalLineCount = document.querySelector<HTMLElement>("#verticalLineCount");
const horizontalLineCount = document.querySelector<HTMLElement>("#horizontalLineCount");
const applyButton = document.querySelector<HTMLButtonElement>("#applyButton");
const removeLastSelectionButton = document.querySelector<HTMLButtonElement>("#removeLastSelectionButton");
const clearSelectionButton = document.querySelector<HTMLButtonElement>("#clearSelectionButton");
const undoButton = document.querySelector<HTMLButtonElement>("#undoButton");
const redoButton = document.querySelector<HTMLButtonElement>("#redoButton");
const resetButton = document.querySelector<HTMLButtonElement>("#resetButton");
const downloadButton = document.querySelector<HTMLButtonElement>("#downloadButton");
const downloadAllButton = document.querySelector<HTMLButtonElement>("#downloadAllButton");
const addVerticalLineButton = document.querySelector<HTMLButtonElement>("#addVerticalLineButton");
const addHorizontalLineButton = document.querySelector<HTMLButtonElement>("#addHorizontalLineButton");
const undoCutLineButton = document.querySelector<HTMLButtonElement>("#undoCutLineButton");
const clearCutLinesButton = document.querySelector<HTMLButtonElement>("#clearCutLinesButton");
const downloadSlicesButton = document.querySelector<HTMLButtonElement>("#downloadSlicesButton");
const processingStatus = document.querySelector<HTMLElement>("#processingStatus");

if (
  !canvas ||
  !fileInput ||
  !canvasPanel ||
  !dropZone ||
  !emptyState ||
  !editTab ||
  !sliceTab ||
  !editPanel ||
  !slicePanel ||
  !imageList ||
  !activeImageMeta ||
  !mosaicToolButton ||
  !blurToolButton ||
  !blackoutToolButton ||
  !coverToolButton ||
  !effectStrengthLabel ||
  !cellSize ||
  !cellSizeValue ||
  !effectHint ||
  !coverColorGroup ||
  !coverColor ||
  !exportName ||
  !exportFormat ||
  !exportQuality ||
  !exportQualityValue ||
  !workspaceSize ||
  !workspaceSizeValue ||
  !selectionCount ||
  !selectionSummary ||
  !selectionList ||
  !compareToggle ||
  !cropButton ||
  !rotateLeftButton ||
  !rotateRightButton ||
  !flipHorizontalButton ||
  !flipVerticalButton ||
  !showGrid ||
  !gridSize ||
  !gridSizeValue ||
  !sliceCount ||
  !verticalLineCount ||
  !horizontalLineCount ||
  !applyButton ||
  !removeLastSelectionButton ||
  !clearSelectionButton ||
  !undoButton ||
  !redoButton ||
  !resetButton ||
  !downloadButton ||
  !downloadAllButton ||
  !addVerticalLineButton ||
  !addHorizontalLineButton ||
  !undoCutLineButton ||
  !clearCutLinesButton ||
  !downloadSlicesButton ||
  !processingStatus
) {
  throw new Error("Missing editor elements.");
}

createEditorController({
  canvas,
  fileInput,
  canvasPanel,
  dropZone,
  emptyState,
  editTab,
  sliceTab,
  editPanel,
  slicePanel,
  imageList,
  activeImageMeta,
  mosaicToolButton,
  blurToolButton,
  blackoutToolButton,
  coverToolButton,
  effectStrengthLabel,
  cellSize,
  cellSizeValue,
  effectHint,
  coverColorGroup,
  coverColor,
  exportName,
  exportFormat,
  exportQuality,
  exportQualityValue,
  workspaceSize,
  workspaceSizeValue,
  selectionCount,
  selectionSummary,
  selectionList,
  compareToggle,
  cropButton,
  rotateLeftButton,
  rotateRightButton,
  flipHorizontalButton,
  flipVerticalButton,
  showGrid,
  gridSize,
  gridSizeValue,
  sliceCount,
  verticalLineCount,
  horizontalLineCount,
  applyButton,
  removeLastSelectionButton,
  clearSelectionButton,
  undoButton,
  redoButton,
  resetButton,
  downloadButton,
  downloadAllButton,
  addVerticalLineButton,
  addHorizontalLineButton,
  undoCutLineButton,
  clearCutLinesButton,
  downloadSlicesButton,
  processingStatus
});
