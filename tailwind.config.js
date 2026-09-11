/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Helvetica", "Arial", '"Apple Color Emoji"', '"Segoe UI Emoji"'],
        serif: ["Fraunces", "ui-serif", "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      },
      borderRadius: {
        "4xl": "1.75rem",
        "5xl": "2.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.16)",
        card: "0 1px 1px rgb(15 23 42 / 0.04), 0 10px 30px -14px rgb(15 23 42 / 0.22), 0 32px 60px -40px rgb(15 23 42 / 0.28)",
        lift: "0 2px 4px rgb(15 23 42 / 0.05), 0 18px 40px -16px rgb(15 23 42 / 0.26), 0 40px 80px -50px rgb(15 23 42 / 0.35)",
        glow: "0 10px 30px -10px rgb(14 165 233 / 0.55)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        riseIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        rise: "riseIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "float-slow": "floatSlow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
