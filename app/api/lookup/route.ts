import { database, json, mapPerson, mapExam, sameOrigin } from '@/lib/server';
import { normalizeName } from '@/lib/scoring.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效。' }, 403);
  try {
    if (Number(request.headers.get('content-length') || 0) > 4096) return json({ error: '查询内容过长。' }, 413);
    const body = await request.json() as { name: string; examId: string; personId?: string };
    if (!body || typeof body !== 'object') return json({ error: '查询内容无效。' }, 400);
    const name = normalizeName(body.name);
    if (!name || name.length > 80 || typeof body.examId !== 'string' || body.examId.length > 80) return json({ error: '请先选择考试并输入完整姓名。' }, 400);
    const db = database();
    const examRow = await db.prepare("SELECT * FROM exams WHERE id=? AND publication='published'").bind(body.examId).first();
    if (!examRow) return json({ error: '这场考试尚未发布或已撤回，请刷新后重试。' }, 404);
    const rows = await db.prepare('SELECT * FROM participants WHERE exam_id=? AND lookup_name=? ORDER BY department,venue,id LIMIT 30').bind(body.examId, name).all();
    if (!rows.results.length) return json({ error: '没有找到这个姓名。请核对姓名和考试，仍无结果请联系培训组织者。' }, 404);
    if (rows.results.length > 1 && !body.personId) return json({ choices: rows.results.map(mapPerson).map(({ id, name, department, subject, venue }) => ({ id, name, department, subject, venue })) });
    const row = body.personId ? rows.results.find(r => r.id === body.personId) : rows.results[0];
    if (!row) return json({ error: '未找到对应记录，请重新输入姓名查询。' }, 404);
    const person = mapPerson(row);
    const stats = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN score>? THEN 1 ELSE 0 END) AS higher, SUM(CASE WHEN score<? THEN 1 ELSE 0 END) AS lower, SUM(CASE WHEN score=? THEN 1 ELSE 0 END) AS tied FROM participants WHERE exam_id=? AND status='scored'").bind(person.score ?? 0, person.score ?? 0, person.score ?? 0, body.examId).first();
    const n = Number(stats?.total || 0), rank = Number(stats?.higher || 0) + 1;
    return json({ exam: mapExam(examRow), person, statistics: { total: n, rank: person.status === 'scored' ? rank : null, percentile: person.status === 'scored' && n ? Math.round(Number(stats?.lower || 0) / n * 1000) / 10 : null, topPercent: person.status === 'scored' && n ? Math.round(rank / n * 1000) / 10 : null, tied: person.status === 'scored' ? Number(stats?.tied || 0) : 0 } });
  } catch { return json({ error: '查询服务暂时不可用，请稍后重试。' }, 503); }
}
