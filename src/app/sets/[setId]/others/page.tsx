"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { useSetContext } from "@/lib/SetContext";
import { QuestionBrowser } from "@/components/QuestionBrowser";
import { ScopeNav } from "@/components/ScopeNav";

// 他のメンバーが作成した問題。ゴミ箱の問題は含まない。
// セットのメンバーでないユーザーにはセット自体が読めない（Firestoreルール）。
export default function OthersPage() {
  const { user } = useAuth();
  const { set } = useSetContext();
  const { live } = useQuestionStore();
  const others = useMemo(() => live.filter((q) => q.authorUid !== user?.uid), [live, user]);
  return <QuestionBrowser base={others} storageKey={`qraft:f:${set.id}:others`} emptyText="他のメンバーの問題はまだありません" header={<ScopeNav />} />;
}
