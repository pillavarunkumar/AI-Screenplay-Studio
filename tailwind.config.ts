import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
        screenplay: ["Courier New", "Courier", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
