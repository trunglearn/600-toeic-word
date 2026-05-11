import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DECK_PV200,
  DECK_TABS,
  DECK_VOCAB,
  loadCompletePvDeck,
} from "./datasets.js";

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
  const ex = String(example ?? "");
  const w = String(word ?? "");
  const p = ex.split("_____");
  if (p.length < 2) return `${esc(ex)} <strong>${esc(w)}</strong>`;
  let h = `${esc(p[0])}<strong>${esc(w)}</strong>`;
  for (let k = 1; k < p.length; k++) h += esc(p[k]);
  return h;
};

const filterIndices = (rows, query) => {
  const list = Array.isArray(rows) ? rows : [];
  const q = query.trim().toLowerCase();
  return list
    .map((e, i) => ({ e, i }))
    .filter(
      ({ e }) =>
        !q ||
        `${e.word} ${e.type_meaning} ${e.example} ${e.extraExample || ""}`
          .toLowerCase()
          .includes(q)
    )
    .map((x) => x.i);
};

export default function App() {
  const [deck, setDeck] = useState("vocab");
  const [tab, setTab] = useState("f");
  const [filter, setFilter] = useState("");
  const [completePvRows, setCompletePvRows] = useState(null);
  const [completePvErr, setCompletePvErr] = useState(null);
  const pvLoadId = useRef(0);

  const rows = useMemo(() => {
    if (deck === "completePv") {
      if (!Array.isArray(completePvRows)) return [];
      return completePvRows;
    }
    if (deck === "vocab") return DECK_VOCAB;
    return DECK_PV200;
  }, [deck, completePvRows]);

  useEffect(() => {
    if (deck !== "completePv") return;
    if (completePvRows !== null) return;
    const id = ++pvLoadId.current;
    loadCompletePvDeck()
      .then((r) => {
        if (id !== pvLoadId.current) return;
        setCompletePvRows(r);
        setCompletePvErr(null);
      })
      .catch((e) => {
        if (id !== pvLoadId.current) return;
        setCompletePvRows([]);
        setCompletePvErr(String(e?.message || e || "Lỗi tải"));
      });
  }, [deck, completePvRows]);

  useEffect(() => {
    if (deck !== "completePv") pvLoadId.current += 1;
  }, [deck]);

  useEffect(() => {
    setFilter("");
  }, [deck]);

  const baseOrder = useMemo(
    () => filterIndices(rows, filter),
    [rows, filter]
  );

  const [order, setOrder] = useState(() => baseOrder);
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

  useLayoutEffect(() => {
    setOrder([...baseOrder]);
    setFlashIdx(0);
    setQuizIdx(0);
    setFlipped(false);
  }, [deck, baseOrder]);

  const displayOrder = useMemo(() => {
    const n = rows.length;
    if (!n) return [];
    if (!order.length) return baseOrder;
    if (
      order.some(
        (i) => typeof i !== "number" || !Number.isFinite(i) || i < 0 || i >= n
      )
    ) {
      return baseOrder;
    }
    return order;
  }, [order, rows, baseOrder]);

  const applyQuiz = useCallback(
    (random) => {
      if (!displayOrder.length) {
        setQuizEntry(null);
        return;
      }
      const raw = random
        ? displayOrder[(Math.random() * displayOrder.length) | 0]
        : displayOrder[quizIdx % displayOrder.length];
      const entry = rows[raw];
      setQuizEntry(entry ?? null);
      setQuizRandom(random);
      setQuizInput("");
      setQuizFb(null);
    },
    [displayOrder, quizIdx, rows]
  );

  useEffect(() => {
    if (tab !== "q") return;
    if (!displayOrder.length) {
      setQuizEntry(null);
      return;
    }
    if (quizAfterShuffleRandom.current) {
      quizAfterShuffleRandom.current = false;
      applyQuiz(true);
      return;
    }
    applyQuiz(false);
  }, [tab, displayOrder, quizIdx, applyQuiz]);

  const entryAt = displayOrder.length
    ? rows[displayOrder[Math.min(flashIdx, displayOrder.length - 1)]]
    : null;

  const loadingPv = deck === "completePv" && completePvRows === null;

  const toggleFlip = () => {
    if (!entryAt) return;
    setFlipped((f) => !f);
  };

  const goFlash = (d) => {
    if (!displayOrder.length) return;
    setFlashIdx((i) =>
      Math.min(displayOrder.length - 1, Math.max(0, i + d))
    );
    setFlipped(false);
  };

  const onShuffle = () => {
    if (tab === "q") quizAfterShuffleRandom.current = true;
    if (displayOrder.length) setOrder(shuffle([...displayOrder]));
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
    setQuizIdx((i) => (i + 1) % Math.max(displayOrder.length, 1));
    quizInputRef.current?.focus();
  };

  const openListRow = (rawIdx) => {
    const i = displayOrder.indexOf(rawIdx);
    setFlashIdx(i < 0 ? 0 : i);
    setFlipped(false);
    setTab("f");
    queueMicrotask(() => cardRef.current?.focus());
  };

  useEffect(() => {
    if (tab === "q") quizInputRef.current?.focus();
  }, [tab]);

  return (
    <div className="shell">
      <header className="brand">
        <h1>VocalWeb</h1>
        <p>Học từ vựng · flashcard & quiz</p>
      </header>

      <div className="tabs deck" role="tablist" aria-label="Bộ học">
        {DECK_TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={deck === k}
            className={deck === k ? "on" : undefined}
            onClick={() => setDeck(k)}
          >
            {label}
          </button>
        ))}
      </div>

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

      {loadingPv ? (
        <p className="meta pv-banner">Đang tải Complete PV…</p>
      ) : null}
      {deck === "completePv" && completePvErr ? (
        <p className="fb bad pv-banner">{completePvErr}</p>
      ) : null}

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
          {loadingPv ? (
            <>
              <div className="wd">…</div>
              <p className="hint">Vui lòng chờ</p>
            </>
          ) : !entryAt ? (
            <>
              <div className="wd">—</div>
              <p className="hint">0 / 0</p>
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
              {entryAt.extraExample ? (
                <p className="ex ex-note">{entryAt.extraExample}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="nav">
          <span className="meta">
            {displayOrder.length
              ? `${Math.min(flashIdx, displayOrder.length - 1) + 1} / ${displayOrder.length}`
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
          {loadingPv ? (
            <p className="meta">Đang tải…</p>
          ) : !quizEntry ? (
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
          {!displayOrder.length
            ? ""
            : quizRandom
              ? `rnd · ${displayOrder.length}`
              : `${(quizIdx % displayOrder.length) + 1}/${displayOrder.length}`}
        </p>
      </section>

      <section className={`panel ${tab === "l" ? "on" : ""}`}>
        <ul className="ul">
          {loadingPv ? (
            <li className="meta">Đang tải…</li>
          ) : !displayOrder.length ? (
            <li>—</li>
          ) : (
            displayOrder.map((idx, pos) => {
              const e = rows[idx];
              if (!e) return null;
              return (
                <li key={`${deck}-${idx}-${pos}`} onClick={() => openListRow(idx)}>
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
