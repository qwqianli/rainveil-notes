import cgData from './data/cg.json'

/**
 * 给本地搜索索引用的「帧附录」。
 *
 * 背景：VitePress 本地搜索只渲染 markdown 源码（localSearchPlugin 的
 * render() 只做 md.render，不跑 Vue SSR），章节页里的 <CgChapter /> 在
 * 索引阶段只是空标签，299 帧台词因此进不了索引。
 *
 * 做法：在章节页「拿去建索引的 HTML」末尾追加一段只给索引看的 HTML——
 * 每帧一个 <h2>（带内嵌锚点，默认分段器 splitPageIntoSections 靠它
 * 识别条目）加一个 <p> 正文。它不影响页面本身，也不进构建产物页面。
 *
 * 细节契约（改错任何一处索引就不生效）：
 * - <h2> 内必须内嵌 <a href="#帧id">，分段器的正则靠它识别条目；
 * - id 与 href 都用帧 id，搜索结果的落点就是 CgChapter 里
 *   <article :id="e.id"> 的现成锚点（:target 高亮与 scroll-margin-top 都是现成的）；
 * - 用 h2 不用 h3：分段器按层级维护面包屑，h2 出来的才是「章名 / 帧标题」。
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function frameAppendix(chapterId: string): string {
  const frames = cgData
    .filter((e) => e.chapter === chapterId)
    .sort((a, b) => a.no - b.no)

  return frames
    .map(
      (e) =>
        `<h2 id="${e.id}">${escapeHtml(e.zh)}` +
        `<a class="header-anchor" href="#${e.id}">#</a></h2>\n` +
        // 附录只进索引不进页面：text 的真实换行转成空格即可
        `<p>${escapeHtml(e.text.replace(/\n/g, ' '))}</p>`
    )
    .join('\n')
}
