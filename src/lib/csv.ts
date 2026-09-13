import { MAX_SOURCES, Question } from "./types";

const CSV_HEADERS = [
  "body",
  "answer",
  "altAnswers",
  "judgingCriteria",
  "explanation",
  "sources",
  "genre",
  "tags",
  "memo",
  "status",
  "proofreadStatus",
  "authorName",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ファイル名は「Qraft_大会名_questions.csv」の形式にする。
// ファイル名に使えない文字は取り除く。
export function csvFileName(setName: string): string {
  const safe = setName.replace(/[\\/:*?"<>|]/g, "").trim() || "問題セット";
  return `Qraft_${safe}_questions.csv`;
}

export function questionsToCsv(questions: Question[]): string {
  const rows = [CSV_HEADERS.join(",")];
  for (const q of questions) {
    const row = [
      q.body,
      q.answer,
      q.altAnswers.join("|"),
      q.judgingCriteria,
      q.explanation,
      q.sources.filter(Boolean).join("|"),
      q.genre,
      q.tags.join("|"),
      q.memo,
      q.status,
      q.proofreadStatus,
      q.authorName,
    ].map((v) => escapeCsvCell(String(v ?? "")));
    rows.push(row.join(","));
  }
  return "\uFEFF" + rows.join("\r\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface ImportedQuestion {
  body: string;
  answer: string;
  altAnswers: string[];
  judgingCriteria: string;
  explanation: string;
  sources: string[];
  genre: string;
  tags: string[];
  memo: string;
  status: Question["status"];
  proofreadStatus: Question["proofreadStatus"];
}

const validStatus = new Set(["draft", "completed", "adopted", "rejected"]);
const validProofread = new Set([
  "unchecked",
  "in_review",
  "needs_fix",
  "approved",
  "on_hold",
]);

export function csvToQuestions(text: string): ImportedQuestion[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);

  return rows.slice(1).map((r) => {
    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 ? (r[i] ?? "") : "";
    };
    const status = get("status");
    const proofreadStatus = get("proofreadStatus");
    const sourcesRaw = idx("sources") >= 0 ? get("sources") : get("source");
    return {
      body: get("body"),
      answer: get("answer"),
      altAnswers: get("altAnswers").split("|").map((s) => s.trim()).filter(Boolean),
      judgingCriteria: get("judgingCriteria"),
      explanation: get("explanation"),
      sources: sourcesRaw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_SOURCES),
      genre: get("genre"),
      tags: get("tags").split("|").map((s) => s.trim()).filter(Boolean),
      memo: get("memo"),
      status: (validStatus.has(status) ? status : "draft") as Question["status"],
      proofreadStatus: (validProofread.has(proofreadStatus)
        ? proofreadStatus
        : "unchecked") as Question["proofreadStatus"],
    };
  });
}
