import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Header, Footer } from '../app/components';
import type { ParsedFile } from '../lib/types';
import { emptyScores, makeStaticEntry, upsertStaticEntry, validateStaticScores } from '../lib/static-scores.mjs';
import { normalizeName } from '../lib/scoring.mjs';
import '../app/globals.css';

const statusNames: Record<string, string> = { scored: '已录分', pending: '未录入', absent: '缺考', excluded: '不参培', invalid: '需核对' };

function PrepareScores() {
  const [published, setPublished] = useState<ReturnType<typeof validateStaticScores>>(emptyScores());
  const [ready, setReady] = useState(false), [dirty, setDirty] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null), [choice, setChoice] = useState(0);
  const [targetId, setTargetId] = useState(''), [fileName, setFileName] = useState('');
  const [title, setTitle] = useState(''), [date, setDate] = useState(''), [maxScore, setMaxScore] = useState(150), [provisional, setProvisional] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [filter, setFilter] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const current = parsed?.exams[choice];
  const counts = useMemo(() => {
    const counts: Record<string, number> = { scored: 0, pending: 0, absent: 0, excluded: 0, invalid: 0 };
    current?.records.forEach(person => counts[person.status]++);
    return counts;
  }, [current]);

  async function loadPublished() {
    setReady(false); setError('');
    try {
      const response = await fetch(new URL('./scores.json', location.href), { cache: 'no-store' });
      if (!response.ok) throw new Error('无法读取已有成绩文件，请重新加载。');
      setPublished(validateStaticScores(await response.json())); setReady(true); setDirty(false);
    } catch (error) { setError(error instanceof Error ? error.message : '无法读取已有成绩文件，请重新加载。'); }
  }
  useEffect(() => { void loadPublished(); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function selectExam(index: number, data = parsed) {
    const exam = data?.exams[index]; if (!exam) return;
    setChoice(index); setTitle(exam.title); setDate(exam.dates.join(' / ')); setMaxScore(exam.maxScore); setFilter('');
    const existing = published.exams.find(entry => normalizeName(entry.exam.title) === normalizeName(exam.title) && entry.exam.date === exam.dates.join(' / '));
    setTargetId(existing?.exam.id || ''); setProvisional(existing?.exam.provisional ?? true); setMessage(''); setError('');
  }

  async function upload(file?: File) {
    if (!file) return;
    setError(''); setMessage('');
    if (!/\.xlsx$/i.test(file.name)) { setError('请上传.xlsx格式的Excel登分表。旧版.xls请先另存为.xlsx。'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('文件超过10MB，请移除无关图片或拆分工作簿。'); return; }
    setBusy(true);
    try {
      const { parseExcel } = await import('../lib/excel.mjs');
      const data = await parseExcel(await file.arrayBuffer()) as ParsedFile;
      if (!data.exams.length) throw new Error('没有找到可以导入的考试。');
      setParsed(data); setFileName(file.name);
      selectExam(Math.max(0, data.exams.findIndex(exam => /全真模拟/.test(exam.title))), data);
    } catch (error) { setError(error instanceof Error ? error.message : '解析失败，请重新上传。'); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  function addExam() {
    if (!ready || !current) return;
    setError(''); setMessage('');
    try {
      if (targetId && !window.confirm('确认用当前导入的数据替换这场考试？其他考试将保留。')) return;
      const entry = makeStaticEntry(current, { id: targetId || undefined, title, date, maxScore, provisional });
      setPublished(upsertStaticEntry(published, entry)); setTargetId(entry.exam.id); setDirty(true);
      setMessage('已加入待发布文件。下载后上传到GitHub，网页成绩才会更新。');
    } catch (error) { setError(error instanceof Error ? error.message : '无法生成成绩，请核对后重试。'); }
  }

  function download() {
    setError('');
    try {
      const verified = validateStaticScores(published);
      const url = URL.createObjectURL(new Blob([JSON.stringify(verified, null, 2)], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'scores.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDirty(false); setMessage('scores.json已下载。请将它上传到GitHub仓库的docs文件夹并提交。');
    } catch (error) { setError(error instanceof Error ? error.message : '下载失败，请重试。'); }
  }

  function removeExam(id: string) {
    if (!window.confirm('确认从待发布文件中移除这场考试？上传新文件后，该场将停止公开查询。')) return;
    setPublished({ ...published, updatedAt: new Date().toISOString(), exams: published.exams.filter(entry => entry.exam.id !== id) });
    setDirty(true); if (targetId === id) setTargetId(''); setMessage('已从待发布文件中移除。下载并上传后生效。');
  }

  const filtered = current?.records.filter(person => `${person.name}${person.department}${person.venue}`.includes(filter.trim())) || [];
  return <><Header admin homeHref="./" /><main id="main-content" tabIndex={-1} className="admin-main">
    <div className="admin-heading"><div><h1>成绩文件准备</h1><p className="muted">导入Excel并核对，下载成绩文件后上传到GitHub。</p></div><button className="primary" disabled={!ready || busy || !dirty} onClick={download}>下载成绩文件</button></div>
    <div className="admin-feedback" aria-live="polite">
      {error && <div className="notice error" role="alert">{error}{!ready && <button className="text-button" onClick={() => void loadPublished()}>重新加载</button>}</div>}
      {message && <div className="notice success" role="status">{message}</div>}
      {busy && <p className="busy-line" role="status"><span className="spinner" aria-hidden="true" />正在解析Excel…</p>}
    </div>
    <div className="admin-layout"><div className="admin-editor">
      <section className="working-panel"><h2>导入登分表</h2>
        <div className="upload-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) void upload(event.dataTransfer.files[0]); }}>
          <h3>{fileName || '选择现有Excel登分表'}</h3><p>支持.xlsx，最大10MB。文件在当前浏览器内解析。</p>
          <input ref={fileInput} className="visually-hidden" id="excel-file" name="excelFile" type="file" tabIndex={-1} aria-label="上传Excel登分表" accept=".xlsx" disabled={busy} onChange={event => void upload(event.target.files?.[0])} />
          <button className="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? '正在解析…' : fileName ? '重新上传Excel' : '选择Excel文件'}</button>
        </div>
        {parsed && <><p className="field-help">{parsed.sourceMode}</p><label htmlFor="source-exam">选择本次导入的成绩列</label><select id="source-exam" name="sourceExam" disabled={busy} value={choice} onChange={event => selectExam(Number(event.target.value))}>{parsed.exams.map((exam, index) => <option value={index} key={exam.key}>{exam.title}（{exam.records.filter(person => person.status === 'scored').length}人已录分）</option>)}</select>{parsed.warnings?.map(warning => <p className="notice" key={warning}>{warning}</p>)}</>}
      </section>
      {current && <section className="working-panel"><h2>发布设置</h2>
        <label htmlFor="target">保存到哪场考试</label><select id="target" name="targetExam" value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">新建一场考试</option>{published.exams.map(entry => <option key={entry.exam.id} value={entry.exam.id}>{entry.exam.title}（{entry.exam.date}）</option>)}</select>
        <label htmlFor="exam-title">考试名称</label><input id="exam-title" name="examTitle" autoComplete="off" maxLength={120} value={title} onChange={event => setTitle(event.target.value)} />
        <div className="form-pair"><div><label htmlFor="exam-date">考试日期</label><input id="exam-date" name="examDate" autoComplete="off" maxLength={30} value={date} onChange={event => setDate(event.target.value)} /></div><div><label htmlFor="maximum">满分</label><input id="maximum" name="maxScore" type="number" inputMode="decimal" min={1} max={1000} value={maxScore} onChange={event => setMaxScore(Number(event.target.value))} /></div></div>
        <label className="checkbox-label"><input type="checkbox" checked={provisional} onChange={event => setProvisional(event.target.checked)} /><span>标注为暂定排名<small>还有补考、其他场次或未录入成绩时保留勾选。</small></span></label>
        {!!current.errors.length && <div className="notice error" role="alert">{current.errors.slice(0, 10).map(issue => <p key={issue}>{issue}</p>)}</div>}
        <div className="publish-actions"><button className="primary" onClick={addExam} disabled={!ready || busy || !counts.scored || !!counts.invalid || !title.trim()}>加入待发布成绩</button></div>
        {!counts.scored && <p className="field-help">本场尚无有效分数，登分后重新上传。</p>}
      </section>}
    </div>
    {current && <section className="working-panel preview-panel"><div className="preview-heading"><h2>导入预览</h2><span>{current.records.length}条记录</span></div>
      <dl className="count-strip">{Object.entries(counts).map(([key, value]) => <div key={key}><dt>{statusNames[key]}</dt><dd>{value}</dd></div>)}</dl>
      <label htmlFor="preview-search">筛选预览记录</label><input id="preview-search" name="previewSearch" type="search" className="preview-search" autoComplete="off" spellCheck={false} placeholder="输入姓名、部门或考场…" value={filter} onChange={event => setFilter(event.target.value)} />
      <div className="table-scroll" role="region" aria-label="导入成绩预览" tabIndex={0}><table role="table"><caption className="visually-hidden">导入成绩预览</caption><thead><tr><th scope="col">姓名</th><th scope="col">部门 / 学科</th><th scope="col">考场</th><th scope="col" className="numeric">成绩</th><th scope="col">状态</th></tr></thead><tbody>{filtered.map(person => <tr key={person.id}><td>{person.name}</td><td>{person.department}<small>{person.subject}</small></td><td>{person.venue}</td><td className="numeric">{person.status === 'scored' ? person.score : '—'}</td><td>{statusNames[person.status]}</td></tr>)}</tbody></table>{!filtered.length && <p className="empty-state">没有符合筛选条件的记录。</p>}</div>
    </section>}
    <aside className="admin-aside"><section className="working-panel"><h2>待发布的考试</h2>{published.exams.length ? <div className="saved-exams">{published.exams.map(entry => <article key={entry.exam.id}><h3>{entry.exam.title}</h3><p>{entry.exam.date}<br />{entry.exam.total ?? entry.records.filter(person => person.status === 'scored').length}人已录分，共{entry.records.length}条记录</p><button className="text-button danger-text" onClick={() => removeExam(entry.exam.id)}>移除此场</button></article>)}</div> : <p className="muted">尚未加入考试成绩。</p>}</section><section className="aside-notes"><h2>更新顺序</h2><ol><li>导入已完成登分的Excel。</li><li>核对成绩列和人数，加入待发布成绩。</li><li>下载scores.json。</li><li>上传到GitHub仓库的docs文件夹并提交。</li></ol><p>此页面不会直接修改线上成绩。</p></section></aside>
    </div>
  </main><Footer admin /></>;
}

createRoot(document.getElementById('root')!).render(<PrepareScores />);
