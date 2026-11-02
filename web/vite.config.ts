import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..', // 루트 .env 하나만 쓴다
  server: { port: 5180, strictPort: true }, // 다른 프로젝트(5173)와 겹치지 않게 고정
})
