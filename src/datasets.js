import vocabRaw from "../data.json";
import pv200Raw from "../200_phrasal_verbs_vi.json";

/** @typedef {{ word: string; type_meaning: string; example: string; extraExample?: string | null }} Entry */

function safeArr(x) {
  return Array.isArray(x) ? x : [];
}

/**
 * Thay cụm động từ trong câu bằng chỗ trống quiz.
 * Tránh RegExp rỗng / lỗi cú pháp (có thể làm treo hoặc crash).
 */
export function tryBlankInExample(example, phrase) {
  try {
    const ex = String(example || "");
    const ph = String(phrase || "").trim();
    if (!ex || !ph) return null;
    const parts = ph.split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    const body = parts
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+");
    if (!body || !body.trim()) return null;
    const re = new RegExp(body, "i");
    if (!re.test(ex)) return null;
    const out = ex.replace(re, "_____");
    return out.includes("_____") ? out : null;
  } catch {
    return null;
  }
}

/** @param {unknown[]} raw @returns {Entry[]} */
export function normalizeVocab(raw) {
  const a = safeArr(raw);
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const e = a[i];
    if (!e || typeof e !== "object") continue;
    out.push({
      word: String(e.word ?? "").trim(),
      type_meaning: String(e.type_meaning ?? "").trim(),
      example: String(e.example ?? "").trim(),
      extraExample: null,
    });
  }
  return out;
}

/** @param {unknown[]} raw @returns {Entry[]} */
export function normalizeCompletePv(raw) {
  const a = safeArr(raw);
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const r = a[i];
    if (!r || typeof r !== "object") continue;
    const word = String(r.phrasalVerb ?? "").trim();
    const type_meaning = String(r.meaning ?? "").trim();
    const ex = String(r.example ?? "").trim();
    if (!word) continue;
    const blanked = tryBlankInExample(ex, word);
    if (blanked) {
      out.push({ word, type_meaning, example: blanked, extraExample: null });
    } else {
      out.push({
        word,
        type_meaning,
        example: `${type_meaning} → _____`,
        extraExample: ex || null,
      });
    }
  }
  return out;
}

/** @param {unknown[]} raw @returns {Entry[]} */
export function normalizePv200(raw) {
  const a = safeArr(raw);
  const out = [];
  for (let i = 0; i < a.length; i++) {
    const r = a[i];
    if (!r || typeof r !== "object") continue;
    const word = String(r.phrasalVerb ?? "").trim();
    const mv = String(r.meaningVi ?? "").trim();
    if (!word) continue;
    out.push({
      word,
      type_meaning: mv,
      example: `_____ — ${mv}`,
      extraExample: null,
    });
  }
  return out;
}

export const DECK_VOCAB = normalizeVocab(vocabRaw);
export const DECK_PV200 = normalizePv200(pv200Raw);

/** Tải tách chunk — tránh parse ~22k dòng cùng lúc với bundle chính (giảm treo / màn trắng). */
export async function loadCompletePvDeck() {
  const mod = await import("../complete_pv_list.json");
  return normalizeCompletePv(mod.default);
}

/** @type {readonly ["vocab" | "completePv" | "pv200", string][]} */
export const DECK_TABS = [
  ["vocab", "Từ vựng"],
  ["completePv", "Complete PV"],
  ["pv200", "200 PV (Vi)"],
];
