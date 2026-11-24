'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Header, Footer } from '../components';
import type { Exam, ParsedFile, Person } from '@/lib/types';
const statusNames: Record<string,string> = { scored: '已录分', pending: '未录入', absent: '缺考', excluded: '不参培', invalid: '需核对' };
type AdminResponse = { error?: string; exams: Exam[]; exam: Exam; records: Person[]; id: string; message: string };
async function request(url: string, options?: RequestInit) { const r = await fetch(url, options); const data = await r.json() as AdminResponse; if (!r.ok) throw new Error(data.error || '请求失败，请重试。'); return data; }
export default function Admin() {
  const [existing, setExisting] = useState<Exam[]>([]), [targetId, setTargetId] = useState('');
  const [parsed, setParsed] = useState<ParsedFile | null>(null), [choice, setChoice] = useState(0), [fileName, setFileName] = useState('');
  const [title, setTitle] = useState(''), [date, setDate] = useState(''), [maxScore, setMaxScore] = useState(150), [scope, setScope] = useState('本场全部考场已录入有效成绩的实考老师'), [provisional, setProvisional] = useState(true);
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [filter, setFilter] = useState('');
  const [replaceReady, setReplaceReady] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const current = parsed?.exams[choice];
  const counts = useMemo(() => { const c: Record<string,number> = { scored: 0, pending: 0, absent: 0, excluded: 0, invalid: 0 }; current?.records.forEach(r => c[r.status]++); return c; }, [current]);
  const issues = current ? [...current.errors, ...current.records.filter(r => r.status === 'scored' && (r.score as number) > maxScore).map(r => `${r.name}的分数高于当前满分${maxScore}`)] : [];
  async function reload() { try { const data = await request('/api/admin/exams'); setExisting(data.exams); } catch (e) { setError(e instanceof Error ? e.message : '加载失败'); } }
  useEffect(() => { void reload(); }, []);
  function selectExam(index: number, source = parsed) { const e = source?.exams[index]; if (!e) return; setChoice(index); setTitle(e.title); setMaxScore(e.maxScore); setDate(e.dates.join(' / ')); setFilter(''); setMessage(''); setReplaceReady(false); }
  async function upload(file?: File) {
    if (!file) return;
    setError(''); setMessage('');
    if (!/\.xlsx$/i.test(file.name)) { setError('请上传.xlsx格式的Excel登分表。旧版.xls请先另存为.xlsx。'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('文件超过10MB，请移除无关图片或拆分工作簿。'); return; }
    setBusy('正在解析Excel');
    try { const { parseExcel } = await import('@/lib/excel.mjs'); const data = await parseExcel(await file.arrayBuffer()) as ParsedFile; if (!data.exams.length) throw new Error('没有找到可以导入的考试。'); setParsed(data); setFileName(file.name); const index = Math.max(0, data.exams.findIndex(e => /全真模拟/.test(e.title))); selectExam(index, data); setReplaceReady(false); }
    catch (e) { setError(e instanceof Error ? e.message : '解析失败，请重新上传。'); } finally { setBusy(''); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function loadExisting(id: string) {
    setReplaceReady(false); setMessage(''); setError('');
    if (!id) { setTargetId(''); return; }
    setBusy('正在读取已保存成绩');
    try { const data = await request(`/api/admin/exams?id=${encodeURIComponent(id)}`); const e = data.exam; setParsed({ exams: [{ title: e.title, key: e.id, maxScore: e.maxScore, dates: e.date ? [e.date] : [], records: data.records.map((p: Person, i: number) => ({ ...p, id: `r${i + 1}` })), errors: [], duplicateNames: new Set(data.records.filter((p: Person, i: number, all: Person[]) => all.findIndex(x => x.name === p.name) !== i).map((p: Person) => p.name)).size }], sourceSheets: [], sourceMode: '当前为服务端已保存记录。上传新的Excel后，可替换这一场考试。' }); setChoice(0); setTitle(e.title); setDate(e.date); setMaxScore(e.maxScore); setScope(e.scope); setProvisional(e.provisional); setFileName('已保存的成绩记录'); setTargetId(id); }
    catch (e) { setError(e instanceof Error ? e.message : '读取失败'); } finally { setBusy(''); }
  }
  async function save(publish: boolean) {
    if (!current) return;
    setError(''); setMessage('');
    if (issues.length) { setError('请先修正Excel中需要核对的成绩，再重新上传。'); return; }
    if (targetId && existing.find(e => e.id === targetId)?.publication === 'published' && !replaceReady) { setError('请勾选确认替换，以免误改已发布成绩。'); return; }
    setBusy(publish ? '正在发布成绩' : '正在保存草稿');
    try { const data = await request('/api/admin/exams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exam: { id: targetId, title, date, maxScore, scope, provisional }, records: current.records, publish }) }); setTargetId(data.id); setMessage(data.message); setReplaceReady(false); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试。'); } finally { setBusy(''); }
  }
  async function withdraw(id: string) { setBusy('正在撤回发布'); setError(''); setMessage(''); try { const data = await request('/api/admin/exams', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'withdraw' }) }); setMessage(data.message); await reload(); } catch (e) { setError(e instanceof Error ? e.message : '撤回失败'); } finally { setBusy(''); } }
  async function copyLink() { try { await navigator.clipboard.writeText(window.location.origin + '/'); setMessage('老师查分链接已复制，可粘贴到培训群。'); } catch { setMessage(`老师查分地址：${window.location.origin}/`); } }
  const filtered = current?.records.filter(r => `${r.name}${r.department}${r.venue}`.includes(filter.trim())) || [];
  return <><Header admin/><main id="main-content" tabIndex={-1} className="admin-main"><div className="admin-heading"><div><h1>成绩管理</h1><p className="muted">上传Excel，核对后统一发布。老师只需输入姓名。</p></div><button className="secondary" onClick={() => void copyLink()}>复制老师查分链接</button></div>
    <div className="admin-feedback" aria-live="polite">{error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice success" role="status">{message}</div>}{parsed?.warnings?.map(warning => <p className="notice" key={warning}>{warning}</p>)}{busy && <p className="busy-line" role="status"><span className="spinner" aria-hidden="true"/>{busy}…</p>}</div>
    <div className="admin-layout"><div className="admin-editor"><section className="working-panel"><h2>导入登分表</h2><label htmlFor="target">保存到哪场考试</label><select id="target" name="targetExam" value={targetId} onChange={e => void loadExisting(e.target.value)} disabled={Boolean(busy)}><option value="">新建一场考试</option>{existing.map(e => <option key={e.id} value={e.id}>{e.title}（{e.publication === 'published' ? '已发布' : '草稿'}）</option>)}</select>
      <div className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) void upload(e.dataTransfer.files[0]); }}><h3>{fileName || '选择现有Excel登分表'}</h3><p>支持.xlsx，最大10MB。可直接拖入文件。</p><input className="visually-hidden" ref={fileInput} id="excel-file" name="excelFile" aria-label="上传Excel登分表" type="file" tabIndex={-1} accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => void upload(e.target.files?.[0])} disabled={Boolean(busy)}/><button className="secondary" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)}>{busy === '正在解析Excel' ? <><span className="spinner" aria-hidden="true"/>正在解析…</> : fileName ? '重新上传Excel' : '选择Excel文件'}</button></div>
      {parsed && <><p className="field-help">{parsed.sourceMode}</p>{parsed.sourceSheets.length > 0 && <p className="field-help">读取工作表：{parsed.sourceSheets.join('、')}</p>}<label htmlFor="source-exam">选择本次导入的成绩列</label><select id="source-exam" name="sourceExam" value={choice} disabled={Boolean(busy)} onChange={e => selectExam(Number(e.target.value))}>{parsed.exams.map((e, i) => <option key={e.key} value={i}>{e.title}（{e.records.filter(r => r.status === 'scored').length}人已录分）</option>)}</select></>}
    </section>
    {current && <section className="working-panel"><h2>发布设置</h2><label htmlFor="exam-title">考试名称</label><input id="exam-title" name="examTitle" autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} maxLength={120}/><div className="form-pair"><div><label htmlFor="exam-date">考试日期</label><input id="exam-date" name="examDate" autoComplete="off" value={date} onChange={e => setDate(e.target.value)} maxLength={30}/></div><div><label htmlFor="maximum">满分</label><input id="maximum" name="maxScore" type="number" inputMode="decimal" autoComplete="off" min="1" max="1000" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))}/></div></div><label htmlFor="ranking-scope">排名范围说明</label><input id="ranking-scope" name="rankingScope" autoComplete="off" value={scope} onChange={e => setScope(e.target.value)} maxLength={160}/><label className="checkbox-label"><input type="checkbox" checked={provisional} onChange={e => setProvisional(e.target.checked)}/><span>标注为暂定排名<small>还有补考、其他场次或未录入成绩时保留勾选。</small></span></label>
      {targetId && existing.find(e => e.id === targetId)?.publication === 'published' && <label className="checkbox-label replace-confirm"><input type="checkbox" checked={replaceReady} onChange={e => setReplaceReady(e.target.checked)}/><span>确认用当前数据替换这场已发布成绩<small>保存草稿将同时撤下这场考试的公开查询。</small></span></label>}
      <div className="publish-actions"><button className="secondary" onClick={() => void save(false)} disabled={Boolean(busy) || issues.length > 0 || !title.trim()}>{busy === '正在保存草稿' ? <><span className="spinner" aria-hidden="true"/>正在保存…</> : '保存草稿'}</button><button className="primary" onClick={() => void save(true)} disabled={Boolean(busy) || issues.length > 0 || !counts.scored || !title.trim()}>{busy === '正在发布成绩' ? <><span className="spinner" aria-hidden="true"/>正在发布…</> : '发布成绩'}</button></div>{!counts.scored && <p className="field-help">本场还没有有效分数，可先保存草稿，登分后重新上传发布。</p>}
    </section>}
    </div>
    {current && <section className="working-panel preview-panel"><div className="preview-heading"><h2>导入预览</h2><span>{current.records.length}条记录</span></div><dl className="count-strip">{Object.entries(counts).map(([key,value]) => <div key={key}><dt>{statusNames[key]}</dt><dd>{value}</dd></div>)}</dl>{current.duplicateNames > 0 && <p className="notice">发现{current.duplicateNames}个同名姓名，查询时会让老师选择部门和考场。</p>}{issues.length > 0 && <div className="notice error"><strong>有{issues.length}项需要修正，暂不能保存或发布。</strong><ul>{issues.slice(0,10).map((issue,i) => <li key={i}>{issue}</li>)}</ul>{issues.length>10 && <p>其余问题请在Excel中继续核对。</p>}</div>}<label htmlFor="preview-search">筛选预览记录</label><input id="preview-search" name="previewSearch" type="search" autoComplete="off" spellCheck={false} className="preview-search" placeholder="输入姓名、部门或考场…" value={filter} onChange={e => setFilter(e.target.value)}/><div className="table-scroll" role="region" aria-label="导入成绩预览" tabIndex={0}><table role="table"><caption className="visually-hidden">导入成绩预览</caption><thead><tr><th scope="col">姓名</th><th scope="col">部门 / 学科</th><th scope="col">考场</th><th scope="col" className="numeric">成绩</th><th scope="col">状态</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.department}<small>{p.subject}</small></td><td>{p.venue}</td><td className="numeric">{p.status === 'scored' ? p.score : '—'}</td><td><span className={p.status==='invalid'?'danger-text':''}>{statusNames[p.status]}</span></td></tr>)}</tbody></table>{!filtered.length && <p className="empty-state">没有符合筛选条件的记录。</p>}</div></section>}
    <aside className="admin-aside"><section className="working-panel"><h2>已保存的考试</h2>{!existing.length ? <p className="muted">还没有保存记录。先上传Excel并选择一场考试。</p> : <div className="saved-exams">{existing.map(e => <article key={e.id}><div><h3>{e.title}</h3><span className={`status-label ${e.publication === 'published' ? 'published' : ''}`}>{e.publication === 'published' ? '已发布' : '草稿'}</span></div><p>{e.date || '未设置日期'}<br/>{e.total}人已录分，共{e.roster}条记录</p><div className="row-actions"><button className="text-button" onClick={() => void loadExisting(e.id)} disabled={Boolean(busy)}>查看 / 更新</button>{e.publication === 'published' && <button className="text-button danger-text" onClick={() => void withdraw(e.id)} disabled={Boolean(busy)}>撤回发布</button>}</div></article>)}</div>}</section><section className="aside-notes"><h2>使用顺序</h2><ol><li>各考场完成Excel登分并保存。</li><li>上传文件，选择本次考试列。</li><li>核对人数、满分、缺考与排名范围。</li><li>发布后，将查分链接发到培训群。</li></ol><p>姓名查询无需登录；管理员入口只允许本站所有者使用。</p></section></aside></div>


  </main><Footer admin/></>;
}
