export type Role = "owner" | "editor" | "viewer";

export type QuestionStatus = "draft" | "adopted" | "rejected";
export type ProofreadStatus = "unchecked" | "checked";

export interface QuestionSet {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, Role>;
  createdAt: number;
  updatedAt: number;
}

export interface Question {
  id: string;
  body: string;
  answer: string;
  altAnswers: string[];
  explanation: string;
  source: string;
  tags: string[];
  authorUid: string;
  authorName: string;
  status: QuestionStatus;
  proofreadStatus: ProofreadStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Invite {
  setId: string;
  setName: string;
  role: Role;
  invitedBy: string;
  createdAt: number;
}
