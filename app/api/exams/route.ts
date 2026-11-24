import { database, json, mapExam } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const rows = await database().prepare("SELECT e.*, (SELECT COUNT(*) FROM participants p WHERE p.exam_id=e.id AND p.status='scored') AS total FROM exams e WHERE publication='published' ORDER BY date DESC, updated_at DESC").all();
    return json({ exams: rows.results.map(mapExam) });
  } catch { return json({ error: '暂时无法连接成绩服务，请稍后重试。' }, 503); }
}
