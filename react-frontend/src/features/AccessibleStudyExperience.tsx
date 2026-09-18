// AccessibleStudyExperience.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./accessible-study.css";

type AccessibilityMode = "default" | "focus" | "dyslexia" | "screenReader";

type QuizQuestion = {
  id: string;
  concept: string;
  prompt: string;
  choices: string[];
  answer: string;
};

type ConceptNode = {
  id: string;
  label: string;
  description: string;
  children?: ConceptNode[];
};

const questions: QuizQuestion[] = [
  {
    id: "collision-theory",
    concept: "Collision theory",
    prompt: "Why does reaction rate usually increase as temperature increases?",
    choices: [
      "Particles collide less often",
      "More particles have enough energy for successful collisions",
      "The activation energy becomes zero",
      "The reactants become more concentrated",
    ],
    answer: "More particles have enough energy for successful collisions",
  },
  {
    id: "activation-energy",
    concept: "Activation energy",
    prompt: "What does activation energy represent?",
    choices: [
      "The energy released by a reaction",
      "The minimum energy required for a successful reaction",
      "The total mass of the reactants",
      "The rate at which products form",
    ],
    answer: "The minimum energy required for a successful reaction",
  },
  {
    id: "catalyst",
    concept: "Catalysts",
    prompt: "How does a catalyst increase reaction rate?",
    choices: [
      "It raises activation energy",
      "It is consumed by the reaction",
      "It provides an alternative pathway with lower activation energy",
      "It increases the concentration of every reactant",
    ],
    answer: "It provides an alternative pathway with lower activation energy",
  },
  {
    id: "concentration",
    concept: "Concentration",
    prompt: "Why can higher reactant concentration increase reaction rate?",
    choices: [
      "It reduces particle mass",
      "It creates more frequent collisions",
      "It stops the reaction from reaching equilibrium",
      "It always lowers temperature",
    ],
    answer: "It creates more frequent collisions",
  },
];

const conceptMap: ConceptNode = {
  id: "reaction-rate",
  label: "Reaction rate",
  description: "How quickly reactants are converted into products.",
  children: [
    {
      id: "temperature",
      label: "Temperature",
      description:
        "Higher temperature increases particle kinetic energy and the number of successful collisions.",
    },
    {
      id: "concentration",
      label: "Concentration",
      description:
        "Higher concentration usually means more collisions happen in the same amount of time.",
    },
    {
      id: "catalyst",
      label: "Catalyst",
      description:
        "A catalyst provides an alternative reaction pathway with lower activation energy.",
    },
  ],
};

function useAccessibilitySettings() {
  const [mode, setMode] = useState<AccessibilityMode>(() => {
    return (localStorage.getItem("study-buddy-accessibility-mode") ??
      "default") as AccessibilityMode;
  });

  const [fontScale, setFontScale] = useState(() => {
    return Number(localStorage.getItem("study-buddy-font-scale") ?? 1);
  });

  useEffect(() => {
    localStorage.setItem("study-buddy-accessibility-mode", mode);
    localStorage.setItem("study-buddy-font-scale", String(fontScale));
  }, [mode, fontScale]);

  return { mode, setMode, fontScale, setFontScale };
}

function ConceptTree({ node, level = 1 }: { node: ConceptNode; level?: number }) {
  return (
    <li>
      <strong>{node.label}</strong>
      <p>{node.description}</p>

      {node.children && (
        <ul aria-label={`${node.label} related concepts`}>
          {node.children.map((child) => (
            <ConceptTree key={child.id} node={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function AccessibleStudyExperience() {
  const { mode, setMode, fontScale, setFontScale } = useAccessibilitySettings();
  const [activeView, setActiveView] = useState<"study" | "practice" | "map">(
    "study",
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const mainRef = useRef<HTMLElement>(null);

  // Focus mode deliberately limits each session to three questions.
  const quizQuestions = useMemo(
    () => (mode === "focus" ? questions.slice(0, 3) : questions),
    [mode],
  );

  const currentQuestion = quizQuestions[questionIndex];
  const progress = Math.round(((questionIndex + 1) / quizQuestions.length) * 100);

  function changeView(view: typeof activeView) {
    setActiveView(view);
    setFeedback("");
    requestAnimationFrame(() => mainRef.current?.focus());
  }

  function submitAnswer() {
    if (!selectedAnswer) {
      setFeedback("Choose an answer before checking your response.");
      return;
    }

    const correct = selectedAnswer === currentQuestion.answer;
    setFeedback(
      correct
        ? `Correct. You demonstrated understanding of ${currentQuestion.concept}.`
        : `Not quite. ${currentQuestion.answer} is correct. This concept has been marked for review.`,
    );
  }

  function nextQuestion() {
    setSelectedAnswer(undefined);
    setFeedback("");
    setQuestionIndex((index) => (index + 1) % quizQuestions.length);
  }

  return (
    <div
      className={`study-app mode-${mode}`}
      style={{ "--font-scale": fontScale } as React.CSSProperties}
    >
      <a className="skip-link" href="#study-content">
        Skip to study content
      </a>

      <header className="app-header">
        <div>
          <p className="eyebrow">BIO 201 · Week 3</p>
          <h1>Study Buddy</h1>
        </div>

        <label className="mode-picker">
          <span>Study experience</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as AccessibilityMode)}
          >
            <option value="default">Standard</option>
            <option value="focus">Focus / ADHD-friendly</option>
            <option value="dyslexia">Dyslexia-friendly</option>
            <option value="screenReader">Screen-reader-friendly</option>
          </select>
        </label>
      </header>

      <nav aria-label="Course study areas" className="primary-nav">
        <button
          type="button"
          aria-current={activeView === "study" ? "page" : undefined}
          onClick={() => changeView("study")}
        >
          Study
        </button>
        <button
          type="button"
          aria-current={activeView === "practice" ? "page" : undefined}
          onClick={() => changeView("practice")}
        >
          Practice
        </button>
        <button
          type="button"
          aria-current={activeView === "map" ? "page" : undefined}
          onClick={() => changeView("map")}
        >
          Concept map
        </button>
      </nav>

      <main id="study-content" ref={mainRef} tabIndex={-1}>
        {mode === "dyslexia" && (
          <section className="reading-controls" aria-labelledby="reading-controls-title">
            <h2 id="reading-controls-title">Reading controls</h2>
            <label>
              Text size: {Math.round(fontScale * 100)}%
              <input
                type="range"
                min="0.9"
                max="1.4"
                step="0.1"
                value={fontScale}
                onChange={(event) => setFontScale(Number(event.target.value))}
              />
            </label>
          </section>
        )}

        {activeView === "study" && (
          <section aria-labelledby="study-title" className="study-card">
            <p className="eyebrow">Current concept</p>
            <h2 id="study-title">Why temperature changes reaction rate</h2>

            {/* In focus mode this is intentionally short and task-based. */}
            <p>
              When temperature rises, particles move faster. More collisions have
              enough energy to overcome activation energy, so reactions generally
              happen faster.
            </p>

            <div className="one-task">
              <h3>Your next step</h3>
              <p>
                In your own words, explain the role of successful collisions.
              </p>
              <button type="button" onClick={() => changeView("practice")}>
                Try one practice question
              </button>
            </div>
          </section>
        )}

        {activeView === "practice" && (
          <section aria-labelledby="practice-title" className="study-card">
            <div className="quiz-heading">
              <div>
                <p className="eyebrow">
                  {mode === "focus" ? "Focus set · 3 questions maximum" : "Practice quiz"}
                </p>
                <h2 id="practice-title">Question {questionIndex + 1}</h2>
              </div>
              <span aria-label={`${progress}% complete`}>{progress}% complete</span>
            </div>

            <progress value={questionIndex + 1} max={quizQuestions.length}>
              {progress}% complete
            </progress>

            <fieldset>
              <legend>{currentQuestion.prompt}</legend>
              {currentQuestion.choices.map((choice) => (
                <label key={choice} className="answer-choice">
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={selectedAnswer === choice}
                    onChange={() => setSelectedAnswer(choice)}
                  />
                  {choice}
                </label>
              ))}
            </fieldset>

            <div className="actions">
              <button type="button" onClick={submitAnswer}>
                Check answer
              </button>
              <button type="button" className="secondary" onClick={nextQuestion}>
                Next question
              </button>
            </div>

            <p className="feedback" role="status" aria-live="polite">
              {feedback}
            </p>
          </section>
        )}

        {activeView === "map" && (
          <section aria-labelledby="map-title" className="study-card">
            <p className="eyebrow">Visual + text alternative</p>
            <h2 id="map-title">Reaction rate concept map</h2>

            {/* Replace this with an actual SVG or graph visualization if desired. */}
            <div
              className="concept-map-visual"
              role="img"
              aria-label="Reaction rate is connected to temperature, concentration, and catalysts. Temperature affects particle energy, concentration affects collision frequency, and catalysts lower activation energy."
            >
              <strong>Reaction rate</strong>
              <span>Temperature</span>
              <span>Concentration</span>
              <span>Catalyst</span>
            </div>

            <details open={mode === "screenReader"}>
              <summary>Read the concept map as an outline</summary>
              <ul className="concept-outline">
                <ConceptTree node={conceptMap} />
              </ul>
            </details>
          </section>
        )}
      </main>
    </div>
  );
}
