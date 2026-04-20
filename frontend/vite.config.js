import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:8080/api";
  const backendOrigin = apiUrl.startsWith("http")
    ? apiUrl.replace(/\/api\/?$/, "")
    : "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/ws": {
          target: backendOrigin,
          changeOrigin: true,
          ws: true,
        },
        "/uploads": {
          target: backendOrigin,
          changeOrigin: true,
        },
      }
    },
    test: {
      environment: "jsdom"
    }
  };
});
