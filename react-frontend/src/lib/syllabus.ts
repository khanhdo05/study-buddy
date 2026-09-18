export type SyllabusPolicy = {
  disallowDirectAnswers: boolean;
  requireAttemptFirst: boolean;
  restrictToSyllabusTopics: boolean;
};

export type SyllabusInfo = {
  fileName: string;
  uploadedAt: string;
  courseName: string;
  topics: string[];
  integrityNotice: string | null;
  policy: SyllabusPolicy;
  warnings: string[];
};

const STORAGE_KEY = 'study-buddy-syllabus-v1';

export function loadSyllabusInfo(): SyllabusInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SyllabusInfo) : null;
  } catch {
    return null;
  }
}

export function saveSyllabusInfo(info: SyllabusInfo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    /* Private browsing or a full quota — the session still works without persistence. */
  }
}

function findCourseName(text: string): string {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^course/i.test(l));
  if (line) return line.split(':').slice(1).join(':').trim() || line;
  return text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) || 'Untitled course';
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*(chapter|ch\.?)\s*\d+\s*[:\-–]\s*(.+)$/i);
    if (match) topics.push(match[2].trim());
  }
  return topics;
}

function extractIntegrityNotice(text: string): string | null {
  const keywordPattern = /academic integrity|honor code|plagiarism|generative ai|use of ai/i;
  const paragraph = text.split(/\n\s*\n/).find((p) => keywordPattern.test(p));
  if (!paragraph) return null;
  const sentences = paragraph.replace(/\s*\n\s*/g, ' ').split(/(?<=[.!?])\s+/);
  const sentence = sentences.find((s) => keywordPattern.test(s)) ?? paragraph;
  return sentence.trim().slice(0, 400);
}

// Heuristic stand-in for the real syllabus-extraction LLM call described in
// the root README ("AI extracts suggested topics and learning objectives").
// It reads the uploaded text and derives the guardrails Study.tsx enforces.
// Swap this function's body for a backend call once that endpoint exists —
// callers only depend on the SyllabusInfo shape it returns.
export function extractSyllabusInfo(text: string, fileName: string): SyllabusInfo {
  const warnings: string[] = [];
  const topics = extractTopics(text);
  const integrityNotice = extractIntegrityNotice(text);
  const requireAttemptFirst = /attempt.{0,20}before|show your attempt|prior attempt required/i.test(text);
  const relaxDirectAnswers = /ai (may|can) (give|provide) direct answers|no restrictions on ai/i.test(text);

  if (topics.length === 0) {
    warnings.push('No "Chapter N: Title" lines found, so topic scope stays open. Try the sample syllabus to see it in action.');
  }
  if (!integrityNotice) {
    warnings.push('No academic-integrity clause found — guided hints stay on by default either way.');
  }

  return {
    fileName,
    uploadedAt: new Date().toISOString(),
    courseName: findCourseName(text),
    topics,
    integrityNotice,
    warnings,
    policy: {
      disallowDirectAnswers: !relaxDirectAnswers,
      requireAttemptFirst,
      restrictToSyllabusTopics: topics.length > 0,
    },
  };
}
