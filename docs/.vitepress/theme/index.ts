import DefaultTheme from 'vitepress/theme'
import './custom.css'
import CgChapter from './components/CgChapter.vue'
import QuoteWall from './components/QuoteWall.vue'
import ChapterIndex from './components/ChapterIndex.vue'
import SiteStats from './components/SiteStats.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CgChapter', CgChapter)
    app.component('QuoteWall', QuoteWall)
    app.component('ChapterIndex', ChapterIndex)
    app.component('SiteStats', SiteStats)
  }
}
