// 本脚本生成 docs/public/stats.json，只给 README 徽章读取：
// 它是生成物，已列入 .gitignore 不进版本库，每次构建重新生成，不要手改。
// 数字一律随 docs/.vitepress/data/ 下的数据文件走，任何地方都不许手填帧数或赏析数。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dataDir = join(root, 'docs', '.vitepress', 'data');
const publicDir = join(root, 'docs', 'public');
const outPath = join(publicDir, 'stats.json');

if (!existsSync(dataDir) || !existsSync(publicDir)) {
  console.error(`缺少 ${dataDir} 或 ${publicDir}，终止，不做任何补建`);
  process.exit(1);
}

const chapters = JSON.parse(readFileSync(join(dataDir, 'chapters.json'), 'utf8'));
const cgs = JSON.parse(readFileSync(join(dataDir, 'cg.json'), 'utf8'));
const notes = JSON.parse(readFileSync(join(dataDir, 'notes.json'), 'utf8'));

const noteCount = Object.keys(notes).filter((k) => k !== '_meta').length;

// 覆盖率口径与数据校验脚本一致：一位小数，分母用当前帧数
const coverage = cgs.length === 0 ? '0.0' : ((noteCount / cgs.length) * 100).toFixed(1) + '%';

const stats = {
  chapters: chapters.length,
  frames: cgs.length,
  notes: noteCount,
  coverage
};

writeFileSync(outPath, JSON.stringify(stats, null, 2) + '\n');
console.log(`stats.json 已生成：${JSON.stringify(stats)}`);
