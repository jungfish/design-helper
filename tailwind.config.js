/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        creme: "#F4F1EA",
        bleu: "#b8c9d0",
        sauge: "#A8B5A2",
        bois: "#CDAA73",
        beurre: "#FCF8D5",
        ocre: "#D8B16A",
        olive: "#B7C3A5",
        ciel: "#DCE8ED",
        lin: "#E9DFC8",
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
