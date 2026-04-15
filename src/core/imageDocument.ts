export class ImageDocument {
  private original: ImageBitmap | null = null;
  private current: ImageBitmap | null = null;
  private history: ImageBitmap[] = [];

  get bitmap(): ImageBitmap | null {
    return this.current;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  get hasImage(): boolean {
    return this.current !== null;
  }

  async load(file: File): Promise<void> {
    const bitmap = await createImageBitmap(file);
    this.releaseAll();
    this.original = bitmap;
    this.current = await cloneBitmap(bitmap);
    this.history = [];
  }

  async replaceWith(canvas: HTMLCanvasElement): Promise<void> {
    if (!this.current) {
      return;
    }

    this.history.push(this.current);
    this.current = await createImageBitmap(canvas);
  }

  undo(): void {
    const previous = this.history.pop();

    if (!previous) {
      return;
    }

    this.current?.close();
    this.current = previous;
  }

  async reset(): Promise<void> {
    if (!this.original) {
      return;
    }

    this.current?.close();
    this.current = await cloneBitmap(this.original);
    this.history.forEach((bitmap) => bitmap.close());
    this.history = [];
  }

  private releaseAll(): void {
    this.original?.close();
    this.current?.close();
    this.history.forEach((bitmap) => bitmap.close());
  }
}

async function cloneBitmap(source: ImageBitmap): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not supported.");
  }

  context.drawImage(source, 0, 0);
  return createImageBitmap(canvas);
}
