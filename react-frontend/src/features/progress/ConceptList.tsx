import { status, type Concept } from '../../lib/demo';

export function ConceptList({
  concepts
}: {
  concepts: Concept[];
}) {
  return <div className="concept-list">{concepts.map((c, i) => <div className="concept-row" key={c.id}><span className="concept-number">0{i + 1}</span><div className="concept-info"><strong>{c.name}</strong><small>{c.attempts ? `${c.correct} correct · ${c.attempts} attempted` : c.description}</small></div><span className={`badge ${status(c).toLowerCase().replaceAll(' ', '-')}`}>{status(c)}</span></div>)}</div>;
}
