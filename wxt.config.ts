import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    permissions: ["sidePanel", "history","scripting","activeTab"],
    host_permissions: ["https://*/*","http://*/*"],
    side_panel: {
      default_path: "sidepanel.html",
    },
  },
});
