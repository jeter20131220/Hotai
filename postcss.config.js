// postcss.config.js
import tailwindcss from 'tailwindcss';  // 使用 tailwindcss 插件
import autoprefixer from 'autoprefixer'; // 使用 autoprefixer 插件

export default {
    plugins: [
        tailwindcss(),   // 使用 tailwindcss
        autoprefixer(),  // 使用 autoprefixer
    ],
};