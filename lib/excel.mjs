import ExcelJS from 'exceljs';
import { classifyScore, normalizeName } from './scoring.mjs';

function cellValue(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return value.result === undefined ? { uncalculated: true } : value.result;
    if ('richText' in value) return value.richText.map(x => x.text).join('');
    if ('text' in value) return value.text;
    if ('error' in value) return value.error;
    return String(cell.text || '');
  }
  return value;
}
const plain = value => value === null ? '' : String(value).trim();
const compact = value => plain(value).replace(/\s+/g, '');
function examTitle(value) {
  return plain(value).replace(/\d{1,2}\s*[\/／]\s*\d{1,2}/g, '').replace(/周[一二三四五六日天]/g, '').replace(/满分\s*[:：]?\s*\d+(\.\d+)?/g, '').replace(/\s*[\/／]\s*/g, ' ').replace(/\s+/g, ' ').trim();
}
export async function parseExcel(input) {
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(input); } catch { throw new Error('无法读取此文件。请使用Excel另存为.xlsx后重新上传。'); }
  const candidates = [];
  for (const sheet of workbook.worksheets) {
    let headerRow = 0, nameColumn = 0;
    for (let r = 1; r <= Math.min(sheet.rowCount, 30) && !headerRow; r++) {
      for (let c = 1; c <= Math.min(sheet.columnCount, 60); c++) {
        if (compact(cellValue(sheet.getCell(r, c))) === '姓名') { headerRow = r; nameColumn = c; break; }
      }
    }
    if (!headerRow) continue;
    const columns = [];
    const metadata = {};
    for (let c = 1; c <= Math.min(sheet.columnCount, 60); c++) {
      const header = plain(cellValue(sheet.getCell(headerRow, c)));
      const key = compact(header);
      if (/^(部门|所属部门|教学部)$/.test(key)) metadata.department = c;
      else if (/^(学科|任教学科)$/.test(key)) metadata.subject = c;
      else if (/^(场次与场地|场地|考场|教室|校区)$/.test(key)) metadata.venue = c;
      else if (c !== nameColumn && !/参培|姓名|序号|手机号|工号|排名|位次|百分|备注|是否/.test(key) && /满分|分数|成绩|得分|总分|全真|模拟|科一|科二/.test(key)) {
        const title = examTitle(header);
        const max = header.match(/满分\s*[:：]?\s*(\d+(?:\.\d+)?)/);
        const dates = [...header.matchAll(/(\d{1,2})\s*[\/／]\s*(\d{1,2})/g)].map(x => `2026-${x[1].padStart(2, '0')}-${x[2].padStart(2, '0')}`);
        columns.push({ column: c, title, key: normalizeName(title), maxScore: max ? Number(max[1]) : 150, dates });
      }
    }
    if (columns.length) candidates.push({ sheet, headerRow, nameColumn, metadata, columns });
  }
  if (!candidates.length) throw new Error('未找到“姓名”和成绩列。请保留原登分表表头，或使用“姓名、部门、成绩”格式。');
  // In this workbook, venue sheets contain the authoritative input values. This also avoids stale formula caches in 总成绩.
  const detail = candidates.filter(x => !/总成绩|汇总|总表/.test(x.sheet.name));
  const total = candidates.filter(x => /总成绩|汇总|总表/.test(x.sheet.name));
  const useDetails = detail.length && (!total.length || total.every(t => t.columns.every(tc => detail.some(d => d.columns.some(dc => dc.key === tc.key)))));
  const sources = useDetails ? detail : total.length ? total : candidates;
  const groups = new Map();
  for (const source of sources) {
    for (const exam of source.columns) {
      if (!groups.has(exam.key)) groups.set(exam.key, { title: exam.title, key: exam.key, maxScore: exam.maxScore, dates: new Set(), records: [], errors: [] });
      const group = groups.get(exam.key);
      exam.dates.forEach(d => group.dates.add(d));
      for (let row = source.headerRow + 1; row <= source.sheet.rowCount; row++) {
        const name = plain(cellValue(source.sheet.getCell(row, source.nameColumn)));
        if (!name || /^(合计|总计|说明|备注)/.test(name)) continue;
        const get = key => source.metadata[key] ? plain(cellValue(source.sheet.getCell(row, source.metadata[key]))) : '';
        const raw = cellValue(source.sheet.getCell(row, exam.column));
        const result = raw && typeof raw === 'object' && raw.uncalculated ? { score: null, status: 'invalid', error: '公式没有缓存结果，请在Excel中重新计算并保存后再上传' } : classifyScore(raw, exam.maxScore);
        const record = { id: `r${group.records.length + 1}`, name, department: get('department'), subject: get('subject'), venue: get('venue') || source.sheet.name, score: result.score, status: result.status };
        group.records.push(record);
        if (result.error) group.errors.push(`${source.sheet.name}第${row}行，${name}：${result.error}`);
      }
    }
  }
  const exams = [...groups.values()].map(g => {
    const names = new Map();
    g.records.forEach(r => { const n = normalizeName(r.name); names.set(n, (names.get(n) || 0) + 1); });
    return { ...g, dates: [...g.dates].sort(), duplicateNames: [...names.values()].filter(n => n > 1).length };
  });
  if (exams.some(e => e.records.length > 2000)) throw new Error('单场超过2000条记录，请拆分文件后导入。');
  const warnings = [];
  if (useDetails && total.length) {
    let totalRows = 0;
    for (const source of total) for (let row = source.headerRow + 1; row <= source.sheet.rowCount; row++) {
      const name = plain(cellValue(source.sheet.getCell(row, source.nameColumn)));
      if (name && !/^(合计|总计|说明|备注)/.test(name)) totalRows++;
    }
    const detailRows = exams[0]?.records.length || 0;
    if (totalRows !== detailRows) warnings.push(`场地分表合计${detailRows}人，总成绩表${totalRows}人，人数不一致。系统按场地分表导入，请核对名单后发布。`);
  }
  return { exams, warnings, sourceSheets: sources.map(s => s.sheet.name), sourceMode: useDetails && total.length ? '已合并场地分表，自动跳过总成绩汇总表，避免重复计数和公式缓存滞后。' : '已读取包含姓名和成绩的工作表。' };
}
