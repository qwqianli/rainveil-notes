/**
 * 构建产物守卫。
 *
 * 起因：曾把内部文档放在 docs/dev/ 并加了 .gitignore，以为安全了。
 * 但 VitePress 会编译 docs/ 下所有 .md —— .gitignore 只挡 git，
 * 挡不住构建。结果 21 篇任务书/验收裁决被打进 dist，sitemap 里出现
 * /dev/P0-任务书-GLM 这样的 URL，只差一次部署就公开。
 *
 * 所以把两件最怕的事做成自动检查，本地与 CI 都跑：
 *   一、内部文档泄漏（构建源目录里放了不该放的东西）
 *   二、图片混入（版权红线，本项目不托管任何官方美术）
 *
 * 这不是提示，是闸门。检查不过就不许发布。
 */
import fs from 'node:fs'
import path from 'node:path'

const DIST = 'docs/.vitepress/dist'

/* 内部文档的特征词：出现在产物里就说明有东西漏了 */
const LEAK_WORDS = [
  '任务书',
  '施工报告',
  '委托书',
  '验收裁决',
  '评审意见',
  '计划书',
  '施工指令'
]

/* 允许存在的图片：只有站点图标。除此之外任何位图都视为越界。 */
const ALLOWED_IMAGES = new Set(['logo.svg'])

const errors = []

if (!fs.existsSync(DIST)) {
  console.log(`✗ 找不到构建产物 ${DIST}，先跑 npm run build`)
  process.exit(1)
}

/** 递归收集文件 */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = walk(DIST)

/* ---------- 一、内部文档目录 ---------- */
for (const forbidden of ['dev', 'internal']) {
  if (fs.existsSync(path.join(DIST, forbidden))) {
    errors.push(`内部文档目录被打包：dist/${forbidden}/ —— 把该目录移出 docs/`)
  }
}

/* ---------- 二、内部文档内容 ---------- */
const textExt = /\.(html|js|json|xml|txt)$/
for (const file of files) {
  if (!textExt.test(file)) continue
  /* localSearchIndex 之类的大文件也扫，宁可慢一点 */
  const content = fs.readFileSync(file, 'utf8')
  for (const word of LEAK_WORDS) {
    if (content.includes(word)) {
      errors.push(`产物含内部文档关键词「${word}」：${path.relative(DIST, file)}`)
      break
    }
  }
}

/* ---------- 三、图片 ---------- */
const imageExt = /\.(png|jpe?g|webp|gif|bmp|avif|mp3|wav|ogg|m4a)$/i
for (const file of files) {
  const name = path.basename(file)
  if (ALLOWED_IMAGES.has(name)) continue
  if (imageExt.test(name)) {
    errors.push(
      `产物含图片/音频：${path.relative(DIST, file)} —— 本项目不托管官方素材，这是版权红线`
    )
  }
}

/* ---------- 结果 ---------- */
const htmlCount = files.filter((f) => f.endsWith('.html')).length

if (errors.length) {
  console.log(`✗ 构建产物检查未通过（${errors.length} 项）：`)
  errors.forEach((e) => console.log('  · ' + e))
  console.log('\n以上任一项都足以阻止发布。')
  process.exitCode = 1
} else {
  console.log('────────────────────────────────')
  console.log(`产物检查通过：${files.length} 个文件，其中 ${htmlCount} 个页面`)
  console.log('✓ 无内部文档目录　✓ 无内部文档内容　✓ 无图片/音频')
}
