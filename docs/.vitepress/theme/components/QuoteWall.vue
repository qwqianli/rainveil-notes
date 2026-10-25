<script setup>
import { computed, ref } from 'vue'
import cgData from '../../data/cg.json'
import notesData from '../../data/notes.json'
import chaptersData from '../../data/chapters.json'

const keyword = ref('')
const activeTags = ref([])
const onlyAnnotated = ref(false)

const chapterMap = computed(() => {
  const m = {}
  for (const c of chaptersData) m[c.id] = c
  return m
})

/* 全部标签，按出现频次排序 */
const allTags = computed(() => {
  const count = {}
  for (const key of Object.keys(notesData)) {
    if (key === '_meta') continue
    const n = notesData[key]
    for (const t of n.tags || []) count[t] = (count[t] || 0) + 1
  }
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, n }))
})

const rows = computed(() => {
  return cgData.map((e) => {
    const n = notesData[e.id] || null
    const ch = chapterMap.value[e.chapter] || {}
    return { ...e, note: n, chapterZh: ch.zh, chapterEn: ch.en, version: ch.version }
  })
})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (onlyAnnotated.value && !r.note) return false
    if (activeTags.value.length) {
      const tags = r.note ? r.note.tags || [] : []
      if (!activeTags.value.every((t) => tags.includes(t))) return false
    }
    if (!kw) return true
    const hay = [
      r.text,
      r.zh,
      r.en,
      r.chapterZh,
      r.chapterEn,
      r.version || '',
      r.note ? r.note.reading : '',
      r.note ? r.note.device : '',
      r.note ? (r.note.tags || []).join(' ') : ''
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(kw)
  })
})

function toggleTag(t) {
  const i = activeTags.value.indexOf(t)
  if (i === -1) activeTags.value.push(t)
  else activeTags.value.splice(i, 1)
}

function reset() {
  keyword.value = ''
  activeTags.value = []
  onlyAnnotated.value = false
}
</script>

<template>
  <div class="rv-wall">
    <div class="rv-controls">
      <input
        v-model="keyword"
        class="rv-input"
        type="search"
        placeholder="搜索台词、标题、章节、解读关键词……"
      />
      <label class="rv-check">
        <input v-model="onlyAnnotated" type="checkbox" />
        <span>只看已解读</span>
      </label>
    </div>

    <div v-if="allTags.length" class="rv-tags">
      <button
        v-for="t in allTags"
        :key="t.name"
        :class="['rv-tag', { 'is-on': activeTags.includes(t.name) }]"
        @click="toggleTag(t.name)"
      >
        {{ t.name }}<em>{{ t.n }}</em>
      </button>
    </div>

    <div class="rv-summary">
      <span>命中 <b>{{ filtered.length }}</b> / {{ rows.length }} 条</span>
      <button v-if="keyword || activeTags.length || onlyAnnotated" class="rv-reset" @click="reset">
        清除条件
      </button>
    </div>

    <div class="rv-grid">
      <article
        v-for="r in filtered"
        :key="r.id"
        :class="['rv-card', { 'is-annotated': !!r.note }]"
      >
        <div class="rv-card-top">
          <span class="rv-meta-line">
            {{ r.chapterZh }}
            <template v-if="r.version"> · {{ r.version }}</template>
          </span>
          <span class="rv-no">{{ r.no }}</span>
        </div>

        <h4 class="rv-card-title">{{ r.zh }}</h4>

        <p class="rv-card-text">{{ r.text }}</p>

        <p v-if="r.note" class="rv-card-hint">
          <span class="rv-dot"></span>{{ r.note.device }}
        </p>
      </article>
    </div>

    <p v-if="!filtered.length" class="rv-none">没有匹配的条目，换个关键词试试。</p>
  </div>
</template>

<style scoped>
.rv-wall {
  margin: 24px 0 56px;
}

.rv-controls {
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}

.rv-input {
  flex: 1 1 300px;
  min-width: 0;
  padding: 9px 13px;
  font-size: 0.88rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  outline: none;
  transition: border-color 0.2s;
}

.rv-input:focus {
  border-color: var(--gold-dim);
}

.rv-input::placeholder {
  color: var(--vp-c-text-3);
}

.rv-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.rv-check input {
  accent-color: var(--gold);
  cursor: pointer;
}

.rv-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.rv-tag {
  padding: 3px 9px;
  font-size: 0.73rem;
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
  border-radius: 2px;
  background: transparent;
  transition: all 0.16s;
  letter-spacing: 0.03em;
}

.rv-tag em {
  font-style: normal;
  opacity: 0.5;
  margin-left: 4px;
  font-size: 0.66rem;
}

.rv-tag:hover {
  color: var(--vp-c-text-1);
  border-color: rgba(232, 226, 213, 0.24);
}

.rv-tag.is-on {
  color: var(--gold);
  border-color: var(--gold-dim);
  background: rgba(201, 162, 39, 0.1);
}

.rv-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.rv-summary b {
  color: var(--gold);
  font-weight: 600;
}

.rv-reset {
  font-size: 0.74rem;
  color: var(--vp-c-text-3);
  text-decoration: underline;
  text-underline-offset: 3px;
  background: none;
}

.rv-reset:hover {
  color: var(--gold);
}

/* ---------- 卡片 ---------- */
.rv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: 1px;
  background: var(--vp-c-divider);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 18px;
}

.rv-card {
  display: flex;
  flex-direction: column;
  padding: 16px 17px 18px;
  background: var(--vp-c-bg);
  transition: background 0.18s;
}

.rv-card:hover {
  background: var(--vp-c-bg-soft);
}

.rv-card.is-annotated {
  background: rgba(201, 162, 39, 0.035);
}

.rv-card.is-annotated:hover {
  background: rgba(201, 162, 39, 0.07);
}

.rv-card-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.rv-meta-line {
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.05em;
}

.rv-no {
  font-family: var(--rv-serif);
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.rv-card-title {
  margin: 0 0 8px;
  font-family: var(--rv-serif);
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.rv-card.is-annotated .rv-card-title {
  color: var(--vp-c-text-1);
}

.rv-card-text {
  margin: 0;
  font-family: var(--rv-serif);
  font-size: 0.96rem;
  line-height: 1.8;
  color: var(--vp-c-text-1);
  flex: 1;
}

.rv-card-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px 0 0;
  font-size: 0.7rem;
  color: var(--gold);
  opacity: 0.85;
  letter-spacing: 0.03em;
}

.rv-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--gold);
  flex-shrink: 0;
}

.rv-none {
  padding: 48px 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

@media (max-width: 640px) {
  .rv-grid {
    grid-template-columns: 1fr;
  }
}
</style>
