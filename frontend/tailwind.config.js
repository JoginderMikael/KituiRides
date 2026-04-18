/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0f766e",
          accent: "#f97316"
        }
      }
    }
  },
  plugins: []
};
