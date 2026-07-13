import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 30081, // Set your desired port here
    host: true, // Allow external connections
    proxy: {
      "/api": {
        target: "http://210.94.179.18:30083",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (request) => request.removeHeader("origin"));
        },
      },
    },
    // open: true, // Automatically open browser
  },
});
