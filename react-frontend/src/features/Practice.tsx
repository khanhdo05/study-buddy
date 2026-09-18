import { useState } from 'react';
import { makeQuiz, type Concept } from '../lib/demo';
type Props = {
  concepts: Concept[];
  reviewOnly: boolean;
  onRecord: (id: string, correct: boolean) => void;
  onProgress: () => void;
};
export function Practice({
  concepts,
  reviewOnly,
  onRecord,
  onProgress
}: Props) {
  const [quiz, setQuiz] = useState(() => makeQuiz(concepts, reviewOnly));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  function restart(weak: boolean) {
    setQuiz(makeQuiz(concepts, weak));
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
  }
  if (!quiz.length) return <section className="panel empty-state"><span className="large-symbol">✓</span><h2>No concepts need review yet.</h2><p>Try a mixed practice session to find your starting point.</p><button className="primary" onClick={() => restart(false)}>Practice all concepts →</button></section>;
  if (index >= quiz.length) return <section className="panel empty-state"><span className="large-symbol">✧</span><span className="eyebrow">SESSION COMPLETE</span><h2>That’s progress.</h2><p>You answered {score} of {quiz.length} questions correctly. Your concept progress has been updated.</p><p>Missed concepts get priority next time, with a different question.</p><div className="button-row"><button className="primary" onClick={onProgress}>See my progress →</button><button className="secondary" onClick={() => restart(false)}>Practice again</button></div></section>;
  const question = quiz[index];
  return <div className="practice-layout"><section className="panel quiz"><div className="section-heading"><span className="eyebrow">QUICK PRACTICE</span><span className="muted">Question {index + 1} of {quiz.length}</span></div><progress aria-label="Quiz progress" value={index} max={quiz.length} /><span className="badge developing">{concepts.find(c => c.id === question.concept)?.name}</span><h2>{question.prompt}</h2><fieldset disabled={checked}><legend className="sr-only">Choose an answer</legend>{question.options.map((option, i) => <label key={option} className={`answer ${selected === i ? 'selected' : ''} ${checked && i === question.answer ? 'correct' : ''}`}><input type="radio" name="answer" value={i} checked={selected === i} onChange={() => setSelected(i)} /><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{checked && i === question.answer && <span aria-label="Correct answer">✓</span>}</label>)}</fieldset>{checked && <div className={`feedback ${selected === question.answer ? 'success' : ''}`} role="status"><strong>{selected === question.answer ? 'You’ve got it.' : 'A good concept to revisit.'}</strong><p>{question.explanation}</p></div>}<div className="quiz-actions"><span className="muted">Take your time. Think it through.</span>{checked ? <button className="primary" onClick={() => {
          setIndex(index + 1);
          setChecked(false);
          setSelected(null);
        }}>{index + 1 === quiz.length ? 'Finish session' : 'Next question'} →</button> : <button className="primary" disabled={selected === null} onClick={() => {
          if (selected === null || checked) return;
          const correct = selected === question.answer;
          onRecord(question.concept, correct);
          setScore(score + Number(correct));
          setChecked(true);
        }}>Check answer →</button>}</div></section><aside className="practice-note"><span className="eyebrow">BUILT AROUND YOU</span><h3>Practice with purpose.</h3><p>Your answers help choose what comes next. Concepts that need attention move to the front of the line.</p><hr /><p>There are two sample questions per concept. Later sessions alternate between them.</p></aside></div>;
}
