import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, "index.html"),
                background: resolve(__dirname, "src/background/background.ts"),
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    return chunkInfo.name === "background" ? "background.js" : "[name].js";
                },
            },
        },
        outDir: "dist",
        emptyOutDir: true,
    },
    publicDir: "public",
});
