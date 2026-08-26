import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// The Go API used to be a separate `app` container; it is now a sibling
// process on loopback inside the all-in-one container.
const apiTarget = process.env.VITE_PROXY_TARGET || "http://127.0.0.1:8090";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 8080
  }
});
