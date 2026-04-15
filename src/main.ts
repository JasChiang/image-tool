import "./styles.css";
import { ImageDocument } from "./core/imageDocument";
import { createEditorController } from "./ui/editorController";
import { mosaicTool } from "./tools/mosaicTool";

const canvas = document.querySelector<HTMLCanvasElement>("#imageCanvas");
const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
const dropZone = document.querySelector<HTMLElement>("#dropZone");
const emptyState = document.querySelector<HTMLElement>("#emptyState");
const cellSize = document.querySelector<HTMLInputElement>("#cellSize");
const cellSizeValue = document.querySelector<HTMLOutputElement>("#cellSizeValue");
const exportName = document.querySelector<HTMLInputElement>("#exportName");
const selectionCount = document.querySelector<HTMLElement>("#selectionCount");
const applyButton = document.querySelector<HTMLButtonElement>("#applyButton");
const clearSelectionButton = document.querySelector<HTMLButtonElement>("#clearSelectionButton");
const undoButton = document.querySelector<HTMLButtonElement>("#undoButton");
const resetButton = document.querySelector<HTMLButtonElement>("#resetButton");
const downloadButton = document.querySelector<HTMLButtonElement>("#downloadButton");

if (
  !canvas ||
  !fileInput ||
  !dropZone ||
  !emptyState ||
  !cellSize ||
  !cellSizeValue ||
  !exportName ||
  !selectionCount ||
  !applyButton ||
  !clearSelectionButton ||
  !undoButton ||
  !resetButton ||
  !downloadButton
) {
  throw new Error("Missing editor elements.");
}

const documentState = new ImageDocument();

createEditorController({
  canvas,
  dropZone,
  emptyState,
  fileInput,
  cellSize,
  cellSizeValue,
  exportName,
  selectionCount,
  applyButton,
  clearSelectionButton,
  undoButton,
  resetButton,
  downloadButton,
  documentState,
  activeTool: mosaicTool
});
