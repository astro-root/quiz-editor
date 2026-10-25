// 役割：admin=管理者（作成者=ownerIdはオーナーとして削除・降格不可）、supervisor=問題統括、
// writer=作問者（編集者）、checker=裏どり担当、viewer=閲覧者
export type Role = "admin" | "supervisor" | "writer" | "checker" | "viewer";
export const ALL_ROLES: Role[] = ["admin", "supervisor", "writer", "checker", "viewer"];

// draft/completed = 未判定、adopted = 採用、rejected = 却下
export type QuestionStatus = "draft" | "completed" | "adopted" | "rejected";
// 「担当者割り当て済み」は unchecked かつ assigneeUid あり、として導出する（データ移行を避けるため）
export type ProofreadStatus = "unchecked" | "in_review" | "needs_fix" | "approved" | "on_hold";

export interface MemberProfile {
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface GenreSub {
  id: string;
  name: string;
}
export interface GenreNode {
  id: string;
  name: string;
  subs: GenreSub[];
}

// 出題順ルール。大会（Round）ごとに上書きできる。新ルールは RULE_DEFS（orderRules.ts）に足すだけ。
export interface OrderRules {
  sameGenre: boolean; // 同じ大ジャンルを連続させない
  sameSub: boolean; // 同じ小ジャンルを連続させない
  sameAuthor: boolean; // 同じ作問者を連続させない
  maxRun: number; // 上記の「連続」とみなす長さ（2=2連続で違反）
}
export const DEFAULT_RULES: OrderRules = { sameGenre: true, sameSub: true, sameAuthor: true, maxRun: 2 };

export interface Round {
  id: string;
  name: string;
  rules?: OrderRules;
}

export interface QuestionSet {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, Role>;
  memberProfiles: Record<string, MemberProfile>;
  genres: string[]; // 旧形式（文字列配列）。genreTree が無いセットの読み取り専用フォールバック
  genreTree: GenreNode[];
  rounds: Round[];
  noticeBody: string;
  createdAt: number;
  updatedAt: number;
}

export const MAX_SOURCES = 5;

// 問題に添付する画像。本体は questions/{id}/images/{imageId} に別文書として保存し、問題側には目録（imageMeta）だけを持つ。
export type ImageSlot = "body" | "answer" | "explanation";
export interface ImageMeta { id: string; field: ImageSlot; w: number; h: number }
export const MAX_IMAGES = 6; // 1問あたりの上限

export interface Question {
  id: string;
  body: string;
  answer: string;
  altAnswers: string[];
  judgingCriteria: string;
  genreId: string; // 大ジャンルID（旧データは genre 文字列＝移行済みノードのID）
  subGenreId: string;
  explanation: string;
  sources: string[];
  memo: string;
  tags: string[];
  authorUid: string;
  authorName: string; // 作成時点のスナップショット。表示は memberProfiles を優先
  status: QuestionStatus;
  proofreadStatus: ProofreadStatus;
  assigneeUid: string; // 裏どり担当
  roundId: string;
  playOrder: number | null; // Round内の出題順
  imageMeta: ImageMeta[]; // 添付画像の目録（問題文・解答・解説）
  order: number; // 作成順
  deletedAt: number | null;
  deletedBy: string;
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

export type HistoryField = "status" | "proofreadStatus" | "assignee" | "round";
export interface HistoryEntry {
  id: string;
  field: HistoryField;
  from: string;
  to: string;
  authorUid: string;
  authorName: string;
  createdAt: number;
}

export interface Revision {
  id: string;
  body: string;
  answer: string;
  editedByUid: string;
  editedByName: string;
  createdAt: number;
}

// 旧メール招待（invites/{email}）。既存の招待が残っている間だけ読み取る
export interface Invite {
  setId: string;
  setName: string;
  role: Role;
  invitedBy: string;
  createdAt: number;
}

// 新招待（setInvites/{setId}_{uid}）
export interface SetInvite {
  id: string;
  setId: string;
  setName: string;
  role: Role;
  inviteeUid: string;
  invitedBy: string;
  inviterName: string;
}

export interface PendingInvite {
  uid: string;
  role: Role;
  displayName: string;
  photoURL: string;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL: string;
}
