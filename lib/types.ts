export type Person = { id: string; name: string; department: string; subject: string; venue: string; status: string; score: number | null };
export type Exam = { id: string; title: string; date: string; maxScore: number; scope: string; provisional: boolean; publication: string; updatedAt: string; publishedAt: string | null; total?: number; roster?: number };
export type ParsedExam = { title: string; key: string; maxScore: number; dates: string[]; records: Person[]; errors: string[]; duplicateNames: number };
export type ParsedFile = { exams: ParsedExam[]; sourceSheets: string[]; sourceMode: string; warnings?: string[] };
export type StaticScores = { schemaVersion: number; updatedAt: string | null; exams: { exam: Exam; records: Person[] }[] };
