export type Role = "admin" | "supervisor" | "writer" | "viewer";

// 下書き→作問完了（作問者）→採用/不採用（問題統括・管理者）という流れ。
export type QuestionStatus = "draft" | "completed" | "adopted" | "rejected";
export type ProofreadStatus =
  | "unchecked"
  | "in_review"
  | "needs_fix"
  | "approved"
  | "on_hold";

export interface MemberProfile {
  email: string;
  displayName: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, Role>;
  memberProfiles: Record<string, MemberProfile>;
  genres: string[];
  noticeBody: string;
  createdAt: number;
  updatedAt: number;
}

export const MAX_SOURCES = 5;

export interface Question {
  id: string;
  body: string;
  answer: string;
  altAnswers: string[];
  judgingCriteria: string; // 正誤判定基準
  genre: string; // ジャンル（セットのgenresから選択）
  explanation: string;
  sources: string[]; // 出典（最大5枠、空文字を含む固定長配列として扱う）
  memo: string; // 備考
  tags: string[];
  authorUid: string;
  authorName: string;
  status: QuestionStatus;
  proofreadStatus: ProofreadStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionComment {
  id: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdAt: number;
}

// 変更履歴：書き込み回数を抑えるため、頻繁に変わる本文・解説などの
// テキストフィールドは対象外にし、ステータス／校正状態の変更のみ記録する。
export interface HistoryEntry {
  id: string;
  field: "status" | "proofreadStatus";
  from: string;
  to: string;
  authorUid: string;
  authorName: string;
  createdAt: number;
}

// 問題文・答えの改訂版（問題統括・管理者が編集する際のスナップショット）。
export interface Revision {
  id: string;
  body: string;
  answer: string;
  editedByUid: string;
  editedByName: string;
  createdAt: number;
}

export interface Invite {
  setId: string;
  setName: string;
  role: Role;
  invitedBy: string;
  createdAt: number;
}

export interface PendingInvite {
  email: string;
  role: Role;
  createdAt: number;
}
