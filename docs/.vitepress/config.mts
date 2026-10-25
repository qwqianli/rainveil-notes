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

export default defineConfig({
  lang: 'zh-CN',
  title: '雨幕拾遗',
  description: '《重返未来：1999》台词赏析库 —— 每一句在说什么，为什么这样写',
  cleanUrls: true,
  lastUpdated: true,
  appearance: 'dark',

  head: [
    ['meta', { name: 'theme-color', content: '#0f1115' }],
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
