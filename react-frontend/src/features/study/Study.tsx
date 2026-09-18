import { useState, type FormEvent } from 'react';
import type { SyllabusInfo } from '../../lib/syllabus';
import { useAccessibility } from '../../lib/accessibility';
import { isSpeechSupported, speak, stopSpeaking } from '../../lib/speech';
type Message = {
  role: 'assistant' | 'user';
  text: string;
};
const intro = 'Hi Jamie! Let’s work through cell structure and function. Choose a topic below, or ask about membranes, enzymes, or organelles.';
function matchesSyllabusTopic(text: string, topics: string[]) {
  const lower = text.toLowerCase();
  return topics.some((topic) => {
    if (lower.includes(topic.toLowerCase())) return true;
    return topic
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 4)
      .some((word) => lower.includes(word));
  });
}
function reply(text: string, hints: boolean, syllabus: SyllabusInfo | null) {
  const blockDirectAnswers = hints || Boolean(syllabus?.policy.disallowDirectAnswers);
  if (/homework|assignment|problem \d|give me.*answer/i.test(text) && blockDirectAnswers) return 'Your instructor has enabled guided help for assigned work. Tell me what you’ve tried and where you got stuck. We can work through the next step together.';
  if (/membrane|transport|diffusion|osmosis/i.test(text)) return 'The cell membrane is selectively permeable. Small, nonpolar molecules can diffuse through its lipid bilayer. Other substances need transport proteins. Passive transport follows a concentration gradient; active transport needs energy to move against one.\n\nTry explaining this: why would a cell need energy to move ions from a low concentration to a high concentration?';
  if (/enzyme|reaction|activation/i.test(text)) return 'Enzymes speed up reactions by lowering activation energy. Their active sites bind specific substrates, and changes in temperature or pH can alter their shape.\n\nThink about it: what might happen if the active site changes shape so the substrate no longer fits?';
  if (/organelle|cell|golgi|lysosome/i.test(text)) return 'Think of organelles as specialized parts of a cell. Ribosomes build proteins, the Golgi apparatus modifies and sorts them, and lysosomes break down material for recycling.\n\nCheck your understanding: which organelle would help a cell recycle a damaged component?';
  if (/review|summary/i.test(text)) return 'Chapter 3 review\n\n1. Membrane transport: compare passive diffusion with energy-dependent active transport.\n2. Enzymes: explain activation energy and how an active site works.\n3. Organelles: describe the roles of ribosomes, the Golgi apparatus, and lysosomes.\n\nTry explaining each idea without looking at your notes, then test yourself in Practice.';
  if (syllabus && syllabus.topics.length > 0 && matchesSyllabusTopic(text, syllabus.topics)) return 'That’s covered in your syllabus. Before I explain, what do you already know about it? Share your best guess and I’ll help fill in the gaps.\n\n(This demo doesn’t have a prepared explanation for topics outside Chapter 3 yet — a connected AI assistant will cover the rest of your syllabus.)';
  if (syllabus?.policy.restrictToSyllabusTopics) return 'I couldn’t find that in Chapter 3 or in the syllabus you uploaded. Ask about one of the topics listed on the Materials tab, or check with your instructor if you think it should be in scope.';
  return 'This demo has prepared explanations for membrane transport, enzymes, and organelles. Ask about one of those topics or request a review sheet. A connected AI assistant will support broader course questions later.';
}
export function Study({
  hints,
  syllabus
}: {
  hints: boolean;
  syllabus: SyllabusInfo | null;
}) {
  const { focusMode } = useAccessibility();
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    text: intro
  }]);
  const [input, setInput] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  function send(text: string) {
    if (!text.trim()) return;
    setMessages(old => [...old, {
      role: 'user',
      text: text.trim()
    }, {
      role: 'assistant',
      text: reply(text, hints, syllabus)
    }]);
    setInput('');
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }
  function toggleReadAloud(i: number, text: string) {
    if (speakingIndex === i) {
      stopSpeaking();
      setSpeakingIndex(null);
      return;
    }
    setSpeakingIndex(i);
    speak(text, () => setSpeakingIndex(null));
  }
  // Focus mode shows only the latest exchange so the conversation reads as
  // one task at a time, with the earlier history a click away rather than
  // gone.
  const chunked = focusMode && !showAll && messages.length > 2;
  const visibleMessages = chunked ? messages.slice(-2) : messages;
  const indexOffset = messages.length - visibleMessages.length;
  return <div className="study-layout"><section className="panel chat"><div className="section-heading"><div className="chat-title"><span className="assistant-icon">✧</span><div><h2>Your study companion</h2><small>Chapter 3 · Cell structure & function</small></div></div><button className="text-button" onClick={() => {
          setMessages([{
            role: 'assistant',
            text: intro
          }]);
          setShowAll(false);
        }}>New chat</button></div>{chunked && <button type="button" className="text-button" onClick={() => setShowAll(true)}>Show {messages.length - 2} earlier message{messages.length - 2 === 1 ? '' : 's'}</button>}<div className="messages" role="log" aria-label="Study conversation" aria-live="polite">{visibleMessages.map((message, i) => { const realIndex = indexOffset + i; return <div key={realIndex} className={`message ${message.role}`}><span className="eyebrow">{message.role === 'user' ? 'YOU' : 'STUDY BUDDY'}</span><p>{message.text}</p>{message.role === 'assistant' && isSpeechSupported() && <button type="button" className="text-button" onClick={() => toggleReadAloud(realIndex, message.text)}>{speakingIndex === realIndex ? '■ Stop' : '🔊 Read aloud'}</button>}</div>; })}</div>{messages.length === 1 && <div className="suggestions">{['Explain membrane transport', 'How do enzymes work?', 'Make a review sheet'].map(prompt => <button className="secondary" key={prompt} onClick={() => send(prompt)}>{prompt} ↗</button>)}</div>}<form className="composer" onSubmit={submit}><label className="sr-only" htmlFor="question">Ask a course question</label><input id="question" value={input} onChange={e => setInput(e.target.value)} placeholder="What would you like to understand?" maxLength={2000} /><button className="primary" disabled={!input.trim()} type="submit" aria-label="Send message">↑</button></form><small className="chat-disclaimer">Prepared demo responses · not connected to an AI model</small></section><aside><section className="scope-card"><span className="eyebrow">YOUR LEARNING SPACE</span><h3>Grounded in your course.</h3><p>Currently exploring Chapter 3: cell structure and function.</p><hr /><strong>Instructor guidance</strong><p>{hints ? 'Guiding questions first. Share your attempt before asking for homework help.' : 'Concept explanations and sample review responses are enabled.'}</p><hr /><strong>Your syllabus</strong><p>{syllabus ? `${syllabus.courseName} · ${syllabus.topics.length} topic(s) in scope` : 'No syllabus uploaded yet — add one from the Materials tab.'}</p><span className="badge mastered">✓ Practice is encouraged</span></section></aside></div>;
}
