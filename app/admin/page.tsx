import { getChatGPTUser, chatGPTSignInPath } from '../chatgpt-auth';
import { isAdmin } from '@/lib/server';
import { Header, Footer } from '../components';
import Admin from './upload';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (!user) return <><Header admin/><main id="main-content" tabIndex={-1} className="teacher-main"><section className="query-panel login-panel"><h1>成绩管理</h1><p>使用本站所有者的ChatGPT账号登录后，上传、预览和发布成绩。</p><a className="primary full" href={chatGPTSignInPath('/admin')} target="_top">管理员登录</a><a className="quiet-link" href="/">返回老师查分页面</a></section></main><Footer admin/></>;
  if (!await isAdmin()) return <><Header admin/><main id="main-content" tabIndex={-1} className="teacher-main"><section className="query-panel login-panel"><h1>此账号没有管理权限</h1><p>请使用创建本站的账号登录。老师查询成绩无需登录。</p><a className="secondary full" href="/signout-with-chatgpt?return_to=/admin" target="_top">切换账号</a></section></main><Footer admin/></>;
  return <Admin/>;
}
