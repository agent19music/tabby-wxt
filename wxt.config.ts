import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    permissions: ["sidePanel", "storage", "tabs", "activeTab", "scripting","history","offscreen","webNavigation"],
    host_permissions: ["<all_urls>"],
  },
});
