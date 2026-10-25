// 数据校验：检查 docs/.vitepress/data/ 下三个 JSON 是否满足数据契约。
// 为什么手写而不用 ajv / zod：规则只有几条，而报错需要带中文定位信息（哪个文件、哪个 id、
// 哪个字段），schema 库的报错还要再翻译一层，成本高于收益。
// 为什么零依赖：这个脚本要在「刚 clone、还没 npm install」的机器上也能跑——
// 校验数据不需要 node_modules。
import fs from 'node:fs';

// 用相对本文件的 URL 定位数据，不用相对 cwd 的路径：脚本可能从任意目录被调用
// （npm run / CI / 手敲 node scripts/check-data.mjs），只有 URL 锚定不受 cwd 影响。
const dataFileUrl = (fileName) =>
  new URL(`../docs/.vitepress/data/${fileName}`, import.meta.url);

const FILES = {
  chapters: 'chapters.json',
  cg: 'cg.json',
  notes: 'notes.json',
};

// 文件级故障（读不到 / 解析不了 / 顶层结构不对）。这类故障下后续规则全部无从谈起，
// 只能打印一行原因后终止，所以要和普通的规则违例分开处理。
class DataFileError extends Error {}

function readJson(fileName) {
  let raw;
  try {
    // 必须显式 'utf8'：Windows 上 readFileSync 默认返回 Buffer，
    // 直接喂给 JSON.parse 会把二进制当 latin1 解，错误信息不可读。
    raw = fs.readFileSync(dataFileUrl(fileName), 'utf8');
  } catch (err) {
    // 读不到文件是最常见的实际故障（目录挪了、文件名改了），必须带文件名报出来
    throw new DataFileError(`${fileName} 读取失败（${err.message}）`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    // JSON 语法错误第二常见（手改数据时少一个逗号），同样要带文件名和原始消息
    throw new DataFileError(`${fileName} 不是合法 JSON（${err.message}）`);
  }
}

function asArray(value, fileName) {
  // 顶层结构不对说明文件被大改过，继续跑规则只会产生雪崩式的误导性报错
  if (!Array.isArray(value)) {
    throw new DataFileError(
      `${fileName} 顶层应为数组，实际是 ${value === null ? 'null' : typeof value}`
    );
  }
  return value;
}

function asObject(value, fileName) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DataFileError(`${fileName} 顶层应为对象，实际不是`);
  }
  return value;
}

// ── 报错收集 ───────────────────────────────────────────────────────────────

function createReport() {
  return {
    errors: [],
    // 目前没有 warning 级规则，但摘要格式固定为「N error · N warning」两段——
    // 这行输出将来会被 CI 解析，保留计数是为了规则增减时格式不变。
    warnings: [],
    // 只走 console.log 不走 console.error：全部输出留在 stdout，
    // 重定向（> report.txt）时才不会丢掉报错。
    error(file, rule, detail) {
      this.errors.push(`✗ ${file} · ${rule} · ${detail}`);
    },
  };
}

// 非空字符串的统一判法：首尾空白不算内容，"   " 等于没写。
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// ── chapters.json ─────────────────────────────────────────────────────────

// id 格式钉死 ch-NN：它被 cg.json 的 chapter 字段和页面路由同时引用，
// 格式一旦漂移，坏的不只是一个条目，是两处关联。
function checkChapterIdFormat(chapters, report) {
  for (const ch of chapters) {
    if (!/^ch-\d{2}$/.test(ch.id)) {
      report.error(FILES.chapters, 'id 格式非法', `${JSON.stringify(ch.id)}（应为 ch-NN）`);
    }
  }
}

function checkChapterIdUnique(chapters, report) {
  const seen = new Set();
  for (const ch of chapters) {
    if (seen.has(ch.id)) {
      report.error(FILES.chapters, 'id 重复', ch.id);
    } else {
      seen.add(ch.id);
    }
  }
}

// order 是总览页的排序键，两条撞号会让排序结果取决于遍历顺序——静默的不确定。
function checkChapterOrderUnique(chapters, report) {
  const ownerByOrder = new Map();
  for (const ch of chapters) {
    if (!Number.isInteger(ch.order)) continue; // 类型问题交给 shape 检查报，这里只管唯一性
    if (ownerByOrder.has(ch.order)) {
      report.error(
        FILES.chapters,
        'order 重复',
        `${ch.order}（${ownerByOrder.get(ch.order)} 与 ${ch.id}）`
      );
    } else {
      ownerByOrder.set(ch.order, ch.id);
    }
  }
}

function checkChapterVersionVerified(chapters, report) {
  for (const ch of chapters) {
    // version=null 意味着「版本尚未核实」，verified 却声称核实过——两者必有一个在撒谎。
    // 反方向（version 非空但 verified=false）是合法状态：查到过线索但来源不够硬。
    if (ch.version === null && ch.versionVerified !== false) {
      report.error(
        FILES.chapters,
        'versionVerified 矛盾',
        `${ch.id} version=null 但 verified=${ch.versionVerified}`
      );
    }
  }
}

function checkChapterShape(chapters, report) {
  for (const ch of chapters) {
    // 标题同时是章名和检索字段，空标题的章在总览页会变成无名卡片
    if (!isNonEmptyString(ch.zh)) report.error(FILES.chapters, 'zh 为空', ch.id);
    if (!isNonEmptyString(ch.en)) report.error(FILES.chapters, 'en 为空', ch.id);

    // allusion 为 null 是契约允许的状态（该章标题的典故尚未考据）。
    // 不给「未知」留合法表达，就会逼人编个典故填上去——那是比空着更糟的数据。
    // continue 只跳过本章的典故三件套：zh/en 在其之前已校验，循环体之后没有其它检查。
    if (ch.allusion === null) continue;

    // 典故三件套：title/body 空 = 考据没写完就上线；confidence 出 ABC 之外多半是打错字
    const allusion = ch.allusion;
    if (!isNonEmptyString(allusion?.title)) {
      report.error(FILES.chapters, 'allusion.title 为空', ch.id);
    }
    if (!isNonEmptyString(allusion?.body)) {
      report.error(FILES.chapters, 'allusion.body 为空', ch.id);
    }
    if (!['A', 'B', 'C'].includes(allusion?.confidence)) {
      report.error(
        FILES.chapters,
        'confidence 非法',
        `${ch.id} = ${JSON.stringify(allusion?.confidence)}（只允许 A / B / C）`
      );
    }
  }
}

// ── cg.json ───────────────────────────────────────────────────────────────

// id 是 ch-NN-{no}：它同时是 notes.json 的键、P2 起还会是帧页的 URL，格式不能漂。
// 这里只做形状粗检（\d{3,} 不写死位数）——位数与各段对应关系交给派生规则管，
// no>999 进位时这里不用跟着改（评审裁决 a）。
function checkCgIdFormat(cgs, report) {
  for (const cg of cgs) {
    if (!/^ch-\d{2}-\d{3,}$/.test(cg.id)) {
      report.error(FILES.cg, 'id 格式非法', `${JSON.stringify(cg.id)}（应为 ch-NN-{no}）`);
    }
  }
}

// 派生一致性（主约束，评审裁决 a）：id 必须由 chapter 与 no 派生，编号补零 3 位。
// 它同时管三件事：位数恒定；chapter 标错章（ch-07 的帧误标 ch-08——形状与悬空检查都放行，
// 只有这里能抓住）；no>999 时的自然扩展。正则管不了其中任何一件。
function checkCgIdDerived(cgs, report) {
  for (const cg of cgs) {
    // 类型不完整时不派生：chapter 悬空 / no 非整数由各自规则报，避免用坏字段算出误导性的期望值
    if (typeof cg.chapter !== 'string' || !Number.isInteger(cg.no)) continue;
    const expected = `${cg.chapter}-${String(cg.no).padStart(3, '0')}`;
    if (cg.id !== expected) {
      report.error(
        FILES.cg,
        'id 派生不符',
        `${cg.id} 应为 ${expected}（id = chapter + '-' + no 补零 3 位）`
      );
    }
  }
}

function checkDuplicateCgId(cgs, report) {
  const seen = new Set();
  for (const cg of cgs) {
    if (seen.has(cg.id)) {
      report.error(FILES.cg, 'id 重复', cg.id);
    } else {
      seen.add(cg.id);
    }
  }
}

// 悬空的 chapter 引用会让这一帧从章节页整个消失——构建不报错、页面不显示，
// 是这个项目最隐蔽的一类坏数据，所以这条规则是全部规则里最要紧的一条。
function checkCgChapterExists(cgs, chapterIds, report) {
  for (const cg of cgs) {
    if (!chapterIds.has(cg.chapter)) {
      report.error(
        FILES.cg,
        'chapter 悬空',
        `${cg.id} 指向 ${cg.chapter}（chapters.json 中不存在）`
      );
    }
  }
}

function checkCgShape(cgs, report) {
  for (const cg of cgs) {
    if (!isNonEmptyString(cg.zh)) report.error(FILES.cg, 'zh 为空', cg.id);
    if (!isNonEmptyString(cg.en)) report.error(FILES.cg, 'en 为空', cg.id);
    if (!isNonEmptyString(cg.text)) report.error(FILES.cg, 'text 为空', cg.id);

    // no 是全局编号、外部引用的锚点；重排会让所有已有引用失效，所以必须是稳定整数
    if (!Number.isInteger(cg.no)) {
      report.error(FILES.cg, 'no 非整数', `${cg.id} = ${JSON.stringify(cg.no)}`);
    }
  }
}

// ── notes.json ────────────────────────────────────────────────────────────

// _meta 是字段说明文档，不是数据，所有校验跳过它
function noteEntries(notes) {
  return Object.entries(notes).filter(([key]) => key !== '_meta');
}

// 赏析键打错一个字，页面上就少一条赏析——不报错、不警告，只有翻到那章才会发现。
// 这是本项目最典型的失败姿势，规则存在的意义就是把它变成报错。
function checkOrphanNote(notes, cgIds, report) {
  for (const [id] of noteEntries(notes)) {
    if (!cgIds.has(id)) {
      report.error(FILES.notes, '键不存在', `${id}（cg.json 中没有这一帧，可能是打错了）`);
    }
  }
}

function checkNoteShape(notes, report) {
  for (const [id, note] of noteEntries(notes)) {
    if (typeof note !== 'object' || note === null || Array.isArray(note)) {
      report.error(FILES.notes, '条目不是对象', `${id} = ${JSON.stringify(note)}`);
      continue;
    }

    // reading 长度下限 50：低于它的必然是「这句真好」式的敷衍，
    // 比没有赏析更糟——它会拉低读者对整个项目的预期
    const reading = typeof note.reading === 'string' ? note.reading.trim() : '';
    if (reading.length === 0) {
      report.error(FILES.notes, 'reading 为空', id);
    } else if (reading.length < 50) {
      report.error(FILES.notes, 'reading 过短', `${id} 仅 ${reading.length} 字（下限 50）`);
    }

    if (!isNonEmptyString(note.device)) {
      report.error(FILES.notes, 'device 为空', id);
    }

    // basis 只有两态：text=仅凭文本可证 / plot=需剧情佐证。
    // 出现第三种值时页面的依据标注会失效，读者将无从分辨判断和事实
    if (!['text', 'plot'].includes(note.basis)) {
      report.error(
        FILES.notes,
        'basis 非法',
        `${id} = ${JSON.stringify(note.basis)}（只允许 text / plot）`
      );
    }

    // tags 上限 3：超过 3 个说明这条赏析没想清楚要讲什么；
    // 下限 1：没有标签的赏析在句子墙里永远筛不出来
    if (!Array.isArray(note.tags) || note.tags.length === 0) {
      report.error(FILES.notes, 'tags 非法', `${id} = ${JSON.stringify(note.tags)}（需 1–3 个）`);
    } else if (note.tags.length > 3) {
      report.error(FILES.notes, 'tags 超限', `${id} 有 ${note.tags.length} 个（上限 3）`);
    }
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────────

function main() {
  let chapters;
  let cgs;
  let notes;
  try {
    chapters = asArray(readJson(FILES.chapters), FILES.chapters);
    cgs = asArray(readJson(FILES.cg), FILES.cg);
    notes = asObject(readJson(FILES.notes), FILES.notes);
  } catch (err) {
    if (!(err instanceof DataFileError)) throw err; // 只接管文件级故障，脚本自身的 bug 照常炸出栈
    console.log(`✗ ${err.message}`);
    process.exitCode = 1; // 不用 process.exit(1)：它会立刻杀进程，管道里还没写完的输出会被截断
    return;
  }

  const report = createReport();
  const chapterIds = new Set(chapters.map((ch) => ch.id));
  const cgIds = new Set(cgs.map((cg) => cg.id));

  checkChapterIdFormat(chapters, report);
  checkChapterIdUnique(chapters, report);
  checkChapterOrderUnique(chapters, report);
  checkChapterVersionVerified(chapters, report);
  checkChapterShape(chapters, report);

  checkCgIdFormat(cgs, report);
  checkCgIdDerived(cgs, report);
  checkDuplicateCgId(cgs, report);
  checkCgChapterExists(cgs, chapterIds, report);
  checkCgShape(cgs, report);

  checkOrphanNote(notes, cgIds, report);
  checkNoteShape(notes, report);

  for (const line of report.errors) {
    console.log(line);
  }

  const noteCount = noteEntries(notes).length;
  console.log('────────────────────────────────');
  console.log(`${chapters.length} 章 · ${cgs.length} 帧 · ${noteCount} 条赏析`);
  console.log(`${report.errors.length} error · ${report.warnings.length} warning`);

  // 覆盖率给维护者一个进度感。分母不写死目标帧数（比如 266）：
  // 数据没录满时写死只会制造一个永远报错的数字，录没录满是人的判断，不是脚本的
  const percent = cgs.length === 0 ? '0.0' : ((noteCount / cgs.length) * 100).toFixed(1);
  console.log(`赏析覆盖率 ${percent}%（${noteCount}/${cgs.length} 帧）`);

  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}

main();
