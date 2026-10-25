<script setup>
import { computed } from 'vue'
import chaptersData from '../../data/chapters.json'
import cgData from '../../data/cg.json'
import notesData from '../../data/notes.json'

/**
 * 哪些章节已经有独立页面。
 * 新增章节页（docs/chapters/xx.md）后，必须把它的 id 加进这里，
 * 否则总览页上那张卡不会变成可点击的链接。
 */
const PAGES = ['ch-07', 'ch-08']

const list = computed(() =>
  [...chaptersData]
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const frames = cgData.filter((e) => e.chapter === c.id)
      const annotated = frames.filter((e) => notesData[e.id]).length
      return {
        ...c,
        hasPage: PAGES.includes(c.id) && !!c.version,
        /* 页面路径由版本号决定：1.9 → /chapters/1-9，不能用序号推 */
        href: c.version ? `/chapters/${c.version.replace('.', '-')}` : undefined,
        frames: frames.length || c.cgCount,
        annotated
      }
    })
)

const totals = computed(() => ({
  chapters: chaptersData.length,
  frames: cgData.length,
  annotated: Object.keys(notesData).filter((k) => k !== '_meta').length
}))

/** 版本号未知的章节，戳一个中性标记，而不是随便填一个版本 */
function versionOf(c) {
  return c.version || '版本待核'
}
</script>

<template>
  <div class="rv-index">
    <div class="rv-totals">
      <div class="rv-total">
        <b>{{ totals.chapters }}</b><span>章</span>
      </div>
      <div class="rv-total">
        <b>{{ totals.frames }}</b><span>帧已录入</span>
      </div>
      <div class="rv-total rv-total--gold">
        <b>{{ totals.annotated }}</b><span>条已解读</span>
      </div>
    </div>

    <div class="rv-cards">
      <component
        :is="c.hasPage ? 'a' : 'div'"
        v-for="c in list"
        :key="c.id"
        :href="c.hasPage ? c.href : undefined"
        :class="['rv-card', { 'is-link': c.hasPage }]"
      >
        <div class="rv-card-head">
          <span class="rv-order">{{ String(c.order).padStart(2, '0') }}</span>
          <span :class="['rv-ver', { 'is-unknown': !c.version }]">{{ versionOf(c) }}</span>
        </div>

        <h3 class="rv-card-title">{{ c.zh }}</h3>
        <p class="rv-card-en">{{ c.en }}</p>

        <p class="rv-allusion">
          <span class="rv-allusion-label">典出</span>
          {{ c.allusion ? c.allusion.title : '待补' }}
        </p>

        <div class="rv-card-foot">
          <span>{{ c.frames }} 帧</span>
          <span v-if="c.annotated" class="rv-pill">{{ c.annotated }} 已解读</span>
          <span v-else class="rv-pill rv-pill--dim">待解读</span>
        </div>
      </component>
    </div>
  </div>
</template>

<style scoped>
.rv-index {
  margin: 28px 0 60px;
}

/* ---------- 总量 ---------- */
.rv-totals {
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  padding: 0 0 22px;
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 26px;
}

.rv-total {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.rv-total b {
  font-family: var(--rv-serif);
  font-size: 1.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.rv-total--gold b {
  color: var(--gold);
}

.rv-total span {
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.05em;
}

/* ---------- 章节卡 ---------- */
.rv-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.rv-card {
  display: flex;
  flex-direction: column;
  padding: 18px 20px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: var(--vp-c-bg-alt);
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
  text-decoration: none !important;
  color: inherit;
}

.rv-card.is-link {
  cursor: pointer;
}

.rv-card.is-link:hover {
  border-color: var(--gold-dim);
  background: rgba(201, 162, 39, 0.045);
  transform: translateY(-1px);
}

.rv-card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}

.rv-order {
  font-family: var(--rv-serif);
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.1em;
  opacity: 0.7;
}

.rv-ver {
  font-family: var(--rv-font-family-mono);
  font-size: 0.68rem;
  color: var(--gold);
  padding: 1px 7px;
  border: 1px solid var(--gold-dim);
  border-radius: 2px;
  letter-spacing: 0.04em;
}

.rv-ver.is-unknown {
  color: var(--vp-c-text-3);
  border-color: var(--vp-c-divider);
  opacity: 0.7;
}

.rv-card-title {
  margin: 0 0 2px;
  font-family: var(--rv-serif);
  font-size: 1.18rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
  line-height: 1.4;
}

.rv-card-en {
  margin: 0 0 12px;
  font-family: var(--rv-font-family-mono);
  font-size: 0.71rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.02em;
}

.rv-allusion {
  flex: 1;
  margin: 0 0 14px;
  font-size: 0.78rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  padding-left: 10px;
  border-left: 2px solid var(--vp-c-divider);
}

.rv-allusion-label {
  display: inline-block;
  font-size: 0.66rem;
  color: var(--gold);
  letter-spacing: 0.08em;
  margin-right: 4px;
  opacity: 0.8;
}

.rv-card.is-link:hover .rv-allusion {
  border-left-color: var(--gold-dim);
}

.rv-card-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  padding-top: 10px;
  border-top: 1px solid var(--vp-c-divider);
}

.rv-pill {
  margin-left: auto;
  padding: 1px 7px;
  font-size: 0.66rem;
  color: var(--gold);
  background: rgba(201, 162, 39, 0.1);
  border-radius: 2px;
  letter-spacing: 0.03em;
}

.rv-pill--dim {
  color: var(--vp-c-text-3);
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  opacity: 0.65;
}

@media (max-width: 640px) {
  .rv-cards {
    grid-template-columns: 1fr;
  }

  .rv-totals {
    gap: 24px;
  }

  .rv-total b {
    font-size: 1.5rem;
  }
}
</style>
