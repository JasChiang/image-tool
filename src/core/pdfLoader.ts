import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const DEFAULT_DPI = 300;
const MAX_LONGEST_SIDE = 4500;

export interface PdfPageImage {
  pageNumber: number;
  totalPages: number;
  canvas: HTMLCanvasElement;
}

export async function loadPdf(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  const buffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  return task.promise;
}

export async function renderPdfPage(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  targetDpi = DEFAULT_DPI
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const longest = Math.max(baseViewport.width, baseViewport.height);
  const dpiScale = targetDpi / 72;
  const cappedScale = MAX_LONGEST_SIDE / longest;
  const scale = Math.max(1, Math.min(dpiScale, cappedScale));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport, canvas }).promise;
  page.cleanup();
  return canvas;
}

export async function canvasToFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("Canvas conversion failed.");
  }
  return new File([blob], fileName, { type: "image/png" });
}
