import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import data from "../data.json";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length; i-- > 0; ) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const fillEx = (example, word) => {
  const p = example.split("_____");
  if (p.length < 2) return `${esc(example)} <strong>${esc(word)}</strong>`;
  let h = `${esc(p[0])}<strong>${esc(word)}</strong>`;
  for (let k = 1; k < p.length; k++) h += esc(p[k]);
  return h;
};

const filterIndices = (rows, query) => {
  const q = query.trim().toLowerCase();
  return rows
    .map((e, i) => ({ e, i }))
    .filter(
      ({ e }) =>
        !q ||
        `${e.word} ${e.type_meaning} ${e.example}`.toLowerCase().includes(q)
    )
    .map((x) => x.i);
};

export default function App() {
  const [tab, setTab] = useState("f");
  const [filter, setFilter] = useState("");
  const baseOrder = useMemo(
    () => filterIndices(data, filter),
    [filter]
  );

  const [order, setOrder] = useState(baseOrder);
  useEffect(() => {
    setOrder([...baseOrder]);
  }, [baseOrder]);

  const [flashIdx, setFlashIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizEntry, setQuizEntry] = useState(null);
  const [quizRandom, setQuizRandom] = useState(false);
  const [quizInput, setQuizInput] = useState("");
  const [quizFb, setQuizFb] = useState(null);
  const quizAfterShuffleRandom = useRef(false);
  const cardRef = useRef(null);
  const quizInputRef = useRef(null);

  useEffect(() => {
    setFlashIdx(0);
    setQuizIdx(0);
    setFlipped(false);
  }, [baseOrder]);

  const applyQuiz = useCallback(
    (random) => {
      if (!order.length) {
        setQuizEntry(null);
        return;
      }
      const raw = random
        ? order[(Math.random() * order.length) | 0]
        : order[quizIdx % order.length];
      setQuizEntry(data[raw]);
      setQuizRandom(random);
      setQuizInput("");
      setQuizFb(null);
    },
    [order, quizIdx]
  );

  useEffect(() => {
    if (tab !== "q") return;
    if (!order.length) {
      setQuizEntry(null);
      return;
    }
    if (quizAfterShuffleRandom.current) {
      quizAfterShuffleRandom.current = false;
      applyQuiz(true);
      return;
    }
    applyQuiz(false);
  }, [tab, order, quizIdx, applyQuiz]);

  const entryAt = order.length
    ? data[order[Math.min(flashIdx, order.length - 1)]]
    : null;

  const toggleFlip = () => {
    if (!entryAt) return;
    setFlipped((f) => !f);
  };

  const goFlash = (d) => {
    if (!order.length) return;
    setFlashIdx((i) => Math.min(order.length - 1, Math.max(0, i + d)));
    setFlipped(false);
  };

  const onShuffle = () => {
    if (tab === "q") quizAfterShuffleRandom.current = true;
    if (order.length) setOrder((o) => shuffle([...o]));
    setFlashIdx(0);
    setQuizIdx(0);
    setFlipped(false);
  };

  const checkQuiz = () => {
    if (!quizEntry) return;
    const ok = norm(quizInput) === norm(quizEntry.word);
    setQuizFb({ ok, answer: quizEntry.word });
  };

  const skipQuiz = () => {
    setQuizIdx((i) => (i + 1) % Math.max(order.length, 1));
    quizInputRef.current?.focus();
  };

  const openListRow = (rawIdx) => {
    const i = order.indexOf(rawIdx);
    setFlashIdx(i < 0 ? 0 : i);
    setFlipped(false);
    setTab("f");
    queueMicrotask(() => cardRef.current?.focus());
  };

  useEffect(() => {
    setFlashIdx((i) =>
      order.length ? Math.min(i, order.length - 1) : 0
    );
  }, [order.length]);

  useEffect(() => {
    if (tab === "q") quizInputRef.current?.focus();
  }, [tab]);

  return (
    <div className="shell">
      <header className="brand">
        <h1>VocalWeb</h1>
        <p>Học từ vựng · flashcard & quiz</p>
      </header>

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Chế độ">
          {[
            ["f", "Thẻ"],
            ["q", "Quiz"],
            ["l", "List"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? "on" : undefined}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="row2">
          <input
            className="inp"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Tìm từ, nghĩa…"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="button" className="btn" onClick={onShuffle}>
            Xáo
          </button>
        </div>
      </div>

      <section className={`panel ${tab === "f" ? "on" : ""}`}>
        <div
          role="button"
          tabIndex={0}
          className="card"
          ref={cardRef}
          onClick={toggleFlip}
          onKeyDown={(ev) => {
            if (ev.key === " " || ev.key === "Enter") {
              ev.preventDefault();
              toggleFlip();
            }
            if (ev.key === "ArrowLeft") {
              ev.preventDefault();
              goFlash(-1);
            }
            if (ev.key === "ArrowRight") {
              ev.preventDefault();
              goFlash(1);
            }
          }}
        >
          {!entryAt ? (
            <>
              <div className="wd">—</div>
              <p className="hint">0/0</p>
            </>
          ) : !flipped ? (
            <>
              <div className="wd">{entryAt.word}</div>
              <p className="hint">Click / Space — nghĩa</p>
            </>
          ) : (
            <>
              <div className="mean">{entryAt.type_meaning}</div>
              <p
                className="ex"
                dangerouslySetInnerHTML={{
                  __html: fillEx(entryAt.example, entryAt.word),
                }}
              />
            </>
          )}
        </div>
        <div className="nav">
          <span className="meta">
            {order.length
              ? `${Math.min(flashIdx, order.length - 1) + 1} / ${order.length}`
              : "0 / 0"}
          </span>
          <div className="nav-actions">
            <button
              type="button"
              className="btn"
              aria-label="Từ trước"
              onClick={() => {
                goFlash(-1);
                cardRef.current?.focus();
              }}
            >
              ←
            </button>
            <button
              type="button"
              className="btn p"
              aria-label="Từ sau"
              onClick={() => {
                goFlash(1);
                cardRef.current?.focus();
              }}
            >
              →
            </button>
          </div>
        </div>
      </section>

      <section className={`panel ${tab === "q" ? "on" : ""}`}>
        <div className="card alt">
          {!quizEntry ? (
            <p className="meta">—</p>
          ) : (
            <>
              <p
                className="quiz-prompt"
                dangerouslySetInnerHTML={{
                  __html: esc(quizEntry.example).replace(
                    "_____",
                    '<span class="blank">?</span>'
                  ),
                }}
              />
              <div className="quiz-actions">
                <input
                  className="inp"
                  ref={quizInputRef}
                  value={quizInput}
                  onChange={(e) => setQuizInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkQuiz()}
                  placeholder="Đáp án"
                  enterKeyHint="done"
                />
                <button type="button" className="btn p" onClick={checkQuiz}>
                  Kiểm tra
                </button>
                <button type="button" className="btn" onClick={skipQuiz}>
                  Bỏ qua
                </button>
              </div>
              {quizFb && (
                <p className={`fb ${quizFb.ok ? "ok" : "bad"}`}>
                  {quizFb.ok ? "Đúng rồi!" : `Đáp án: ${quizFb.answer}`}
                </p>
              )}
            </>
          )}
        </div>
        <p className="meta">
          {!order.length
            ? ""
            : quizRandom
              ? `rnd · ${order.length}`
              : `${(quizIdx % order.length) + 1}/${order.length}`}
        </p>
      </section>

      <section className={`panel ${tab === "l" ? "on" : ""}`}>
        <ul className="ul">
          {!order.length ? (
            <li>—</li>
          ) : (
            order.map((idx, pos) => {
              const e = data[idx];
              return (
                <li key={`${idx}-${pos}`} onClick={() => openListRow(idx)}>
                  <span className="lw">{e.word}</span>
                  <span className="lm">{e.type_meaning}</span>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <p className="footer-hint">
        Thẻ: <kbd>Space</kbd> lật · <kbd>←</kbd> <kbd>→</kbd> chuyển từ
      </p>
    </div>
  );
}
