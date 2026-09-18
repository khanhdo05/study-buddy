export type Concept = {
  id: string;
  name: string;
  description: string;
  attempts: number;
  correct: number;
  lastCorrect?: boolean;
  box: number;
};
export const initialConcepts: Concept[] = [{
  id: 'membrane',
  name: 'Membrane transport',
  description: 'How molecules cross a selectively permeable membrane.',
  attempts: 0,
  correct: 0,
  box: 0
}, {
  id: 'enzymes',
  name: 'Enzyme activity',
  description: 'How enzymes lower activation energy and affect reaction rates.',
  attempts: 0,
  correct: 0,
  box: 0
}, {
  id: 'organelles',
  name: 'Cell organelles',
  description: 'The specialized structures that keep a cell functioning.',
  attempts: 0,
  correct: 0,
  box: 0
}];
export function status(concept: Concept) {
  if (!concept.attempts) return 'Not practiced';
  if (!concept.lastCorrect) return 'Review needed';
  return concept.correct >= 3 && concept.correct / concept.attempts >= .75 ? 'Mastered' : 'Developing';
}

// A miss rating is only collected on a wrong answer, to gauge how far off
// the student was — Quizlet-style self-assessment rather than a flat wrong.
// It drives a simple Leitner-box priority: box 0 concepts are shown far more
// often than high-box ("basically got this") concepts, without hiding any
// concept behind a hard calendar date, which would make spaced repetition
// invisible in a single demo session.
export type MissRating = 'blank' | 'close' | 'slip';
const MAX_BOX = 4;
export function applyResult(concept: Concept, correct: boolean, miss?: MissRating): Concept {
  let box = concept.box;
  if (correct) {
    box = Math.min(box + 1, MAX_BOX);
  } else if (miss === 'blank') {
    box = 0;
  } else if (miss === 'slip') {
    // they knew it — don't punish a careless click, box stays put
  } else {
    box = Math.max(box - 1, 0);
  }
  return {
    ...concept,
    box,
    attempts: concept.attempts + 1,
    correct: concept.correct + Number(correct),
    lastCorrect: correct
  };
}
export const questions = [{
  concept: 'membrane',
  prompt: 'A cell moves ions against their concentration gradient. What does this process require?',
  options: ['Only a permeable membrane', 'Energy and a transport protein', 'Movement from high to low concentration', 'No cellular machinery'],
  answer: 1,
  explanation: 'Active transport uses energy to move substances against their concentration gradient.'
}, {
  concept: 'membrane',
  prompt: 'Why can oxygen enter a cell without a transport protein?',
  options: ['It is a large charged molecule', 'It always requires ATP', 'It is small and nonpolar', 'It travels inside a vesicle'],
  answer: 2,
  explanation: 'Small, nonpolar molecules can diffuse through the lipid bilayer down their concentration gradient.'
}, {
  concept: 'enzymes',
  prompt: 'How does an enzyme speed up a chemical reaction?',
  options: ['It lowers the activation energy', 'It changes the final equilibrium', 'It is consumed by the reaction', 'It increases the energy of the products'],
  answer: 0,
  explanation: 'Enzymes provide a reaction pathway with lower activation energy without changing the reaction equilibrium.'
}, {
  concept: 'enzymes',
  prompt: 'An enzyme loses its shape at a very high temperature. Why does its activity decrease?',
  options: ['The substrate becomes an enzyme', 'All molecules stop moving', 'The reaction no longer needs energy', 'The active site no longer fits the substrate'],
  answer: 3,
  explanation: 'Denaturation changes the enzyme’s structure, including the active site needed to bind its substrate.'
}, {
  concept: 'organelles',
  prompt: 'Which organelle modifies and sorts proteins for delivery?',
  options: ['Nucleus', 'Golgi apparatus', 'Mitochondrion', 'Lysosome'],
  answer: 1,
  explanation: 'The Golgi apparatus modifies, sorts, and packages proteins for their destinations.'
}, {
  concept: 'organelles',
  prompt: 'Which structure breaks down damaged cell components?',
  options: ['Ribosome', 'Cell membrane', 'Lysosome', 'Nucleolus'],
  answer: 2,
  explanation: 'Lysosomes contain digestive enzymes that break down and recycle cellular material.'
}];
export function makeQuiz(concepts: Concept[], weakOnly: boolean) {
  const sorted = [...concepts].sort((a, b) => a.box - b.box || Number(b.lastCorrect === false) - Number(a.lastCorrect === false) || a.attempts - b.attempts);
  const selected = weakOnly ? sorted.filter(c => c.lastCorrect === false) : sorted;
  return selected.map(c => {
    const variants = questions.filter(q => q.concept === c.id);
    return variants[c.attempts % variants.length];
  });
}
