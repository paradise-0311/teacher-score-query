export function normalizeName(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, '').toLocaleLowerCase('zh-CN');
}

export function classifyScore(raw, maximum = 150) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return { score: null, status: 'pending', error: '' };
  const text = String(raw).trim();
  if (/^(不参培|不参加|未参培|免考|不报考|不考|不适用|[\/／—–-])$/.test(text)) return { score: null, status: 'excluded', error: '' };
  if (/缺考|请假|旷考|未参加|未到考/.test(text)) return { score: null, status: 'absent', error: '' };
  if (/^(未录入|待录入|待登分|未公布|待公布)$/.test(text)) return { score: null, status: 'pending', error: '' };
  if ((typeof raw === 'number' || /^\d+(\.\d+)?$/.test(text)) && Number.isFinite(Number(raw))) {
    const score = Number(raw);
    if (score >= 0 && score <= maximum) return { score, status: 'scored', error: '' };
    return { score: null, status: 'invalid', error: `分数须在0至${maximum}之间，当前为“${text}”` };
  }
  return { score: null, status: 'invalid', error: `无法识别“${text.slice(0, 60)}”，请改为数字、缺考、不参培或空白` };
}

export function getStatistics(records, person) {
  const scores = records.filter(r => r.status === 'scored' && typeof r.score === 'number');
  if (person.status !== 'scored' || typeof person.score !== 'number') return { rank: null, percentile: null, topPercent: null, total: scores.length, tied: 0 };
  const higher = scores.filter(r => r.score > person.score).length;
  const lower = scores.filter(r => r.score < person.score).length;
  const tied = scores.filter(r => r.score === person.score).length;
  return { rank: higher + 1, percentile: Math.round(lower / scores.length * 1000) / 10, topPercent: Math.round((higher + 1) / scores.length * 1000) / 10, total: scores.length, tied };
}

export function validateImport(input) {
  if (!input || typeof input !== 'object' || !input.exam || !Array.isArray(input.records)) throw new Error('上传数据格式不正确，请重新选择Excel。');
  const { exam, records } = input;
  const title = String(exam.title || '').trim();
  const maxScore = Number(exam.maxScore);
  if (!title || title.length > 120) throw new Error('考试名称须为1至120字。');
  if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) throw new Error('满分须大于0且不超过1000。');
  if (!records.length || records.length > 2000) throw new Error('每次导入须为1至2000条记录。');
  const ids = new Set();
  const clean = records.map((r, index) => {
    const id = String(r.id || `r${index + 1}`);
    const name = String(r.name || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw new Error('记录编号重复或无效，请重新导入。');
    ids.add(id);
    if (!name || name.length > 80) throw new Error(`第${index + 1}条记录缺少姓名或姓名过长。`);
    const status = String(r.status);
    if (!['scored', 'pending', 'absent', 'excluded'].includes(status)) throw new Error(`${name}的成绩需要核对，无法导入。`);
    const score = status === 'scored' ? r.score : null;
    if (status === 'scored' && (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > maxScore)) throw new Error(`${name}的分数超出0至${maxScore}范围。`);
    const text = key => String(r[key] || '').trim().slice(0, 120);
    return { id, name, lookupName: normalizeName(name), department: text('department'), subject: text('subject'), venue: text('venue'), status, score };
  });
  const id = exam.id ? String(exam.id) : '';
  if (id && !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('考试编号无效。');
  const date = String(exam.date || '').slice(0, 30);
  const scope = String(exam.scope || '本场已录入有效成绩的实考老师').trim().slice(0, 160);
  const publication = input.publish ? 'published' : 'draft';
  if (input.publish && !clean.some(r => r.status === 'scored')) throw new Error('本场尚无有效分数，可保存草稿，录分后再发布。');
  return { exam: { id, title, date, maxScore, scope, provisional: Boolean(exam.provisional), publication }, records: clean };
}
