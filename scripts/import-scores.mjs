import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExcel } from '../lib/excel.mjs';
import { normalizeName } from '../lib/scoring.mjs';
import { emptyScores, validateStaticScores, makeStaticEntry, upsertStaticEntry } from '../lib/static-scores.mjs';

const args = process.argv.slice(2);
const value = flag => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const input = value('--file');
  if (!input) throw new Error('用法：node scripts/import-scores.mjs --file "登分表.xlsx" --exam "科一 全真模拟"。加 --list 可列出考试，成绩文件默认为 docs/scores.json。');
  const parsed = await parseExcel(await fs.readFile(path.resolve(input)));
  if (args.includes('--list')) {
    console.log(JSON.stringify(parsed.exams.map((exam, index) => ({ index: index + 1, title: exam.title, scored: exam.records.filter(person => person.status === 'scored').length, errors: exam.errors.length })), null, 2));
    process.exit(0);
  }
  const name = value('--exam');
  const matches = parsed.exams.filter(exam => name ? normalizeName(exam.title) === normalizeName(name) : parsed.exams.length === 1);
  if (matches.length !== 1) throw new Error('请用 --exam 指定一个确切的考试名称，或先用 --list 查看。');
  const exam = matches[0];
  const destination = value('--output') ? path.resolve(value('--output')) : path.join(project, 'docs/scores.json');
  let published;
  try { published = validateStaticScores(JSON.parse(await fs.readFile(destination, 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; published = emptyScores(); }
  const explicitId = value('--id');
  if (explicitId && !published.exams.some(entry => entry.exam.id === explicitId)) throw new Error('--id 对应的考试不存在，请核对后再试。');
  const old = published.exams.find(entry => explicitId ? entry.exam.id === explicitId : normalizeName(entry.exam.title) === normalizeName(exam.title) && entry.exam.date === exam.dates.join(' / '));
  const entry = makeStaticEntry(exam, { id: old?.exam.id, provisional: !args.includes('--final') });
  const next = upsertStaticEntry(published, entry);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (published.exams.length) {
    const backups = path.join(project, 'work/score-backups'); await fs.mkdir(backups, { recursive: true });
    await fs.writeFile(path.join(backups, `${Date.now()}.json`), JSON.stringify(published, null, 2));
  }
  const temporary = destination + '.tmp';
  await fs.writeFile(temporary, JSON.stringify(next, null, 2) + '\n');
  await fs.rename(temporary, destination);
  console.log(JSON.stringify({ output: destination, title: entry.exam.title, scored: entry.records.filter(person => person.status === 'scored').length, records: entry.records.length, examsPreserved: next.exams.length, replaced: Boolean(old) }));
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
