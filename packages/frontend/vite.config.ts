import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // /api 요청을 백엔드(4000)로 프록시
      "/api": "http://localhost:4000",
    },
  },
});
