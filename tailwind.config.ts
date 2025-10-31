import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

export default {
  content: ["./entrypoints/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
        manrope: ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
