<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'
import chaptersData from '../../data/chapters.json'
import cgData from '../../data/cg.json'
import notesData from '../../data/notes.json'

// 页面数字一律由三个数据文件现场算出，不再手写——加章、录帧、写赏析都不用回来改这句。
// notes.json 的键是帧 id，另有一个 `_meta` 键不是赏析，计数时排除。
const chapterCount = computed(() => chaptersData.length)
const frameCount = computed(() => cgData.length)
const noteCount = computed(
  () => Object.keys(notesData).filter((k) => k !== '_meta').length
)
</script>

<template>
  <!-- 与原 index.md 手写句一字不差，只把三个数字换成插值；链接手动加 base（markdown 链接语法在 .vue 里不生效） -->
  <p>已录入 <strong>{{ frameCount }} 帧</strong>（主线 {{ chapterCount }} 章全部），其中 {{ noteCount }} 条有赏析。数据已齐，赏析在慢写——更多背景见<a :href="withBase('/about/')">关于本项目</a>。</p>
</template>
