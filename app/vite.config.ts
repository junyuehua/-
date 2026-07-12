import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  // svgr：`import Icon from 'xxx.svg?react'` 直接得到 React 组件（Material Symbols 图标走这条路）
  plugins: [react(), svgr()],
})
