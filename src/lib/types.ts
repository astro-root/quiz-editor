export type Role = "owner" | "editor" | "viewer";

export type QuestionStatus = "draft" | "adopted" | "rejected";
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
  createdAt: number;
  updatedAt: number;
}

export interface Question {
  id: string;
  body: string;
  answer: string;
  altAnswers: string[];
  judgingCriteria: string; // 正誤判定基準
  genre: string; // ジャンル（タグとは別に1つだけ持たせる大分類）
  explanation: string;
  source: string; // 出典（URLを含めてもよい）
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
