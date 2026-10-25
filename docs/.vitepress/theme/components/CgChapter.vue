<script setup>
import { computed, ref } from 'vue'
import cgData from '../../data/cg.json'
import notesData from '../../data/notes.json'
import chaptersData from '../../data/chapters.json'

const props = defineProps({
  chapter: { type: String, required: true }
})

const onlyAnnotated = ref(false)

const meta = computed(() => chaptersData.find((c) => c.id === props.chapter))

const entries = computed(() =>
  cgData
    .filter((e) => e.chapter === props.chapter)
    .sort((a, b) => a.no - b.no)
)

const annotatedCount = computed(
  () => entries.value.filter((e) => notesData[e.id]).length
)

const visible = computed(() =>
  onlyAnnotated.value ? entries.value.filter((e) => notesData[e.id]) : entries.value
)

function noteOf(id) {
  return notesData[id] || null
}

function pad(n) {
  return String(n).padStart(3, '0')
}
</script>

<template>
  <div class="rv-chapter">
    <div class="rv-bar">
      <div class="rv-bar-left">
        <span class="rv-num">{{ entries.length }}</span>
        <span class="rv-lab">帧</span>
        <span class="rv-sep">/</span>
        <span class="rv-num rv-num--gold">{{ annotatedCount }}</span>
        <span class="rv-lab">已解读</span>
      </div>
      <div class="rv-toggle">
        <button
          :class="['rv-btn', { 'is-on': !onlyAnnotated }]"
          @click="onlyAnnotated = false"
        >
          全部
        </button>
        <button
          :class="['rv-btn', { 'is-on': onlyAnnotated }]"
          @click="onlyAnnotated = true"
        >
          只看已解读
        </button>
      </div>
    </div>

    <div class="rv-list">
      <article
        v-for="e in visible"
        :key="e.id"
        :id="e.id"
        :class="['rv-item', { 'is-annotated': !!noteOf(e.id) }]"
      >
        <div class="rv-frame">
          <span class="rv-frame-no">{{ pad(e.no) }}</span>
        </div>

        <div class="rv-content">
          <header class="rv-head">
            <h3 class="rv-title">{{ e.zh }}</h3>
            <span class="rv-en">{{ e.en }}</span>
          </header>

          <p class="rv-text">{{ e.text }}</p>

          <div v-if="noteOf(e.id)" class="rv-note">
            <p class="rv-reading">{{ noteOf(e.id).reading }}</p>
            <div class="rv-meta">
              <span class="rv-chip rv-chip--gold">{{ noteOf(e.id).device }}</span>
              <span v-for="t in noteOf(e.id).tags" :key="t" class="rv-chip">{{ t }}</span>
              <span
                v-if="noteOf(e.id).basis === 'plot'"
                class="rv-chip rv-chip--caution"
                title="这一条需要具体剧情背景才成立，属于解读性判断"
                >需剧情佐证</span
              >
            </div>
          </div>
          <p v-else class="rv-todo">— 待解读</p>
        </div>
      </article>
    </div>

    <div v-if="!visible.length" class="rv-empty">这一章还没有收录条目。</div>
  </div>
</template>

<style scoped>
.rv-chapter {
  margin: 28px 0 60px;
}

/* ---------- 统计条 ---------- */
.rv-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 0 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 8px;
}

.rv-bar-left {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
}

.rv-num {
  font-family: var(--rv-serif);
  font-size: 1.25rem;
  color: var(--vp-c-text-1);
}

.rv-num--gold {
  color: var(--gold);
}

.rv-lab {
  letter-spacing: 0.05em;
}

.rv-sep {
  opacity: 0.4;
  margin: 0 2px;
}

.rv-toggle {
  display: flex;
  gap: 1px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  overflow: hidden;
}

.rv-btn {
  padding: 5px 12px;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  background: transparent;
  transition: all 0.18s;
  letter-spacing: 0.03em;
}

.rv-btn:hover {
  color: var(--vp-c-text-1);
}

.rv-btn.is-on {
  background: rgba(201, 162, 39, 0.16);
  color: var(--gold);
}

/* ---------- 条目 ---------- */
.rv-list {
  display: flex;
  flex-direction: column;
}

.rv-item {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 20px;
  padding: 22px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  /* 每帧带 id 作锚点，可分享到具体一帧；留出导航栏高度，避免跳转后被压住 */
  scroll-margin-top: 88px;
}

/* 通过锚点直达某一帧时，给它一个可察觉的落点提示 */
.rv-item:target .rv-frame::before {
  background: var(--gold);
}

.rv-item:target .rv-text {
  color: var(--gold);
}

.rv-frame {
  position: relative;
  padding-top: 2px;
}

.rv-frame::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--vp-c-divider);
  transition: background 0.2s;
}

.rv-item.is-annotated .rv-frame::before {
  background: var(--gold-dim);
}

.rv-frame-no {
  display: block;
  padding-left: 12px;
  font-family: var(--rv-serif);
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-3);
  letter-spacing: 0.06em;
}

.rv-item.is-annotated .rv-frame-no {
  color: var(--gold);
}

.rv-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.rv-title {
  margin: 0;
  font-family: var(--rv-serif);
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  border: none;
  padding: 0;
  line-height: 1.4;
}

.rv-item.is-annotated .rv-title {
  color: var(--vp-c-text-1);
}

.rv-en {
  font-family: var(--rv-font-family-mono);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-3);
  opacity: 0.85;
}

.rv-text {
  margin: 0;
  font-family: var(--rv-serif);
  font-size: 1.14rem;
  line-height: 1.85;
  color: var(--vp-c-text-1);
  letter-spacing: 0.015em;
  white-space: pre-line;
}

.rv-todo {
  margin: 10px 0 0;
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
  opacity: 0.55;
  letter-spacing: 0.06em;
}

/* ---------- 解读 ---------- */
.rv-note {
  margin-top: 14px;
  padding: 14px 16px;
  background: rgba(232, 226, 213, 0.026);
  border-left: 1px solid var(--gold-dim);
  border-radius: 0 3px 3px 0;
}

.rv-reading {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.9;
  color: var(--vp-c-text-2);
  text-align: justify;
}

.rv-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.rv-chip {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.68rem;
  border-radius: 2px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.rv-chip--gold {
  border-color: var(--gold-dim);
  color: var(--gold);
  background: rgba(201, 162, 39, 0.08);
}

.rv-chip--caution {
  border-color: rgba(215, 130, 90, 0.4);
  color: #d7825a;
  background: rgba(215, 130, 90, 0.07);
}

.rv-empty {
  padding: 40px 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}

@media (max-width: 640px) {
  .rv-item {
    grid-template-columns: 42px 1fr;
    gap: 12px;
  }

  .rv-text {
    font-size: 1.04rem;
  }

  .rv-frame-no {
    padding-left: 8px;
    font-size: 0.82rem;
  }
}
</style>
