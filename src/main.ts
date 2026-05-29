import "./styles.css";
import { createEditorController } from "./ui/editorController";

const canvas = document.querySelector<HTMLCanvasElement>("#imageCanvas");
const fileInput = document.querySelector<HTMLInputElement>("#fileInput");
const helpButton = document.querySelector<HTMLButtonElement>("#helpButton");
const helpDialog = document.querySelector<HTMLDialogElement>("#helpDialog");
const helpCloseButton = document.querySelector<HTMLButtonElement>("#helpCloseButton");
const loadSampleButton = document.querySelector<HTMLButtonElement>("#loadSampleButton");
const canvasPanel = document.querySelector<HTMLElement>("#canvasPanel");
const dropZone = document.querySelector<HTMLElement>("#dropZone");
const emptyState = document.querySelector<HTMLElement>("#emptyState");
const editTab = document.querySelector<HTMLButtonElement>("#editTab");
const sliceTab = document.querySelector<HTMLButtonElement>("#sliceTab");
const editPanel = document.querySelector<HTMLElement>("#editPanel");
const slicePanel = document.querySelector<HTMLElement>("#slicePanel");
const imageList = document.querySelector<HTMLElement>("#imageList");
const stageTopbar = document.querySelector<HTMLElement>("#stageTopbar");
const activeImageMeta = document.querySelector<HTMLElement>("#activeImageMeta");
const rectModeButton = document.querySelector<HTMLButtonElement>("#rectModeButton");
const brushModeButton = document.querySelector<HTMLButtonElement>("#brushModeButton");
const polygonModeButton = document.querySelector<HTMLButtonElement>("#polygonModeButton");
const brushSizeGroup = document.querySelector<HTMLElement>("#brushSizeGroup");
const brushSize = document.querySelector<HTMLInputElement>("#brushSize");
const brushSizeValue = document.querySelector<HTMLOutputElement>("#brushSizeValue");
const polygonActions = document.querySelector<HTMLElement>("#polygonActions");
const finishPolygonButton = document.querySelector<HTMLButtonElement>("#finishPolygonButton");
const cancelPolygonButton = document.querySelector<HTMLButtonElement>("#cancelPolygonButton");
const mosaicToolButton = document.querySelector<HTMLButtonElement>("#mosaicToolButton");
const blurToolButton = document.querySelector<HTMLButtonElement>("#blurToolButton");
const blackoutToolButton = document.querySelector<HTMLButtonElement>("#blackoutToolButton");
const coverToolButton = document.querySelector<HTMLButtonElement>("#coverToolButton");
const effectStrengthLabel = document.querySelector<HTMLLabelElement>("#effectStrengthLabel");
const cellSize = document.querySelector<HTMLInputElement>("#cellSize");
const cellSizeValue = document.querySelector<HTMLOutputElement>("#cellSizeValue");
const effectHint = document.querySelector<HTMLElement>("#effectHint");
const effectStrengthGroup = document.querySelector<HTMLElement>("#effectStrengthGroup");
const coverColorGroup = document.querySelector<HTMLElement>("#coverColorGroup");
const coverColor = document.querySelector<HTMLInputElement>("#coverColor");
const eyedropperButton = document.querySelector<HTMLButtonElement>("#eyedropperButton");
const cropRatio = document.querySelector<HTMLSelectElement>("#cropRatio");
const copyToClipboardButton = document.querySelector<HTMLButtonElement>("#copyToClipboardButton");
const applyButtonLabel = document.querySelector<HTMLElement>("#applyButton .primary-action-label");
const watermarkText = document.querySelector<HTMLInputElement>("#watermarkText");
const watermarkPosition = document.querySelector<HTMLSelectElement>("#watermarkPosition");
const leaveNoTraceButton = document.querySelector<HTMLButtonElement>("#leaveNoTraceButton");
const logoInput = document.querySelector<HTMLInputElement>("#logoInput");
const logoPreview = document.querySelector<HTMLImageElement>("#logoPreview");
const logoPreviewRow = document.querySelector<HTMLElement>("#logoPreviewRow");
const logoClearButton = document.querySelector<HTMLButtonElement>("#logoClearButton");
const logoPosition = document.querySelector<HTMLSelectElement>("#logoPosition");
const logoSizePercent = document.querySelector<HTMLInputElement>("#logoSizePercent");
const logoSizeValue = document.querySelector<HTMLOutputElement>("#logoSizeValue");
const logoSafeArea = document.querySelector<HTMLInputElement>("#logoSafeArea");
const logoSafeAreaValue = document.querySelector<HTMLOutputElement>("#logoSafeAreaValue");
const logoSafeAreaUnit = document.querySelector<HTMLInputElement>("#logoSafeAreaUnit");
const logoSafeAreaUnitValue = document.querySelector<HTMLOutputElement>("#logoSafeAreaUnitValue");
const logoSafeAreaShow = document.querySelector<HTMLInputElement>("#logoSafeAreaShow");
const logoSafeAreaWarn = document.querySelector<HTMLElement>("#logoSafeAreaWarn");
const logoStatusHint = document.querySelector<HTMLElement>("#logoStatusHint");
const applyLogoButton = document.querySelector<HTMLButtonElement>("#applyLogoButton");
const applyLogoAllButton = document.querySelector<HTMLButtonElement>("#applyLogoAllButton");
const applyScopeRow = document.querySelector<HTMLElement>("#applyScopeRow");
const applyToAllImagesToggle = document.querySelector<HTMLInputElement>("#applyToAllImagesToggle");
const measureXButton = document.querySelector<HTMLButtonElement>("#measureXButton");
const measureXDialog = document.querySelector<HTMLDialogElement>("#measureXDialog");
const measureXCloseButton = document.querySelector<HTMLButtonElement>("#measureXCloseButton");
const measureCanvas = document.querySelector<HTMLCanvasElement>("#measureCanvas");
const measureResult = document.querySelector<HTMLElement>("#measureResult");
const measureResetButton = document.querySelector<HTMLButtonElement>("#measureResetButton");
const measureApplyButton = document.querySelector<HTMLButtonElement>("#measureApplyButton");
const autoDetectButton = document.querySelector<HTMLButtonElement>("#autoDetectButton");
const zoomControls = document.querySelector<HTMLElement>("#zoomControls");
const zoomOutButton = document.querySelector<HTMLButtonElement>("#zoomOutButton");
const zoomInButton = document.querySelector<HTMLButtonElement>("#zoomInButton");
const zoomResetButton = document.querySelector<HTMLButtonElement>("#zoomResetButton");
const zoomLevelText = document.querySelector<HTMLElement>("#zoomLevelText");
const panHint = document.querySelector<HTMLElement>("#panHint");
const exportName = document.querySelector<HTMLInputElement>("#exportName");
const exportFormat = document.querySelector<HTMLSelectElement>("#exportFormat");
const exportQuality = document.querySelector<HTMLInputElement>("#exportQuality");
const exportQualityValue = document.querySelector<HTMLOutputElement>("#exportQualityValue");
const workspaceSize = document.querySelector<HTMLInputElement>("#workspaceSize");
const workspaceSizeValue = document.querySelector<HTMLOutputElement>("#workspaceSizeValue");
const selectionCount = document.querySelector<HTMLElement>("#selectionCount");
const selectionSummary = document.querySelector<HTMLElement>("#selectionSummary");
const selectionList = document.querySelector<HTMLElement>("#selectionList");
const selectionListPanel = document.querySelector<HTMLElement>("#selectionListPanel");
const compareToggle = document.querySelector<HTMLInputElement>("#compareToggle");
const cropButton = document.querySelector<HTMLButtonElement>("#cropButton");
const rotateLeftButton = document.querySelector<HTMLButtonElement>("#rotateLeftButton");
const rotateRightButton = document.querySelector<HTMLButtonElement>("#rotateRightButton");
const flipHorizontalButton = document.querySelector<HTMLButtonElement>("#flipHorizontalButton");
const flipVerticalButton = document.querySelector<HTMLButtonElement>("#flipVerticalButton");
const templatePreset = document.querySelector<HTMLSelectElement>("#templatePreset");
const templateFillMode = document.querySelector<HTMLSelectElement>("#templateFillMode");
const applyTemplateButton = document.querySelector<HTMLButtonElement>("#applyTemplateButton");
const applyTemplateAllButton = document.querySelector<HTMLButtonElement>("#applyTemplateAllButton");
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
  !helpButton ||
  !helpDialog ||
  !helpCloseButton ||
  !loadSampleButton ||
  !canvasPanel ||
  !dropZone ||
  !emptyState ||
  !editTab ||
  !sliceTab ||
  !editPanel ||
  !slicePanel ||
  !imageList ||
  !stageTopbar ||
  !activeImageMeta ||
  !rectModeButton ||
  !brushModeButton ||
  !polygonModeButton ||
  !brushSizeGroup ||
  !brushSize ||
  !brushSizeValue ||
  !polygonActions ||
  !finishPolygonButton ||
  !cancelPolygonButton ||
  !mosaicToolButton ||
  !blurToolButton ||
  !blackoutToolButton ||
  !coverToolButton ||
  !effectStrengthLabel ||
  !effectStrengthGroup ||
  !eyedropperButton ||
  !cropRatio ||
  !copyToClipboardButton ||
  !applyButtonLabel ||
  !watermarkText ||
  !watermarkPosition ||
  !leaveNoTraceButton ||
  !logoInput ||
  !logoPreview ||
  !logoPreviewRow ||
  !logoClearButton ||
  !logoPosition ||
  !logoSizePercent ||
  !logoSizeValue ||
  !logoSafeArea ||
  !logoSafeAreaValue ||
  !logoSafeAreaUnit ||
  !logoSafeAreaUnitValue ||
  !logoSafeAreaShow ||
  !logoSafeAreaWarn ||
  !logoStatusHint ||
  !applyLogoButton ||
  !applyLogoAllButton ||
  !applyScopeRow ||
  !applyToAllImagesToggle ||
  !measureXButton ||
  !measureXDialog ||
  !measureXCloseButton ||
  !measureCanvas ||
  !measureResult ||
  !measureResetButton ||
  !measureApplyButton ||
  !autoDetectButton ||
  !zoomControls ||
  !zoomOutButton ||
  !zoomInButton ||
  !zoomResetButton ||
  !zoomLevelText ||
  !panHint ||
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
  !selectionListPanel ||
  !compareToggle ||
  !cropButton ||
  !rotateLeftButton ||
  !rotateRightButton ||
  !flipHorizontalButton ||
  !flipVerticalButton ||
  !templatePreset ||
  !templateFillMode ||
  !applyTemplateButton ||
  !applyTemplateAllButton ||
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
  helpButton,
  helpDialog,
  helpCloseButton,
  loadSampleButton,
  canvasPanel,
  dropZone,
  emptyState,
  editTab,
  sliceTab,
  editPanel,
  slicePanel,
  imageList,
  stageTopbar,
  activeImageMeta,
  rectModeButton,
  brushModeButton,
  polygonModeButton,
  brushSizeGroup,
  brushSize,
  brushSizeValue,
  polygonActions,
  finishPolygonButton,
  cancelPolygonButton,
  mosaicToolButton,
  blurToolButton,
  blackoutToolButton,
  coverToolButton,
  effectStrengthLabel,
  effectStrengthGroup,
  eyedropperButton,
  cropRatio,
  copyToClipboardButton,
  applyButtonLabel,
  watermarkText,
  watermarkPosition,
  leaveNoTraceButton,
  logoInput,
  logoPreview,
  logoPreviewRow,
  logoClearButton,
  logoPosition,
  logoSizePercent,
  logoSizeValue,
  logoSafeArea,
  logoSafeAreaValue,
  logoSafeAreaUnit,
  logoSafeAreaUnitValue,
  logoSafeAreaShow,
  logoSafeAreaWarn,
  logoStatusHint,
  applyLogoButton,
  applyLogoAllButton,
  applyScopeRow,
  applyToAllImagesToggle,
  measureXButton,
  measureXDialog,
  measureXCloseButton,
  measureCanvas,
  measureResult,
  measureResetButton,
  measureApplyButton,
  autoDetectButton,
  zoomControls,
  zoomOutButton,
  zoomInButton,
  zoomResetButton,
  zoomLevelText,
  panHint,
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
  selectionListPanel,
  compareToggle,
  cropButton,
  rotateLeftButton,
  rotateRightButton,
  flipHorizontalButton,
  flipVerticalButton,
  templatePreset,
  templateFillMode,
  applyTemplateButton,
  applyTemplateAllButton,
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
