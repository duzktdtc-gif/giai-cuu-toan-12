import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "katex/dist/katex.min.css";
import "./index.css";
import { loadRuntimeConfig } from "./lib/appConfig";

async function boot() {
  // config.js được nạp lúc chạy, trước khi App và sync được import,
  // để không cần biến môi trường lúc build.
  await loadRuntimeConfig();
  const [{ default: App }, { ErrorBoundary }] = await Promise.all([
    import("./App"),
    import("./components/ErrorBoundary"),
  ]);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

void boot();
