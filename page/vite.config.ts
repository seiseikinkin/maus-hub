import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: "/maus-hub/", // GitHub Pagesのベースパス
    server: {
        headers: {
            // COOP対策：ポップアップを許可する設定
            "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
            "Cross-Origin-Embedder-Policy": "unsafe-none",
        },
    },
    build: {
        outDir: "dist",
        sourcemap: false,
        assetsDir: "assets",
    },
});
