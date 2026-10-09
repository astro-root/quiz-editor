import { Question } from "./types";

export interface UserStat {
  uid: string;
  created: number;
  adopted: number;
  rejected: number;
  undecided: number;
  adoptRate: number | null; // 採用 ÷ 作成
  decidedRate: number | null; // 採用 ÷ (採用+却下)
  assigned: number; // 裏どり担当数
  approved: number; // 裏どり完了（確認済み）数
}

export function computeStats(live: Question[]): UserStat[] {
  const m = new Map<string, UserStat>();
  const get = (uid: string) => {
    let s = m.get(uid);
    if (!s) m.set(uid, (s = { uid, created: 0, adopted: 0, rejected: 0, undecided: 0, adoptRate: null, decidedRate: null, assigned: 0, approved: 0 }));
    return s;
  };
  for (const q of live) {
    const a = get(q.authorUid);
    a.created++;
    if (q.status === "adopted") a.adopted++;
    else if (q.status === "rejected") a.rejected++;
    else a.undecided++;
    if (q.assigneeUid) {
      const c = get(q.assigneeUid);
      c.assigned++;
      if (q.proofreadStatus === "approved") c.approved++;
    }
  }
  const out = Array.from(m.values());
  for (const s of out) {
    s.adoptRate = s.created ? s.adopted / s.created : null;
    s.decidedRate = s.adopted + s.rejected ? s.adopted / (s.adopted + s.rejected) : null;
  }
  return out.sort((a, b) => b.created - a.created);
}
