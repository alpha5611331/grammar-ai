import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The built page is loaded over file:// inside pywebview's WebView2 window, where the
// document origin is "null". Vite tags its emitted <script>/<link> with `crossorigin`,
// which forces a CORS check those null-origin requests fail - so the module can silently
// fail to execute. Strip the attribute since every asset is bundled locally (same-origin).
function stripCrossorigin(): Plugin {
  return {
    name: "strip-crossorigin",
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin/g, "");
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), stripCrossorigin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    outDir: "../app/ui/webview/web",
    emptyOutDir: true,
  },
});
