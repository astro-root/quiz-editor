"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { useSetContext } from "@/lib/SetContext";
import { canCreateQuestion } from "@/lib/permissions";
import { QuestionBrowser } from "@/components/QuestionBrowser";
import { ScopeNav } from "@/components/ScopeNav";

export default function MinePage() {
  const { user } = useAuth();
  const { set, role } = useSetContext();
  const { live } = useQuestionStore();
  const mine = useMemo(() => live.filter((q) => q.authorUid === user?.uid), [live, user]);
  return (
    <QuestionBrowser
      base={mine}
      storageKey={`qraft:f:${set.id}:mine`}
      showAuthor={false}
      emptyText="まだ自分の問題がありません"
      header={
        <div className="flex items-center justify-between">
          <ScopeNav />
          {canCreateQuestion(role) && (
            <Link href={`/sets/${set.id}/write`} className="mb-3 flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
              <Plus size={14} />問題を作成
            </Link>
          )}
        </div>
      }
    />
  );
}
