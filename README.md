# 圖片工具

一個純前端的圖片處理工具。圖片只會在瀏覽器本機處理，不會上傳到伺服器。

## 功能

- 上傳或拖放圖片
- 在圖片上連續拖曳框選多個指定區域
- 調整馬賽克格子大小
- 一次套用全部選取區域
- 清除選取、復原、重置
- 下載 PNG
- 切換到切版分頁後，可新增橫線與直線並下載切片 ZIP

## 開發

```bash
npm install
npm run dev
```

## 擴充方式

工具邏輯集中在 `src/tools`。新增工具時實作 `EditorTool`：

```ts
export type EditorTool = {
  id: string;
  label: string;
  apply(context: ToolContext): HTMLCanvasElement;
};
```

目前的 `mosaicTool` 是第一個工具。未來可以用同一個介面加入模糊、塗黑、遮色、筆刷選取或多邊形選取。
