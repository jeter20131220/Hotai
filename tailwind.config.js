/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{html,js,vue}",
    ],
    theme: {
        extend: {
            colors: {
                'custom-color': '#ea5413',  // 自定義顏色
                'brandRed': '#D61718',
              },
        },
    },
    plugins: [],
};