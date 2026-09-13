import { Question, QuestionStatus, Role } from "./types";

// 権限ロジックを一箇所に集約する。
// UI側の制御であり、最終的な認可はFirestore Security Rulesが担う
// （UIの制御はあくまでユーザー体験のため、抜けても事故にならない設計）。

export function canManageMembers(role: Role | null): boolean {
  return role === "admin";
}

export function canEditNotice(role: Role | null): boolean {
  return role === "admin";
}

export function canManageGenres(role: Role | null): boolean {
  return role === "admin" || role === "supervisor";
}

export function canCreateQuestion(role: Role | null): boolean {
  return role === "admin" || role === "supervisor" || role === "writer";
}

export function canEditQuestion(
  role: Role | null,
  question: Question,
  uid: string | undefined
): boolean {
  if (role === "admin" || role === "supervisor") return true;
  if (role === "writer") return question.authorUid === uid;
  return false;
}

export function canDeleteQuestion(
  role: Role | null,
  question: Question,
  uid: string | undefined
): boolean {
  if (role === "admin" || role === "supervisor") return true;
  if (role === "writer") return question.authorUid === uid;
  return false;
}

// 校正状態は問題統括・管理者のみ変更できる。
export function canEditProofreadStatus(role: Role | null): boolean {
  return role === "admin" || role === "supervisor";
}

// ステータスの選択肢はロールによって異なる。
// 作問者：下書き／作問完了のみ。問題統括・管理者：採用／不採用も含め全て。
export function allowedStatusOptions(role: Role | null): QuestionStatus[] {
  if (role === "admin" || role === "supervisor") {
    return ["draft", "completed", "adopted", "rejected"];
  }
  if (role === "writer") {
    return ["draft", "completed"];
  }
  return [];
}

// 問題文・答えの編集を「改訂」として履歴化するかどうか。
// 問題統括・管理者が編集する場合のみ改訂として記録する
// （作問者自身の作業中の編集は通常の下書き保存であり改訂ではない）。
export function shouldLogRevision(role: Role | null): boolean {
  return role === "admin" || role === "supervisor";
}

export const roleLabel: Record<Role, string> = {
  admin: "管理者",
  supervisor: "問題統括",
  writer: "作問者",
  viewer: "閲覧者",
};

export const statusLabel: Record<QuestionStatus, string> = {
  draft: "下書き",
  completed: "作問完了",
  adopted: "採用",
  rejected: "不採用",
};
