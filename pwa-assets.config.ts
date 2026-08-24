import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, 'favicon.ico']],
    },
    maskable: {
      sizes: [512],
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: '#BA0C2F' },
    },
    apple: {
      sizes: [180],
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: '#ffffff' },
    },
  },
  images: ['public/brand/logo.svg'],
})
