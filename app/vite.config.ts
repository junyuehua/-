import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  // svgr：`import Icon from 'xxx.svg?react'` 直接得到 React 组件（Material Symbols 图标走这条路）
  plugins: [react(), svgr()],
  // 支持 PORT 环境变量指定端口（多会话并行开 dev server 时由启动器分配，默认仍 5173）
  server: { port: Number(process.env.PORT) || 5173 },
})
