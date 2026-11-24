import { createRoot } from 'react-dom/client';
import TeacherQuery, { type QuerySource } from '../app/teacher-query';
import { lookupStatic, validateStaticScores } from '../lib/static-scores.mjs';
import '../app/globals.css';

let published: ReturnType<typeof validateStaticScores> | null = null;
const source: QuerySource = {
  async exams() {
    const response = await fetch(new URL('./scores.json', window.location.href), { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取成绩文件，请刷新后重试。');
    const data = validateStaticScores(await response.json());
    published = data;
    return { exams: data.exams.map(entry => entry.exam) };
  },
  async lookup(input, signal) {
    if (signal.aborted) throw new DOMException('已取消', 'AbortError');
    if (!published) throw new Error('请先刷新考试列表。');
    return lookupStatic(published, input) as Awaited<ReturnType<QuerySource['lookup']>>;
  },
};

createRoot(document.getElementById('root')!).render(<TeacherQuery source={source} homeHref="./" manageHref={null} />);
