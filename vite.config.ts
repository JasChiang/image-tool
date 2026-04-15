import { defineConfig } from "vite";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

export default defineConfig({
  server: {
    headers: noStoreHeaders
  },
  preview: {
    headers: noStoreHeaders
  }
});
