import { useEffect, useState, type FormEvent } from 'react';
import type { SyllabusInfo } from '../../lib/syllabus';
import { askAgent, createAgentSession } from '../../lib/agent';

type Message = { role: 'assistant' | 'user'; text: string };

const intro = 'Hi Jamie! Let’s work through cell structure and function. Choose a topic below, or ask about membranes, enzymes, or organelles.';

function fallbackReply(text: string, hints: boolean, syllabus: SyllabusInfo | null) {
  if (/homework|assignment|problem \d|give me.*answer/i.test(text) && (hints || syllabus?.policy.disallowDirectAnswers)) {
    return 'Your instructor has enabled guided help for assigned work. Tell me what you’ve tried and where you got stuck. We can work through the next step together.';
  }
  if (/membrane|transport|diffusion|osmosis/i.test(text)) return 'The cell membrane is selectively permeable. Small, nonpolar molecules can diffuse through its lipid bilayer. Other substances need transport proteins. Passive transport follows a concentration gradient; active transport needs energy to move against one.\n\nWhy would a cell need energy to move ions from a low concentration to a high concentration?';
  if (/enzyme|reaction|activation/i.test(text)) return 'Enzymes speed up reactions by lowering activation energy. Their active sites bind specific substrates, and changes in temperature or pH can alter their shape.\n\nWhat might happen if the active site changes shape so the substrate no longer fits?';
  if (/organelle|cell|golgi|lysosome/i.test(text)) return 'Ribosomes build proteins, the Golgi apparatus modifies and sorts them, and lysosomes break down material for recycling.\n\nWhich organelle would help a cell recycle a damaged component?';
  if (/review|summary/i.test(text)) return 'Chapter 3 review\n\n1. Compare passive diffusion with active transport.\n2. Explain activation energy and an enzyme active site.\n3. Describe ribosome, Golgi apparatus, and lysosome roles.';
  return 'The learner agent is unavailable right now. Ask about membrane transport, enzymes, or organelles for a prepared explanation.';
}

export function Study({ hints, syllabus }: { hints: boolean; syllabus: SyllabusInfo | null }) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', text: intro }]);
  const [input, setInput] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');

  useEffect(() => {
    let active = true;
    void createAgentSession(syllabus).then((session) => {
      if (!active) return;
      setRunId(session.run_id);
      setAgentStatus('connected');
    }).catch(() => {
      if (active) setAgentStatus('offline');
    });
    return () => { active = false; };
  }, [syllabus]);

  function send(text: string) {
    const question = text.trim();
    if (!question) return;
    setMessages((old) => [...old, { role: 'user', text: question }]);
    setInput('');
    if (!runId) {
      setMessages((old) => [...old, { role: 'assistant', text: fallbackReply(question, hints, syllabus) }]);
      return;
    }
    void askAgent(runId, question).then((response) => {
      setMessages((old) => [...old, { role: 'assistant', text: response.answer }]);
    }).catch(() => {
      setAgentStatus('offline');
      setMessages((old) => [...old, { role: 'assistant', text: fallbackReply(question, hints, syllabus) }]);
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  return <div className="study-layout">
    <section className="panel chat">
      <div className="section-heading">
        <div className="chat-title"><span className="assistant-icon">✧</span><div><h2>Your study companion</h2><small>Chapter 3 · Cell structure &amp; function</small></div></div>
        <button className="text-button" onClick={() => setMessages([{ role: 'assistant', text: intro }])}>New chat</button>
      </div>
      <div className="messages" role="log" aria-label="Study conversation" aria-live="polite">
        {messages.map((message, i) => <div key={i} className={`message ${message.role}`}><span className="eyebrow">{message.role === 'user' ? 'YOU' : 'STUDY BUDDY'}</span><p>{message.text}</p></div>)}
      </div>
      {messages.length === 1 && <div className="suggestions">{['Explain membrane transport', 'How do enzymes work?', 'Make a review sheet'].map((prompt) => <button className="secondary" key={prompt} onClick={() => send(prompt)}>{prompt} ↗</button>)}</div>}
      <form className="composer" onSubmit={submit}><label className="sr-only" htmlFor="question">Ask a course question</label><input id="question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="What would you like to understand?" maxLength={2000} /><button className="primary" disabled={!input.trim()} type="submit" aria-label="Send message">↑</button></form>
      <small className="chat-disclaimer">{agentStatus === 'connected' ? 'Connected to your grounded learner agent' : agentStatus === 'connecting' ? 'Connecting to your learner agent…' : 'Agent unavailable · using prepared demo responses'}</small>
    </section>
    <aside><section className="scope-card"><span className="eyebrow">YOUR LEARNING SPACE</span><h3>Grounded in your course.</h3><p>Currently exploring Chapter 3: cell structure and function.</p><hr /><strong>Instructor guidance</strong><p>{hints ? 'Guiding questions first. Share your attempt before asking for homework help.' : 'Concept explanations and sample review responses are enabled.'}</p><hr /><strong>Your syllabus</strong><p>{syllabus ? `${syllabus.courseName} · ${syllabus.topics.length} topic(s) in scope` : 'No syllabus uploaded yet — add one from the Materials tab.'}</p><span className="badge mastered">✓ Practice is encouraged</span></section></aside>
  </div>;
}
