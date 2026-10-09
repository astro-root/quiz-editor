import { ProofreadStatus, Question, QuestionStatus, Role } from "./types";

// UI側の制御。最終的な認可は firestore.rules が担う（両者は必ず揃えること）。

const isSup = (r: Role | null) => r === "admin" || r === "supervisor";

export const canManageMembers = (r: Role | null) => r === "admin";
export const canEditNotice = (r: Role | null) => r === "admin";
export const canManageGenres = isSup; // ジャンル・Round・出題順ルール
export const canCreateQuestion = (r: Role | null) => isSup(r) || r === "writer";
export const canJudge = isSup; // 採用/却下、Round指定、裏どり担当の割り当て
export const canReorder = isSup;
export const canPurge = isSup; // 完全削除・ゴミ箱の操作

export function canEditQuestion(role: Role | null, q: Question, uid: string | undefined): boolean {
  if (isSup(role)) return true;
  return role === "writer" && !!uid && q.authorUid === uid;
}
export function canDeleteQuestion(role: Role | null, q: Question, uid: string | undefined): boolean {
  return canEditQuestion(role, q, uid);
}
// 裏どり：問題統括以上は全問題、それ以外は自分が担当の問題のみ（checker/writer）
export function canProofread(role: Role | null, q: Question, uid: string | undefined): boolean {
  if (isSup(role)) return true;
  return (role === "writer" || role === "checker") && !!uid && q.assigneeUid === uid;
}

export function allowedStatusOptions(role: Role | null): QuestionStatus[] {
  if (isSup(role)) return ["draft", "completed", "adopted", "rejected"];
  if (role === "writer") return ["draft", "completed"];
  return [];
}
export function shouldLogRevision(role: Role | null): boolean {
  return isSup(role);
}

export const roleLabel: Record<Role, string> = {
  admin: "管理者",
  supervisor: "問題統括",
  writer: "作問者",
  checker: "裏どり担当",
  viewer: "閲覧者",
};
export const roleDescription: Record<Role, string> = {
  admin: "すべての操作・メンバー招待・設定",
  supervisor: "採用判断・Round・裏どり割り当て・出題順・ジャンル管理",
  writer: "問題の作成と自分の問題の編集・削除",
  checker: "担当問題の裏どり（確認状態・出典の更新）",
  viewer: "閲覧とコメントのみ",
};
export const statusLabel: Record<QuestionStatus, string> = {
  draft: "未判定（下書き）",
  completed: "未判定（作問完了）",
  adopted: "採用",
  rejected: "却下",
};
export const judgeLabel = (s: QuestionStatus) => (s === "adopted" ? "採用" : s === "rejected" ? "却下" : "未判定");

export const proofreadLabel: Record<ProofreadStatus, string> = {
  unchecked: "未着手",
  in_review: "確認中",
  approved: "確認済み",
  needs_fix: "要修正",
  on_hold: "保留",
};
export function proofreadDisplay(q: Pick<Question, "proofreadStatus" | "assigneeUid">): string {
  if (q.proofreadStatus === "unchecked" && q.assigneeUid) return "担当者割り当て済み";
  return proofreadLabel[q.proofreadStatus];
}

// 問題文・答えがどちらも空＝「未入力のまま残ったカード」
export function isEmptyQuestion(q: Pick<Question, "body" | "answer">): boolean {
  return !q.body.trim() && !q.answer.trim();
}
