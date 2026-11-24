import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import type { Exam, Person } from './types';
export function database() {
  if (!env.DB) throw new Error('成绩数据库尚未连接，请联系管理员。');
  return env.DB;
}
export async function isAdmin() {
  const user = await getChatGPTUser();
  const email = (env as unknown as { ADMIN_EMAIL?: string }).ADMIN_EMAIL;
  return Boolean(user && email && user.email.toLowerCase() === email.toLowerCase());
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' } });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
export function mapExam(row: Record<string, unknown>): Exam {
  return { id: String(row.id), title: String(row.title), date: String(row.date), maxScore: Number(row.max_score), scope: String(row.scope), provisional: Boolean(row.provisional), publication: String(row.publication), updatedAt: String(row.updated_at), publishedAt: row.published_at ? String(row.published_at) : null, total: row.total === undefined ? undefined : Number(row.total), roster: row.roster === undefined ? undefined : Number(row.roster) };
}
export function mapPerson(row: Record<string, unknown>): Person {
  return { id: String(row.id), name: String(row.name), department: String(row.department), subject: String(row.subject), venue: String(row.venue), status: String(row.status), score: row.score === null ? null : Number(row.score) };
}
