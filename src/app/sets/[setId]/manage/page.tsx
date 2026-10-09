"use client";

import { useQuestionStore } from "@/lib/QuestionsContext";
import { QuestionBrowser } from "@/components/QuestionBrowser";
import { ScopeNav } from "@/components/ScopeNav";
import { useSetContext } from "@/lib/SetContext";

export default function ManagePage() {
  const { set } = useSetContext();
  const { live } = useQuestionStore();
  return <QuestionBrowser base={live} storageKey={`qraft:f:${set.id}:all`} header={<ScopeNav />} />;
}
