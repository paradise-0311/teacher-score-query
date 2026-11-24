import { getStatistics, normalizeName, validateImport } from './scoring.mjs';

/** @returns {import('./types').StaticScores} */
export const emptyScores = () => ({ schemaVersion: 1, updatedAt: null, exams: [] });

/** @returns {import('./types').StaticScores} */
export function validateStaticScores(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.exams) || data.exams.length > 100) {
    throw new Error('成绩文件格式不正确，请重新生成 scores.json。');
  }
  const ids = new Set();
  const exams = data.exams.map(entry => {
    const clean = validateImport({ ...entry, publish: true });
    if (!clean.exam.id || ids.has(clean.exam.id)) throw new Error('考试编号缺失或重复，请重新生成成绩文件。');
    ids.add(clean.exam.id);
    return {
      exam: { ...clean.exam, updatedAt: String(entry.exam.updatedAt || ''), publishedAt: entry.exam.publishedAt || null, total: clean.records.filter(p => p.status === 'scored').length, roster: clean.records.length },
      records: clean.records,
    };
  });
  return { schemaVersion: 1, updatedAt: data.updatedAt || null, exams };
}

export function makeStaticEntry(parsed, options = {}) {
  if (parsed.errors?.length) throw new Error('请先修正 Excel 中需要核对的成绩，再重新导入。');
  const stamp = new Date().toISOString();
  const validated = validateImport({ exam: {
    id: options.id || `exam-${crypto.randomUUID()}`,
    title: options.title ?? parsed.title,
    date: options.date ?? parsed.dates.join(' / '),
    maxScore: options.maxScore ?? parsed.maxScore,
    scope: options.scope ?? '本场全部考场已录入有效成绩的实考老师',
    provisional: options.provisional ?? true,
  }, records: parsed.records, publish: true });
  return { exam: { ...validated.exam, updatedAt: stamp, publishedAt: stamp }, records: validated.records };
}

export function upsertStaticEntry(data, entry) {
  const entries = data.exams.filter(e => e.exam.id !== entry.exam.id);
  entries.unshift(entry);
  return validateStaticScores({ schemaVersion: 1, updatedAt: new Date().toISOString(), exams: entries });
}

const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function lookupStatic(data, input) {
  const name = normalizeName(input?.name);
  if (!name || name.length > 80 || typeof input?.examId !== 'string' || input.examId.length > 80) throw new Error('请先选择考试并输入完整姓名。');
  const entry = data.exams.find(e => e.exam.id === input.examId);
  if (!entry) throw new Error('这场考试尚未发布或已撤回，请刷新后重试。');
  const matches = entry.records.filter(p => normalizeName(p.name) === name).sort((a, b) => compareText(a.department, b.department) || compareText(a.venue, b.venue) || compareText(a.id, b.id)).slice(0, 30);
  if (!matches.length) throw new Error('没有找到这个姓名。请核对姓名和考试，仍无结果请联系培训组织者。');
  if (matches.length > 1 && !input.personId) return { choices: matches.map(({ id, name, department, subject, venue }) => ({ id, name, department, subject, venue })) };
  const person = input.personId ? matches.find(p => p.id === input.personId) : matches[0];
  if (!person) throw new Error('未找到对应记录，请重新输入姓名查询。');
  return { exam: entry.exam, person, statistics: getStatistics(entry.records, person) };
}
