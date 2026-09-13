// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import 'virtual:group-icons.css'
import './style.css'

import RouteDemo from '../components/RouteDemo.vue'
import StorageDemo from '../components/StorageDemo.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('RouteDemo', RouteDemo)
    app.component('StorageDemo', StorageDemo)
  },
} satisfies Theme
