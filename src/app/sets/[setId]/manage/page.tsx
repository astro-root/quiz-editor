"use client";

import { useQuestions } from "@/lib/useQuestions";
import { useSetContext } from "@/lib/SetContext";
import { canCreateQuestion } from "@/lib/permissions";
import { QuestionList } from "@/components/QuestionList";

export default function ManagePage() {
  const { set, role } = useSetContext();
  const { questions, importQuestions } = useQuestions(set.id);

  return (
    <QuestionList
      questions={questions}
      setName={set.name}
      canImport={canCreateQuestion(role)}
      onImportRows={importQuestions}
    />
  );
}
