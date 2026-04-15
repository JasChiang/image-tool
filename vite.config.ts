import { defineConfig } from "vite";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/image-tool/" : "/",
  server: {
    headers: noStoreHeaders
  },
  preview: {
    headers: noStoreHeaders
  }
});
