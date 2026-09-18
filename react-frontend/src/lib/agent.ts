import type { SyllabusInfo } from './syllabus';

// Keep the agent key server-side. The Vite dev proxy (or a production backend
// proxy) adds Authorization before forwarding this same-origin request.
const AGENT_BASE = '/agent';

type AgentSession = { run_id: string; status: string };
type AgentChatResponse = { answer: string; mode?: string; citations?: { source_id: string; quote: string }[] };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${AGENT_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Learner agent unavailable (${response.status}): ${detail.slice(0, 240)}`);
  }
  return response.json() as Promise<T>;
}

const fallbackSource = `Chapter 3: Cell structure and function.
The cell membrane is selectively permeable. Small, nonpolar molecules can diffuse through its lipid bilayer. Active transport uses energy to move substances against a concentration gradient.
Enzymes lower activation energy. Their active sites bind specific substrates, and changes in temperature or pH can alter their shape.
Ribosomes build proteins, the Golgi apparatus modifies and sorts them, and lysosomes break down material for recycling.`;

export async function createAgentSession(syllabus: SyllabusInfo | null): Promise<AgentSession> {
  const sourceText = syllabus?.sourceText || fallbackSource;
  return request<AgentSession>('/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({
      course_id: 'bio-101',
      learner_id: 'demo-student',
      sources: [{ source_id: syllabus?.fileName || 'bio-101-chapter-3', title: syllabus?.courseName || 'BIO 101 course material', text: sourceText, version: '1' }],
      scope: {
        included_topics: syllabus?.topics || ['cell structure and function'],
        excluded_topics: [],
        current_material_only: syllabus?.policy.restrictToSyllabusTopics ?? true,
        direct_homework_answers: !(syllabus?.policy.disallowDirectAnswers ?? true),
        require_attempt_before_help: syllabus?.policy.requireAttemptFirst ?? true,
      },
    }),
  });
}

export function askAgent(runId: string, message: string): Promise<AgentChatResponse> {
  return request<AgentChatResponse>('/v1/chat', {
    method: 'POST',
    body: JSON.stringify({ run_id: runId, message }),
  });
}
