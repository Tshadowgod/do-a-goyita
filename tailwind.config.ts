import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff7ec",
          100: "#ffedd3",
          200: "#ffd8a8",
          300: "#ffc070",
          400: "#ffad52",
          500: "#ffa142",
          600: "#f08a1e",
          700: "#c66f12",
          800: "#9d5814",
          900: "#7e4815",
        },
      },
    },
  },
  plugins: [],
};

export default config;
