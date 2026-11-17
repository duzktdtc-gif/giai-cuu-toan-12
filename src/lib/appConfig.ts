export interface AppConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  version?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

let configPromise: Promise<void> | null = null;

export function getAppConfig(): AppConfig {
  if (typeof window === "undefined") return {};
  return window.__APP_CONFIG__ ?? {};
}

export function appVersion(): string {
  return (getAppConfig().version ?? "dev").trim() || "dev";
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const config = getAppConfig();
  return {
    url: (config.supabaseUrl ?? "").trim().replace(/\/$/, ""),
    anonKey: (config.supabaseAnonKey ?? "").trim(),
  };
}

/** Nạp config.js lúc chạy để không cần biến môi trường khi build. */
export function loadRuntimeConfig(timeoutMs = 4000): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") return Promise.resolve();
  if (window.__APP_CONFIG__) return Promise.resolve();
  if (configPromise) return configPromise;

  configPromise = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = `${new URL("config.js", document.baseURI).href}?v=${Date.now()}`;
    script.async = true;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    script.onload = finish;
    script.onerror = finish;
    window.setTimeout(finish, timeoutMs);
    document.head.appendChild(script);
  });
  return configPromise;
}
