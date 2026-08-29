import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    entry: ['src/index.ts', 'src/router/index.ts', 'src/storage/index.ts', 'src/vite/index.ts'],
    dts: {
      tsgo: true,
    },
    exports: {
      customExports(exports: Record<string, unknown>) {
        exports['./client'] = { types: './client.d.ts' }
        return exports
      },
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    semi: false,
    singleQuote: true,
    arrowParens: 'avoid',
    quoteProps: 'consistent',
  },
})
