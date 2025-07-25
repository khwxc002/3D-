import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import AutoImport from 'unplugin-auto-import/vite'
// import createStorage from 'web-localstorage-plus'

// const storage = createStorage({
//   rootName: 'spp-storage'
// })
// 使用示例：
// storage.setItem('key', 'value') // 存储
// const data = storage.getItem('key') // 读取

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router'], // 自动导入Vue和Vue Router相关API
      dts: 'src/auto-imports.d.ts' // 生成自动导入的声明文件
    }),
    // {
    //   name: 'configure-storage',
    //   configureServer() {
    //     createStorage({ rootName: 'spp-storage' })
    //   }
    // }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        additionalData: `@import "@/styles/variables.less";` // 可选全局变量
      }
    }
  },
  server: {
    proxy: {
      "/api": {
        target: "http url",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ""),
      },
    },
  },
})