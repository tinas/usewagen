import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

const src = (path: string) => fileURLToPath(new URL(`../../src/${path}`, import.meta.url))

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'usewagen',
  description: 'Reactive state for URL and storage in Vue.',

  cleanUrls: true,

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'How It Works', link: '/guide/how-it-works' },
          ],
        },
        {
          text: 'Composables',
          items: [
            { text: 'Route State', link: '/guide/route-state' },
            { text: 'Storage State', link: '/guide/storage-state' },
          ],
        },
        {
          text: 'Concepts',
          items: [
            { text: 'Parsers', link: '/guide/parsers' },
            { text: 'Reactive Options', link: '/guide/reactive-options' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Storage Instances', link: '/guide/storage-instances' },
            { text: 'Vite Plugin', link: '/guide/vite-plugin' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [{ text: 'Overview', link: '/api/' }],
        },
        {
          text: 'usewagen',
          items: [
            { text: 'Instance', link: '/api/wagen' },
            { text: 'Parsers', link: '/api/parsers' },
          ],
        },
        {
          text: 'usewagen/router',
          items: [{ text: 'Router', link: '/api/router' }],
        },
        {
          text: 'usewagen/storage',
          items: [
            { text: 'Storage', link: '/api/storage' },
            { text: 'Storage Instances', link: '/api/storage-instances' },
          ],
        },
        {
          text: 'usewagen/vite',
          items: [{ text: 'Vite Plugin', link: '/api/vite' }],
        },
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Pagination', link: '/examples/' },
            { text: 'Filters', link: '/examples/filters' },
            { text: 'Tabs', link: '/examples/tabs' },
            { text: 'Preferences', link: '/examples/preferences' },
            { text: 'Form draft', link: '/examples/form-draft' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/tinas/usewagen' }],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/tinas/usewagen/edit/main/docs/:path',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Ahmet Tinastepe',
    },
  },
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Ahmet Tinastepe' }],
    ['meta', { property: 'og:title', content: 'usewagen' }],
    ['meta', { property: 'og:description', content: 'Reactive state for URL and storage in Vue.' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:creator', content: '@tinasdev' }],
    [
      'meta',
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
    ],
  ],
  markdown: {
    theme: {
      dark: 'one-dark-pro',
      light: 'github-light',
    },

    config(md) {
      md.use(groupIconMdPlugin)
    },
  },
  vite: {
    plugins: [groupIconVitePlugin()],
    resolve: {
      dedupe: ['vue', 'vue-router'],
      alias: {
        'usewagen/router': src('router/index.ts'),
        'usewagen/storage': src('storage/index.ts'),
        'usewagen': src('index.ts'),
      },
    },
  },
})
