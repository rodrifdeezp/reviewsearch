/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          900: "#0a0f1c",
          800: "#111827",
          700: "#1f2937",
        },
        sand: {
          50: "#fbf7f1",
          100: "#f6efe5",
          200: "#efe3d4",
        },
        tide: {
          500: "#2b6cb0",
          600: "#245a91",
        },
        coral: {
          500: "#ef6b4a",
          600: "#d95a3b",
        },
      },
      boxShadow: {
        soft: "0 12px 30px -18px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [],
};
