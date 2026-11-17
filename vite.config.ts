import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Dùng đường dẫn tương đối để chạy được cả GitHub Pages (/<repo>/) và tên miền gốc.
  base: "./",
  plugins: [react(), tailwindcss()],
});
