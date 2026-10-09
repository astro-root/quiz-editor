import * as XLSX from "xlsx";
import { GenreNode, MAX_SOURCES, Question, QuestionSet, Round } from "./types";
import { normalizeText } from "./search";
import { judgeLabel, proofreadLabel } from "./permissions";
import { QuestionInput } from "./QuestionsContext";

// ---------------- エクスポート ----------------
export const EXPORT_HEADERS = [
  "問題番号", "問題文", "正解", "解説", "別解", "大ジャンル", "小ジャンル", "Round",
  "出典", "作成者", "裏どり担当", "出題順", "採用状態", "裏どり状態",
] as const;

export interface ExportCtx {
  set: QuestionSet;
  majorName: (id: string) => string;
  subName: (m: string, s: string) => string;
  personName: (uid: string, fallback: string) => string;
}

export function questionsToRows(list: Question[], ctx: ExportCtx): (string | number)[][] {
  return list.map((q, i) => [
    i + 1,
    q.body,
    q.answer,
    q.explanation,
    q.altAnswers.join(" | "),
    ctx.majorName(q.genreId),
    ctx.subName(q.genreId, q.subGenreId),
    ctx.set.rounds.find((r) => r.id === q.roundId)?.name ?? "",
    q.sources.filter((s) => s.trim()).join(" | "),
    ctx.personName(q.authorUid, q.authorName),
    q.assigneeUid ? ctx.personName(q.assigneeUid, "") : "",
    q.playOrder ?? "",
    judgeLabel(q.status),
    proofreadLabel[q.proofreadStatus],
  ]);
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, "").trim() || "問題セット";
}

// CSVをExcel等で開いたとき、先頭が = + - @ のセルが数式として実行されるのを防ぐ（CSVのみ）。
// 「-5」「+3.2」のような純粋な数値は答えとして頻出するので、そのまま出力する。
// .xlsx のセルは文字列型で書き出されるため、この処理は不要。
function guardCsv(v: string | number): string | number {
  if (typeof v !== "string") return v;
  if (/^[=@\t\r]/.test(v)) return "'" + v;
  if (/^[+-]/.test(v) && !/^[+-]\d[\d,.]*$/.test(v)) return "'" + v;
  return v;
}

export function downloadQuestions(list: Question[], ctx: ExportCtx, format: "csv" | "xlsx", label: string) {
  const body = questionsToRows(list, ctx);
  const rows = [Array.from(EXPORT_HEADERS) as (string | number)[], ...(format === "csv" ? body.map((r) => r.map(guardCsv)) : body)];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [8, 50, 20, 40, 20, 14, 14, 12, 40, 14, 14, 8, 10, 12].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "問題");
  const name = `Qraft_${safeName(ctx.set.name)}_${safeName(label)}.${format}`;
  if (format === "xlsx") {
    XLSX.writeFile(wb, name);
  } else {
    const csv = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["問題文", "正解", "解説", "別解", "大ジャンル", "小ジャンル", "出典", "Round", "採用状態"],
    ["日本で一番高い山は？", "富士山", "標高3776m", "ふじさん | Mt.Fuji", "地理", "日本", "https://example.com", "", "未判定"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "問題");
  XLSX.writeFile(wb, "Qraft_インポート用テンプレート.xlsx");
}

// ---------------- インポート ----------------
const ALIASES: Record<string, string[]> = {
  body: ["問題文", "問題", "body", "question"],
  answer: ["正解", "解答", "答え", "answer"],
  explanation: ["解説", "explanation"],
  altAnswers: ["別解", "別解・表記揺れ", "altanswers", "alt"],
  major: ["大ジャンル", "ジャンル", "genre", "major"],
  sub: ["小ジャンル", "subgenre", "sub"],
  sources: ["出典", "sources", "source"],
  round: ["round", "ラウンド", "ラウンド名"],
  status: ["採用状態", "状態", "ステータス", "status"],
  judgingCriteria: ["正誤判定基準", "judgingcriteria"],
  memo: ["備考", "memo"],
  tags: ["タグ", "tags"],
};

export interface ImportRow {
  rowNumber: number; // シート上の行番号（見出しが1行目）
  input: QuestionInput | null;
  errors: string[];
  warnings: string[];
  duplicate: "" | "file" | "existing";
}
export interface ImportResult {
  rows: ImportRow[];
  fatal: string; // 見出しが読めない等、取り込み自体が不可能な場合
  unknownColumns: string[];
}

async function readFileToWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  if (/\.csv$|\.txt$/i.test(file.name)) {
    // Excelが出力する日本語CSVはShift_JISのことがあるため、UTF-8で崩れたらShift_JISで読み直す
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("\uFFFD")) text = new TextDecoder("shift_jis").decode(buf);
    return XLSX.read(text.replace(/^\uFEFF/, ""), { type: "string" });
  }
  return XLSX.read(buf, { type: "array" });
}

function splitMulti(s: string): string[] {
  return s.split(/[|｜\n]/).map((x) => x.trim()).filter(Boolean);
}

export async function parseImportFile(
  file: File,
  ctx: { tree: GenreNode[]; rounds: Round[]; existingBodies: Set<string>; canJudge: boolean }
): Promise<ImportResult> {
  const MAX_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_BYTES) return { rows: [], fatal: "ファイルが大きすぎます（10MBまで）", unknownColumns: [] };
  let wb: XLSX.WorkBook;
  try {
    wb = await readFileToWorkbook(file);
  } catch (e) {
    console.error(e);
    return { rows: [], fatal: "ファイルを読み込めませんでした。Excel(.xlsx) またはCSVを選んでください", unknownColumns: [] };
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { rows: [], fatal: "シートが見つかりません", unknownColumns: [] };
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "", raw: false });
  if (matrix.length < 2) return { rows: [], fatal: "データ行がありません（1行目は見出しにしてください）", unknownColumns: [] };

  const header = (matrix[0] as unknown[]).map((h) => normalizeText(String(h ?? "").trim()));
  const col: Record<string, number> = {};
  for (const [key, names] of Object.entries(ALIASES)) {
    const idx = header.findIndex((h) => names.map(normalizeText).includes(h));
    if (idx >= 0) col[key] = idx;
  }
  const known = new Set(Object.values(col));
  const unknownColumns = (matrix[0] as unknown[]).map((h, i) => (known.has(i) ? "" : String(h ?? "").trim())).filter(Boolean);
  if (col.body === undefined || col.answer === undefined) {
    return { rows: [], fatal: "見出し行に「問題文」と「正解」の列が必要です", unknownColumns };
  }

  const majorByName = new Map(ctx.tree.map((g) => [normalizeText(g.name), g]));
  const roundByName = new Map(ctx.rounds.map((r) => [normalizeText(r.name), r]));
  const seenInFile = new Set<string>();
  const rows: ImportRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r] as unknown[];
    const get = (k: string) => (col[k] === undefined ? "" : String(cells[col[k]] ?? "").trim());
    if (!cells.some((c) => String(c ?? "").trim())) continue; // 完全な空行は無視
    const errors: string[] = [];
    const warnings: string[] = [];
    const body = get("body");
    const answer = get("answer");
    if (!body) errors.push("問題文が空です");
    if (!answer) errors.push("正解が空です");
    if (body.length > 5000) errors.push("問題文が長すぎます（5000文字まで）");

    let genreId = "";
    let subGenreId = "";
    const majorName = get("major");
    if (majorName) {
      const g = majorByName.get(normalizeText(majorName));
      if (!g) errors.push(`大ジャンル「${majorName}」は未登録です`);
      else {
        genreId = g.id;
        const subName = get("sub");
        if (subName) {
          const s = g.subs.find((x) => normalizeText(x.name) === normalizeText(subName));
          if (!s) errors.push(`小ジャンル「${subName}」は「${g.name}」に未登録です`);
          else subGenreId = s.id;
        }
      }
    } else if (get("sub")) {
      errors.push("小ジャンルだけが指定されています（大ジャンルも必要です）");
    }

    let roundId = "";
    const roundName = get("round");
    if (roundName) {
      const rd = roundByName.get(normalizeText(roundName));
      if (!rd) errors.push(`Round「${roundName}」は未登録です`);
      else if (!ctx.canJudge) warnings.push("Roundを指定する権限がないため無視します");
      else roundId = rd.id;
    }

    let status: Question["status"] = "draft";
    const st = normalizeText(get("status"));
    if (st) {
      if (["採用", "adopted"].includes(st)) status = "adopted";
      else if (["却下", "不採用", "rejected"].includes(st)) status = "rejected";
      else if (["未判定", "下書き", "draft", "作問完了", "completed"].includes(st)) status = st === "作問完了" || st === "completed" ? "completed" : "draft";
      else errors.push(`採用状態「${get("status")}」は不正です（採用／却下／未判定）`);
      if (!ctx.canJudge && (status === "adopted" || status === "rejected")) {
        warnings.push("採用状態を指定する権限がないため未判定で取り込みます");
        status = "draft";
      }
    }
    if (roundId && status !== "adopted") warnings.push("Roundは採用問題で使用されます（未判定のまま取り込まれます）");

    const sources = splitMulti(get("sources"));
    if (sources.length > MAX_SOURCES) warnings.push(`出典が${MAX_SOURCES}件を超えるため、先頭${MAX_SOURCES}件のみ取り込みます`);

    let duplicate: ImportRow["duplicate"] = "";
    const key = normalizeText(body);
    if (body) {
      if (ctx.existingBodies.has(key)) duplicate = "existing";
      else if (seenInFile.has(key)) duplicate = "file";
      seenInFile.add(key);
    }
    if (duplicate) warnings.push(duplicate === "existing" ? "同じ問題文が既に登録されています" : "ファイル内で問題文が重複しています");

    rows.push({
      rowNumber: r + 1,
      errors, warnings, duplicate,
      input: errors.length
        ? null
        : {
            body, answer, explanation: get("explanation"),
            altAnswers: splitMulti(get("altAnswers")),
            genreId, subGenreId, roundId, status,
            sources: sources.slice(0, MAX_SOURCES),
            judgingCriteria: get("judgingCriteria"),
            memo: get("memo"),
            tags: splitMulti(get("tags")),
          },
    });
  }
  return { rows, fatal: rows.length === 0 ? "取り込めるデータ行がありません" : "", unknownColumns };
}
