/**
 * 构建产物守卫。
 *
 * VitePress 会编译 docs/ 下所有 .md —— .gitignore 只挡 git，挡不住构建。
 * 所以把两件最怕的事做成自动检查，本地与 CI 都跑：
 *   一、每个产物页面都必须由版本库里的 docs 下 Markdown 生成
 *       （多出来的页面，就是不该发布的文档）
 *   二、图片混入（版权红线，本项目不托管任何官方美术）
 *
 * 这不是提示，是闸门。检查不过就不许发布。
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const DIST = 'docs/.vitepress/dist'

/* 允许存在的图片：只有站点图标。除此之外任何位图都视为越界。 */
const ALLOWED_IMAGES = new Set(['logo.svg'])

/* 框架自己生成的页面，不对应任何 Markdown 源文件。 */
const FRAMEWORK_PAGES = new Set(['404.html'])

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

/** 版本库里允许发布的 Markdown 源文件（相对仓库根，正斜杠） */
function trackedMarkdown() {
  const out = execFileSync('git', ['ls-files', '-z', '--', 'docs'], { encoding: 'utf8' })
  return new Set(
    out
      .split('\0')
      .filter((p) => p.endsWith('.md'))
      .map((p) => p.replaceAll('\\', '/'))
  )
}

const files = walk(DIST)
const sources = trackedMarkdown()

/* ---------- 一、产物页面必须有源文件 ---------- */
for (const file of files) {
  if (!file.endsWith('.html')) continue
  const rel = path.relative(DIST, file).replaceAll('\\', '/')
  if (FRAMEWORK_PAGES.has(rel)) continue
  const noExt = rel.replace(/\.html$/, '')
  const candidates = [`docs/${noExt}.md`, `docs/${noExt}/index.md`]
  if (!candidates.some((c) => sources.has(c))) {
    errors.push(`产物页面没有对应的 Markdown 源文件：dist/${rel} —— 该文档不该发布`)
  }
}

/* ---------- 二、不该打包的目录 ---------- */
for (const forbidden of ['dev', 'internal']) {
  if (fs.existsSync(path.join(DIST, forbidden))) {
    errors.push(`不该发布的目录被打包：dist/${forbidden}/ —— 把该目录移出 docs/`)
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
  console.log('✓ 页面全部有源文件　✓ 无多余目录　✓ 无图片/音频')
}
