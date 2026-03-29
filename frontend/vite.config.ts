import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5176, // 固定前端端口为 5176
    strictPort: true, // 端口被占用时直接报错，不自动切换其他端口
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // 不要重写路径，保留 /api 前缀
      },
    },
  },
  logLevel: 'info', // 设置日志级别
  clearScreen: false, // 不清空控制台以便查看完整日志
  build: {
    sourcemap: true, // 生成 source map 以便调试
  },
  // 🔧 强制禁用缓存 - 开发环境使用
  cacheDir: '.vite_cache_disabled_' + Date.now(), // 使用时间戳确保每次都是新目录
  optimizeDeps: {
    force: true, // 强制预构建依赖
    include: ['@ant-design/charts'], // 强制包含图表库
  },
})