import { database, isAdmin, json, mapExam, mapPerson, sameOrigin } from '@/lib/server';
import { validateImport } from '@/lib/scoring.mjs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!await isAdmin()) return json({ error: '请使用管理员账号登录。' }, 403);
  try {
    const db = database(), id = new URL(request.url).searchParams.get('id');
    if (id) {
      const exam = await db.prepare('SELECT * FROM exams WHERE id=?').bind(id).first();
      if (!exam) return json({ error: '考试不存在。' }, 404);
      const rows = await db.prepare('SELECT * FROM participants WHERE exam_id=? ORDER BY id').bind(id).all();
      return json({ exam: mapExam(exam), records: rows.results.map(mapPerson) });
    }
    const rows = await db.prepare("SELECT e.*, (SELECT COUNT(*) FROM participants p WHERE p.exam_id=e.id AND p.status='scored') AS total, (SELECT COUNT(*) FROM participants p WHERE p.exam_id=e.id) AS roster FROM exams e ORDER BY date DESC,updated_at DESC").all();
    return json({ exams: rows.results.map(mapExam) });
  } catch { return json({ error: '无法读取成绩，请稍后重试。' }, 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: '请求来源无效。' }, 403);
  if (!await isAdmin()) return json({ error: '请使用管理员账号登录。' }, 403);
  try {
    const text = await request.text();
    if (text.length > 1500000) return json({ error: '数据过大，请拆分文件。' }, 413);
    const clean = validateImport(JSON.parse(text));
    const db = database(), id = clean.exam.id || crypto.randomUUID(), now = new Date().toISOString();
    if (clean.exam.id && !await db.prepare('SELECT id FROM exams WHERE id=?').bind(id).first()) return json({ error: '原考试已不存在，请选择新建考试。' }, 404);
    const e = clean.exam;
    const statements = [db.prepare('INSERT INTO exams (id,title,date,max_score,scope,provisional,publication,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,date=excluded.date,max_score=excluded.max_score,scope=excluded.scope,provisional=excluded.provisional,publication=excluded.publication,updated_at=excluded.updated_at,published_at=excluded.published_at').bind(id,e.title,e.date,e.maxScore,e.scope,e.provisional?1:0,e.publication,now,e.publication==='published'?now:null), db.prepare('DELETE FROM participants WHERE exam_id=?').bind(id)];
    for (const [index, p] of clean.records.entries()) statements.push(db.prepare('INSERT INTO participants (id,exam_id,name,lookup_name,department,subject,venue,status,score) VALUES (?,?,?,?,?,?,?,?,?)').bind(`${id}_r${index+1}`,id,p.name,p.lookupName,p.department,p.subject,p.venue,p.status,p.score));
    await db.batch(statements);
    return json({ id, message: e.publication === 'published' ? '成绩已发布，老师现在可以查询。' : '已保存草稿，老师暂时无法查询本场。' });
  } catch (error) { return json({ error: error instanceof Error && !/D1|SQL|constraint|database/i.test(error.message) ? error.message : '保存失败，请重试，原有成绩未被替换。' }, 400); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request) || !await isAdmin()) return json({ error: '无管理权限。' }, 403);
  try {
    const { id, action } = await request.json() as { id: string; action: string };
    if (typeof id !== 'string' || action !== 'withdraw') return json({ error: '操作无效。' }, 400);
    await database().prepare("UPDATE exams SET publication='draft',published_at=NULL,updated_at=? WHERE id=?").bind(new Date().toISOString(),id).run();
    return json({ message: '已撤回发布，成绩记录仍保留在草稿中。' });
  } catch { return json({ error: '撤回失败，请稍后重试。' }, 503); }
}
