'use client';
import { useEffect, useRef, useState } from 'react';
import { Header, Footer, Arrow } from './components';
import type { Exam, Person } from '@/lib/types';
type Stats = { rank: number | null; total: number; percentile: number | null; topPercent: number | null; tied: number };
type Result = { person: Person; exam: Exam; statistics: Stats };
type PersonChoice = Pick<Person, 'id' | 'name' | 'department' | 'subject' | 'venue'>;
type QueryReply = Result | { choices: PersonChoice[] };
export type QuerySource = {
  exams(): Promise<{ exams: Exam[] }>;
  lookup(input: { name: string; examId: string; personId?: string }, signal: AbortSignal): Promise<QueryReply>;
};
const apiSource: QuerySource = {
  async exams() { const r = await fetch('/api/exams', { cache: 'no-store' }); const data = await r.json() as { exams: Exam[]; error?: string }; if (!r.ok) throw new Error(data.error); return data; },
  async lookup(input, signal) { const r = await fetch('/api/lookup', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); const data = await r.json() as QueryReply & { error?: string }; if (!r.ok) throw new Error(data.error); return data; },
};
const labels: Record<string,string> = { pending: '成绩待录入', absent: '本场缺考', excluded: '本场不参培' };
export default function TeacherQuery({ source = apiSource, homeHref = '/', manageHref = '/admin' }: { source?: QuerySource; homeHref?: string; manageHref?: string | null }) {
  const [exams, setExams] = useState<Exam[]>([]), [examId, setExamId] = useState(''), [name, setName] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null), [choices, setChoices] = useState<PersonChoice[]>([]);
  const [nameError, setNameError] = useState('');
  const nameInput = useRef<HTMLInputElement>(null);
  const queryVersion = useRef(0), activeQuery = useRef<AbortController | null>(null);
  async function refresh() {
    setLoading(true); setError('');
    try { const data = await source.exams(); setExams(data.exams); setExamId(old => data.exams.some((e: Exam) => e.id === old) ? old : data.exams[0]?.id || ''); }
    catch (e) { setError(e instanceof Error ? e.message : '无法连接服务，请重试。'); } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => () => activeQuery.current?.abort(), []);
  async function lookup(personId?: string) {
    if (!name.trim()) { setNameError('请输入完整姓名后查询。'); nameInput.current?.focus(); return; }
    const version = ++queryVersion.current;
    activeQuery.current?.abort();
    const controller = new AbortController(); activeQuery.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    setBusy(true); setError(''); setResult(null); setChoices([]);
    try { const data = await source.lookup({ name: name.trim(), examId, personId }, controller.signal); if (version !== queryVersion.current) return; if ('choices' in data) setChoices(data.choices); else setResult(data); }
    catch (e) { if (version === queryVersion.current) setError(controller.signal.aborted ? '查询超时，请检查网络后重试。' : e instanceof Error ? e.message : '网络连接失败，请重试。'); } finally { clearTimeout(timer); if (version === queryVersion.current) setBusy(false); }
  }
  function resetResult() { queryVersion.current++; activeQuery.current?.abort(); setBusy(false); setResult(null); setChoices([]); setError(''); setNameError(''); }
  return <><Header report={Boolean(result)} homeHref={homeHref} manageHref={manageHref}/><main id="main-content" tabIndex={-1} className={`teacher-main ${result ? 'has-report' : ''}`}>
    {result && <div className="page-intro"><h1>教资模拟考试查分</h1></div>}
    <div className="query-feedback" aria-live="polite" aria-atomic="true">
      {result && <section className="result-panel" aria-label="个人成绩报告">
        <header className="report-header"><div><h2>{result.person.name}</h2><p className="report-identity">{[result.person.department,result.person.subject,result.person.venue].filter(Boolean).join(' · ')}</p></div></header>
        <div className="report-exam"><h3>{result.exam.title}</h3><p>{result.exam.date || '以培训安排为准'}</p></div>
        {result.person.status === 'scored' ? <><div className="report-score-layout">
          <div className="score-primary"><p>本场成绩</p><div className="score-value"><strong>{result.person.score}</strong><span>/ {result.exam.maxScore} 分</span></div></div>
          <dl className="report-metrics"><div><dt>实考排名{result.statistics.tied > 1 && <small>同分并列</small>}</dt><dd>第 <b>{result.statistics.rank}</b> 名<span> / {result.statistics.total} 人</span></dd></div><div><dt>百分位次</dt><dd><b>{result.statistics.percentile?.toFixed(1)}</b><span>百分位</span></dd></div></dl>
          </div><div className="percentile-note"><p>你的成绩超过了 <strong>{result.statistics.percentile?.toFixed(1)}%</strong> 的实考老师。</p><div className="percentile-track" aria-hidden="true"><span style={{ width: `${result.statistics.percentile}%` }}/></div></div>
        </> : <div className="non-score"><h3>{labels[result.person.status] || '成绩暂不可用'}</h3><p>{result.person.status === 'pending' ? '本场尚未录入你的成绩，请稍后再查。' : '此状态不参与本场排名和百分位次计算。'}</p></div>}
      </section>}
    </div>
    <section className="query-panel" aria-label="成绩查询">
      {!result && <div className="page-intro"><h1>教资模拟考试查分</h1></div>}
      {loading ? <div className="empty-state loading-state" role="status"><span className="spinner" aria-hidden="true"/>正在读取已发布考试…</div> : exams.length ? <form className="query-form" noValidate aria-busy={busy} onSubmit={e => { e.preventDefault(); void lookup(); }}>
        <div className="form-field"><label htmlFor="exam">选择考试</label><select id="exam" name="examId" value={examId} onChange={e => { setExamId(e.target.value); resetResult(); }}>{exams.map(e => <option key={e.id} value={e.id}>{e.title}{exams.filter(other => other.title === e.title).length > 1 && e.date ? `（${e.date.replace(/\d{4}-(\d{2})-(\d{2})/g, '$1/$2')}）` : ''}</option>)}</select></div>
        <div className="form-field"><label htmlFor="teacher-name">姓名</label><input ref={nameInput} id="teacher-name" name="name" type="text" autoComplete="name" enterKeyHint="search" spellCheck={false} placeholder="请输入完整姓名…" maxLength={80} value={name} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'name-error' : undefined} onChange={e => { setName(e.target.value); resetResult(); }} required/>{nameError && <p id="name-error" className="field-error" role="alert">{nameError}</p>}</div>
        <button className="primary query-submit" disabled={busy} type="submit">{busy ? <><span className="spinner" aria-hidden="true"/>正在查询…</> : '查询成绩'}</button>
      </form> : <div className="empty-state"><h2>成绩尚未发布</h2><p>组织者完成登分并发布后，即可在这里查询。</p><button className="secondary" onClick={() => void refresh()}>刷新考试列表</button></div>}
      {error && <div className="notice error" role="alert">{error}{!exams.length && <button className="text-button" onClick={() => void refresh()}>重新加载</button>}</div>}
    </section>
    {choices.length > 0 && <section className="choice-panel" aria-live="polite"><h2>找到同名老师</h2><p className="muted">请选择与你一致的部门和考场。</p><div className="choice-list">{choices.map(p => <button key={p.id} className="choice" disabled={busy} onClick={() => void lookup(p.id)}><span><strong>{p.name}</strong><small>{[p.department,p.subject,p.venue].filter(Boolean).join(' · ') || '部门未填写'}</small></span><Arrow/></button>)}</div></section>}
    </main><Footer report={Boolean(result)}/></>;
}
