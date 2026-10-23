import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative asset paths let the same build work from any GitHub Pages URL.
export default defineConfig({
  base: './',
  plugins: [react()],
})
