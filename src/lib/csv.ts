import { Question } from "./types";

const CSV_HEADERS = [
  "body",
  "answer",
  "altAnswers",
  "judgingCriteria",
  "explanation",
  "source",
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

// CSVエクスポート：外部ライブラリを使わずクライアント側だけで完結させる
// （Cloud Functions不使用の方針、かつこの用途では十分軽量なため）。
export function questionsToCsv(questions: Question[]): string {
  const rows = [CSV_HEADERS.join(",")];
  for (const q of questions) {
    const row = [
      q.body,
      q.answer,
      q.altAnswers.join("|"),
      q.judgingCriteria,
      q.explanation,
      q.source,
      q.genre,
      q.tags.join("|"),
      q.memo,
      q.status,
      q.proofreadStatus,
      q.authorName,
    ].map((v) => escapeCsvCell(String(v ?? "")));
    rows.push(row.join(","));
  }
  // Excelでの文字化けを避けるためBOMを付与する
  return "\uFEFF" + rows.join("\r\n");
}

// 簡易CSVパーサ（ダブルクォート・カンマ・改行を含むセルに対応）。
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
  source: string;
  genre: string;
  tags: string[];
  memo: string;
  status: Question["status"];
  proofreadStatus: Question["proofreadStatus"];
}

const validStatus = new Set(["draft", "adopted", "rejected"]);
const validProofread = new Set([
  "unchecked",
  "in_review",
  "needs_fix",
  "approved",
  "on_hold",
]);

// エクスポートしたCSVをそのまま読み込む想定のインポート。
// ヘッダー行の並びは柔軟に許容し、列名で対応付ける。
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
    return {
      body: get("body"),
      answer: get("answer"),
      altAnswers: get("altAnswers").split("|").map((s) => s.trim()).filter(Boolean),
      judgingCriteria: get("judgingCriteria"),
      explanation: get("explanation"),
      source: get("source"),
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
