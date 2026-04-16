# 圖片工具

一個純前端的圖片處理工具。圖片只會在瀏覽器本機處理，不會上傳到伺服器，可直接部署在 GitHub Pages。

GitHub Pages: https://jaschiang.github.io/image-tool/

## 功能

- 上傳或拖放多張圖片，逐張切換編輯
- 在圖片上連續拖曳框選多個指定區域
- 提供馬賽克、模糊、黑條、純色遮蓋四種局部效果
- 顯示選區清單，可刪除單一選區、刪除最後一個或清除全部
- 支援逐步復原、重做、重置圖片
- 提供裁切、旋轉、水平翻轉、垂直翻轉
- 可切換原圖比較
- 可選擇 PNG / JPEG / WebP 輸出格式與品質
- 可下載目前圖片，或把所有已載入圖片批次打包成 ZIP
- 切換到切版分頁後，可新增橫線與直線並下載切片 ZIP
- 保留工具與輸出設定在本機瀏覽器

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

目前的遮蔽工具集中在 `src/tools`。控制器會用同一套選區流程套用不同效果，後續如果要再往前走，最適合補的是筆刷選取、多邊形選取、社群尺寸模板和 IndexedDB 草稿保存。
