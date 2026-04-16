export class ImageDocument {
  private original: ImageBitmap | null = null;
  private current: ImageBitmap | null = null;
  private history: ImageBitmap[] = [];
  private future: ImageBitmap[] = [];
  private readonly historyLimit = 20;

  get bitmap(): ImageBitmap | null {
    return this.current;
  }

  get originalBitmap(): ImageBitmap | null {
    return this.original;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
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
    this.future = [];
  }

  async replaceWith(canvas: HTMLCanvasElement): Promise<void> {
    if (!this.current) {
      return;
    }

    this.history.push(this.current);
    if (this.history.length > this.historyLimit) {
      const removed = this.history.shift();
      removed?.close();
    }
    this.future.forEach((bitmap) => bitmap.close());
    this.future = [];
    this.current = await createImageBitmap(canvas);
  }

  undo(): void {
    const previous = this.history.pop();

    if (!previous) {
      return;
    }

    if (this.current) {
      this.future.push(this.current);
    }
    if (this.future.length > this.historyLimit) {
      const removed = this.future.shift();
      removed?.close();
    }
    this.current = previous;
  }

  redo(): void {
    const next = this.future.pop();

    if (!next) {
      return;
    }

    if (this.current) {
      this.history.push(this.current);
      if (this.history.length > this.historyLimit) {
        const removed = this.history.shift();
        removed?.close();
      }
    }
    this.current = next;
  }

  async reset(): Promise<void> {
    if (!this.original) {
      return;
    }

    this.current?.close();
    this.current = await cloneBitmap(this.original);
    this.history.forEach((bitmap) => bitmap.close());
    this.future.forEach((bitmap) => bitmap.close());
    this.history = [];
    this.future = [];
  }

  private releaseAll(): void {
    this.original?.close();
    this.current?.close();
    this.history.forEach((bitmap) => bitmap.close());
    this.future.forEach((bitmap) => bitmap.close());
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
