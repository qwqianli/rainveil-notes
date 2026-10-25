// 一次性迁移脚本：cg.json 的 id 与 notes.json 的键，从 {version}-{no} 迁到 ch-NN-{no}。
// 依据：P1-计划书-GLM.md §2 Q1 + §6 M1 修正（断言不变量，不断言过程量）。
// 迁移完成后本脚本单独提交删除——git 历史留档它的存在，仓库不留死代码。
import fs from 'node:fs';

const dataUrl = (fileName) =>
  new URL(`../docs/.vitepress/data/${fileName}`, import.meta.url);

const OLD_ID = /^\d+\.\d+-\d+$/;
const NEW_ID = /^ch-\d{2}-\d{3,}$/;

// 补零 3 位是评审裁决 a 的决定：宽度恒定、字典序=数值序；位数上限交给派生规则管，
// 正则用 \d{3,} 不写死，no>999 时自动扩展。
const padNo = (no) => String(no).padStart(3, '0');

function readJson(fileName) {
  // 显式 utf8：Windows 下 readFileSync 默认返回 Buffer
  return JSON.parse(fs.readFileSync(dataUrl(fileName), 'utf8'));
}

// ── 迁移 ──────────────────────────────────────────────────────────────────

const cg = readJson('cg.json');
const notes = readJson('notes.json');

// 迁移前快照：不变量断言要对比「前后」，先记下「前」
const cgCountBefore = cg.length;
const noteKeysBefore = Object.keys(notes).filter((k) => k !== '_meta');

let fatal = false;
let renamedCg = 0;
const oldToNew = new Map();

for (const entry of cg) {
  if (NEW_ID.test(entry.id)) continue; // 已迁移过的条目直接跳过——幂等的根源之一
  if (!OLD_ID.test(entry.id)) {
    // 既不是新格式也不是旧格式：数据本身有问题，带着 id 报出来，不猜
    console.log(`✗ cg.json · id 既非旧格式也非新格式 · ${JSON.stringify(entry.id)}`);
    fatal = true;
    break;
  }
  // 新 id 只从字段推导，永不从旧 id 推导——二次污染（ch-08-179-179 类）在结构上不可能
  const newId = `${entry.chapter}-${padNo(entry.no)}`;
  oldToNew.set(entry.id, newId);
  entry.id = newId;
  renamedCg += 1;
}

let renamedNotes = 0;
let migrated = null;
if (!fatal) {
  migrated = {}; // 键序保持插入顺序，_meta 与已迁移键原样搬运
  for (const [key, value] of Object.entries(notes)) {
    if (oldToNew.has(key)) {
      // 只换键名，value 原样引用——赏析文字一个字符都不许动（约束 5）
      migrated[oldToNew.get(key)] = value;
      renamedNotes += 1;
    } else {
      migrated[key] = value;
    }
  }
}

// ── 不变量断言（§6 M1：断言数据自洽，不断言改名次数，不依赖 70/12 这类会过期的数字）──

let failed = fatal;

function assertInvariant(ok, message) {
  if (!ok) {
    console.log(`✗ 不变量违反 · ${message}`);
    failed = true;
  }
}

if (!fatal) {
  const newCgIds = new Set(cg.map((e) => e.id));
  const newNoteKeys = Object.keys(migrated).filter((k) => k !== '_meta');

  // 1. cg 条数不变
  assertInvariant(cg.length === cgCountBefore, `cg 条数 ${cgCountBefore} → ${cg.length}`);
  // 2. notes 键数（_meta 除外）不变
  assertInvariant(
    newNoteKeys.length === noteKeysBefore.length,
    `notes 键数 ${noteKeysBefore.length} → ${newNoteKeys.length}`
  );
  // 3. 无旧格式残留、无新 id 重复
  assertInvariant(cg.every((e) => !OLD_ID.test(e.id)), 'cg 中仍有旧格式 id 残留');
  assertInvariant(newCgIds.size === cg.length, 'cg 中新 id 存在重复');
  // 4. notes 每个键都在新 cg id 集合中
  for (const key of newNoteKeys) {
    if (!newCgIds.has(key)) {
      console.log(`✗ 不变量违反 · notes 键 ${key} 不在 cg 新 id 集合中`);
      failed = true;
    }
  }
}

if (failed) {
  // 任一不变量不成立：什么都不写，磁盘保持迁移前状态
  console.log('迁移中止，未写入任何文件');
  process.exitCode = 1; // 不用 process.exit：它会截断管道里还没写完的输出
} else if (renamedCg === 0 && renamedNotes === 0) {
  // 第二遍运行：纯空跑，不触碰文件——「文件字节数不变」由不写入直接保证
  console.log('空跑：0 次改名，四条不变量全部成立，未写入文件');
} else {
  // 序列化是确定性的（同输入同输出），重复写入也字节稳定
  fs.writeFileSync(dataUrl('cg.json'), JSON.stringify(cg, null, 2) + '\n', 'utf8');
  fs.writeFileSync(dataUrl('notes.json'), JSON.stringify(migrated, null, 2) + '\n', 'utf8');
  console.log(`迁移完成：cg ${renamedCg} 条、notes ${renamedNotes} 键改名，四条不变量全部成立`);
}
