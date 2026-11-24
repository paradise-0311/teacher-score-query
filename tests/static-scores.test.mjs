import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyScores, makeStaticEntry, upsertStaticEntry, validateStaticScores, lookupStatic } from '../lib/static-scores.mjs';
import { getStatistics } from '../lib/scoring.mjs';

function fixture() {
  const records = [120, 112, 112, 96, 87, 65, 0].map((score, index) => ({ id: `r${index}`, name: index === 2 || index === 6 ? '同名教师' : `示例${index}`, department: index === 6 ? '教学二部' : '教学一部', venue: index === 6 ? '4教室' : '3教室', subject: '语文', status: 'scored', score }));
  for (const status of ['pending', 'absent', 'excluded']) records.push({ id: status, name: status, department: '', venue: '', subject: '', status, score: null });
  return { title: '测试考试', maxScore: 150, dates: ['2026-11-24'], records, errors: [] };
}

test('static lookup exactly matches shared ranking and percentile for every record', () => {
  const entry = makeStaticEntry(fixture(), { id: 'exam-test' });
  const data = upsertStaticEntry(emptyScores(), entry);
  for (const person of entry.records) {
    const actual = lookupStatic(data, { examId: entry.exam.id, name: ` ${person.name} `, personId: person.id });
    assert.deepEqual(actual.statistics, getStatistics(entry.records, person));
  }
  assert.deepEqual(lookupStatic(data, { examId: entry.exam.id, name: '示例1' }).statistics, { total: 7, rank: 2, percentile: 57.1, topPercent: 28.6, tied: 2 });
});

test('same-name choice, zero, normalized names and cross-name record selection stay correct', () => {
  const entry = makeStaticEntry(fixture(), { id: 'exam-test' });
  const data = upsertStaticEntry(emptyScores(), entry);
  const choices = lookupStatic(data, { examId: 'exam-test', name: '同　名 教师' }).choices;
  assert.equal(choices.length, 2); assert.equal(Object.hasOwn(choices[0], 'score'), false);
  const zero = lookupStatic(data, { examId: 'exam-test', name: '同名教师', personId: 'r6' });
  assert.equal(zero.person.score, 0); assert.equal(zero.statistics.rank, 7); assert.equal(zero.statistics.percentile, 0);
  assert.throws(() => lookupStatic(data, { examId: 'exam-test', name: '同名教师', personId: 'r1' }));
  assert.throws(() => lookupStatic(data, { examId: 'exam-test', name: '不存在' }));
});

test('updating one examination preserves other exams and prevents duplicate ids', () => {
  const a = makeStaticEntry(fixture(), { id: 'exam-a' }), b = makeStaticEntry(fixture(), { id: 'exam-b' });
  const initial = upsertStaticEntry(upsertStaticEntry(emptyScores(), a), b);
  const next = upsertStaticEntry(initial, { ...a, records: a.records.map((p, i) => i === 0 ? { ...p, score: 100 } : p) });
  assert.equal(next.exams.length, 2); assert.deepEqual(next.exams.find(e => e.exam.id === 'exam-b'), initial.exams.find(e => e.exam.id === 'exam-b'));
  assert.equal(lookupStatic(next, { examId: 'exam-a', name: '示例0' }).statistics.rank, 3);
  assert.throws(() => validateStaticScores({ schemaVersion: 1, exams: [a, a] }));
});

test('unscored exams and invalid imports cannot be published; empty site stays empty', () => {
  assert.deepEqual(validateStaticScores(emptyScores()).exams, []);
  assert.throws(() => makeStaticEntry({ ...fixture(), records: [{ id: 'p', name: '待录', status: 'pending', score: null }] }));
  assert.throws(() => makeStaticEntry({ ...fixture(), errors: ['分数无效'] }));
  assert.throws(() => validateStaticScores({ schemaVersion: 9, exams: [] }));
});
