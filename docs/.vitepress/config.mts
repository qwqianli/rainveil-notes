import { defineConfig } from 'vitepress'
import chapters from './data/chapters.json'

// 侧边栏章节列表从 chapters.json 生成：加章只改数据，不改这份配置。
// 标题规则与章节页 frontmatter 一致：有版本号则前缀「X.Y 」，版本待核就只显示章名。
const chapterItems = [...chapters]
  .sort((a, b) => a.order - b.order)
  .map((c) => ({
    text: (c.version ? c.version + ' ' : '') + c.zh,
    link: `/chapters/${c.id}`
  }))

/**
 * GitHub Pages 部署在子路径 qwqianli.github.io/rainveil-notes/ 下。
 * 本地 dev 用根路径，否则每次开服务都要手动加前缀。
 * 注意：`npm run preview` 读的是构建产物（已带前缀），访问时需加 /rainveil-notes/。
 */
const base = process.env.NODE_ENV === 'production' ? '/rainveil-notes/' : '/'

export default defineConfig({
  lang: 'zh-CN',
  title: '雨幕拾遗',
  description: '《重返未来：1999》台词赏析库 —— 每一句在说什么，为什么这样写',
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,

  /**
   * 防御性排除：docs/ 下任何内部文档目录都不许进构建。
   * 内部文档已物理移到项目根的 internal/（VitePress 不会扫到），
   * 这里再拦一层，防止以后有人把 dev/ 之类的目录建回 docs 下。
   */
  srcExclude: ['dev/**', 'internal/**'],

  base,

  sitemap: {
    hostname: 'https://qwqianli.github.io'
  },

  /**
   * favicon 必须在这里注入：head 里的静态数组不会自动加 base 前缀，
   * 写死 /favicon.svg 在子路径部署下会 404 —— 本地完全正常，只在线上出问题。
   */
  transformHead() {
    return [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
      ['link', { rel: 'mask-icon', href: `${base}favicon.svg`, color: '#c9a227' }]
    ]
  },

  head: [
    ['meta', { name: 'theme-color', content: '#faf5ec', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#0f1115', media: '(prefers-color-scheme: dark)' }],
    // 社交预览只用文字，不配置 og:image —— 任何预览图都等于再分发一次素材
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: '雨幕拾遗' }],
    ['meta', { property: 'og:title', content: '雨幕拾遗 · 《重返未来：1999》台词赏析库' }],
    [
      'meta',
      {
        property: 'og:description',
        content: '不是把剧情搬下来，而是回答每个句子在做什么。主线 16 章 299 帧文案，逐句赏析与章节典故溯源。'
      }
    ],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'author', content: 'Rainveil Notes contributors' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '章节', link: '/chapters/', activeMatch: '/chapters/' },
      { text: '句子墙', link: '/quotes' },
      {
        text: '关于',
        items: [
          { text: '项目说明', link: '/about/' },
          { text: '引用与出处', link: '/about/copyright' },
          { text: '贡献指南', link: '/about/contributing' }
        ]
      }
    ],

    sidebar: {
      '/chapters/': [
        {
          text: '开始',
          items: [{ text: '章节总览', link: '/chapters/' }]
        },
        {
          text: '章节',
          items: chapterItems
        },
        {
          text: '检索',
          items: [{ text: '句子墙', link: '/quotes' }]
        }
      ],
      '/about/': [
        {
          text: '关于',
          items: [
            { text: '项目说明', link: '/about/' },
            { text: '引用与出处', link: '/about/copyright' },
            { text: '贡献指南', link: '/about/contributing' }
          ]
        }
      ]
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索台词、角色、典故', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到相关条目',
            resetButtonTitle: '清除条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一章', next: '下一章' },
    darkModeSwitchLabel: '外观',
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    lastUpdatedText: '最后更新',

    footer: {
      message:
        '本项目为非营利性同人赏析集，仅摘引极短片段用于评论，不对原作构成替代。<br>《重返未来：1999》著作权归上海深蓝互动所有。',
      copyright: '文本解读以 CC BY-SA 4.0 授权'
    }
  }
})
