import "./styles.css";
import { ImageDocument } from "./core/imageDocument";
import { createEditorController } from "./ui/editorController";
import { mosaicTool } from "./tools/mosaicTool";

const canvas = document.querySelector<HTMLCanvasElement>("#imageCanvas");
const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
const canvasPanel = document.querySelector<HTMLElement>("#canvasPanel");
const dropZone = document.querySelector<HTMLElement>("#dropZone");
const emptyState = document.querySelector<HTMLElement>("#emptyState");
const mosaicTab = document.querySelector<HTMLButtonElement>("#mosaicTab");
const sliceTab = document.querySelector<HTMLButtonElement>("#sliceTab");
const mosaicPanel = document.querySelector<HTMLElement>("#mosaicPanel");
const slicePanel = document.querySelector<HTMLElement>("#slicePanel");
const cellSize = document.querySelector<HTMLInputElement>("#cellSize");
const cellSizeValue = document.querySelector<HTMLOutputElement>("#cellSizeValue");
const exportName = document.querySelector<HTMLInputElement>("#exportName");
const workspaceSize = document.querySelector<HTMLInputElement>("#workspaceSize");
const workspaceSizeValue = document.querySelector<HTMLOutputElement>("#workspaceSizeValue");
const selectionCount = document.querySelector<HTMLElement>("#selectionCount");
const showGrid = document.querySelector<HTMLInputElement>("#showGrid");
const gridSize = document.querySelector<HTMLInputElement>("#gridSize");
const gridSizeValue = document.querySelector<HTMLOutputElement>("#gridSizeValue");
const sliceCount = document.querySelector<HTMLElement>("#sliceCount");
const verticalLineCount = document.querySelector<HTMLElement>("#verticalLineCount");
const horizontalLineCount = document.querySelector<HTMLElement>("#horizontalLineCount");
const applyButton = document.querySelector<HTMLButtonElement>("#applyButton");
const clearSelectionButton = document.querySelector<HTMLButtonElement>("#clearSelectionButton");
const undoButton = document.querySelector<HTMLButtonElement>("#undoButton");
const resetButton = document.querySelector<HTMLButtonElement>("#resetButton");
const downloadButton = document.querySelector<HTMLButtonElement>("#downloadButton");
const addVerticalLineButton = document.querySelector<HTMLButtonElement>("#addVerticalLineButton");
const addHorizontalLineButton = document.querySelector<HTMLButtonElement>("#addHorizontalLineButton");
const undoCutLineButton = document.querySelector<HTMLButtonElement>("#undoCutLineButton");
const clearCutLinesButton = document.querySelector<HTMLButtonElement>("#clearCutLinesButton");
const downloadSlicesButton = document.querySelector<HTMLButtonElement>("#downloadSlicesButton");

if (
  !canvas ||
  !fileInput ||
  !canvasPanel ||
  !dropZone ||
  !emptyState ||
  !mosaicTab ||
  !sliceTab ||
  !mosaicPanel ||
  !slicePanel ||
  !cellSize ||
  !cellSizeValue ||
  !exportName ||
  !workspaceSize ||
  !workspaceSizeValue ||
  !selectionCount ||
  !showGrid ||
  !gridSize ||
  !gridSizeValue ||
  !sliceCount ||
  !verticalLineCount ||
  !horizontalLineCount ||
  !applyButton ||
  !clearSelectionButton ||
  !undoButton ||
  !resetButton ||
  !downloadButton ||
  !addVerticalLineButton ||
  !addHorizontalLineButton ||
  !undoCutLineButton ||
  !clearCutLinesButton ||
  !downloadSlicesButton
) {
  throw new Error("Missing editor elements.");
}

const documentState = new ImageDocument();

createEditorController({
  canvas,
  canvasPanel,
  dropZone,
  emptyState,
  mosaicTab,
  sliceTab,
  mosaicPanel,
  slicePanel,
  fileInput,
  cellSize,
  cellSizeValue,
  exportName,
  workspaceSize,
  workspaceSizeValue,
  selectionCount,
  showGrid,
  gridSize,
  gridSizeValue,
  sliceCount,
  verticalLineCount,
  horizontalLineCount,
  applyButton,
  clearSelectionButton,
  undoButton,
  resetButton,
  downloadButton,
  addVerticalLineButton,
  addHorizontalLineButton,
  undoCutLineButton,
  clearCutLinesButton,
  downloadSlicesButton,
  documentState,
  activeTool: mosaicTool
});
