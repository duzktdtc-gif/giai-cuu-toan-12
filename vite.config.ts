import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages phục vụ tại /<repo>/, còn Vercel/Netlify phục vụ ở gốc.
  base: process.env.GITHUB_ACTIONS ? "/giai-cuu-toan-12/" : "/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
