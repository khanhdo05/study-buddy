import { useRef, useState } from 'react';
import { extractSyllabusInfo, type SyllabusInfo } from '../lib/syllabus';

type Props = {
  syllabus: SyllabusInfo | null;
  onSyllabusChange: (info: SyllabusInfo) => void;
};

const PLAIN_TEXT_EXTENSIONS = ['.txt', '.md', '.markdown'];

export function Materials({ syllabus, onSyllabusChange }: Props) {
  const [pasteText, setPasteText] = useState('');
  const [needsPaste, setNeedsPaste] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function apply(text: string, fileName: string) {
    const info = extractSyllabusInfo(text, fileName);
    onSyllabusChange(info);
    setNeedsPaste(false);
    setPasteText('');
    setNotice(`Loaded "${info.courseName}" — ${info.topics.length} topic(s) found.`);
  }

  async function handleFile(file: File) {
    const isPlainText = PLAIN_TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isPlainText) {
      setNeedsPaste(true);
      setNotice(`"${file.name}" needs a document parser this demo doesn't have yet. Paste the text below instead, or export it as .txt.`);
      return;
    }
    apply(await file.text(), file.name);
  }

  async function loadSample() {
    const res = await fetch('/sample-syllabus.txt');
    apply(await res.text(), 'sample-syllabus.txt');
  }

  return (
    <div className="settings-grid">
      <section className="panel">
        <span className="eyebrow">YOUR COURSE MATERIALS</span>
        <h2>Bring your syllabus.</h2>
        <p>
          Upload the syllabus your instructor shared, and your study companion sticks to what
          it allows: hints instead of answers where required, and only the chapters you've
          actually covered. This keeps the assistant aligned with your course's integrity
          policy instead of acting like an open-ended chatbot.
        </p>
        <div className="button-row">
          <button className="primary" onClick={() => fileInput.current?.click()}>
            Upload syllabus (.txt/.md)
          </button>
          <button className="secondary" onClick={loadSample}>
            Try sample syllabus
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.doc,.docx"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        {needsPaste && (
          <>
            <p className="muted">{notice}</p>
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the syllabus text here..."
              style={{ width: '100%', marginTop: '8px' }}
            />
            <div className="button-row">
              <button
                className="primary"
                disabled={!pasteText.trim()}
                onClick={() => apply(pasteText, syllabus?.fileName ?? 'pasted-syllabus.txt')}
              >
                Use pasted text
              </button>
            </div>
          </>
        )}
        {notice && !needsPaste && <p className="muted">{notice}</p>}
      </section>

      <section className="panel">
        <span className="eyebrow">DETECTED POLICY</span>
        {!syllabus ? (
          <>
            <h2>No syllabus yet.</h2>
            <p className="muted">Your study companion uses guided hints by default until you add one.</p>
          </>
        ) : (
          <>
            <h2>{syllabus.courseName}</h2>
            <p className="muted">
              From {syllabus.fileName} · {new Date(syllabus.uploadedAt).toLocaleString()}
            </p>

            {syllabus.integrityNotice && (
              <p className="muted">
                <strong>Academic integrity clause:</strong> {syllabus.integrityNotice}
              </p>
            )}

            <div className="policy-option">
              <div>
                <strong>Direct homework answers</strong>
                <span>{syllabus.policy.disallowDirectAnswers ? 'Blocked — guided hints instead' : 'Allowed'}</span>
              </div>
              <span className={`badge ${syllabus.policy.disallowDirectAnswers ? 'developing' : 'mastered'}`}>
                {syllabus.policy.disallowDirectAnswers ? 'On' : 'Off'}
              </span>
            </div>
            <div className="policy-option">
              <div>
                <strong>Restricted to syllabus topics</strong>
                <span>{syllabus.topics.length} topic(s) in scope</span>
              </div>
              <span className={`badge ${syllabus.policy.restrictToSyllabusTopics ? 'developing' : 'mastered'}`}>
                {syllabus.policy.restrictToSyllabusTopics ? 'On' : 'Off'}
              </span>
            </div>

            {syllabus.topics.map((topic) => (
              <div className="material" key={topic}>
                <span className="file-icon">CH</span>
                <div>
                  <strong>{topic}</strong>
                </div>
              </div>
            ))}

            {syllabus.warnings.map((w) => (
              <p className="muted" key={w}>
                {w}
              </p>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
