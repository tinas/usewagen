import { defineConfig } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'usewagen',
  description: 'Reactive state for URL and storage in Vue.',

  cleanUrls: true,

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Examples', link: '/examples/', activeMatch: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
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

      '/examples/': [],
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
  },
})
