"use client";

import { useAuth } from "@/lib/auth-context";
import { useQuestions } from "@/lib/useQuestions";
import { useSetContext } from "@/lib/SetContext";
import { canCreateQuestion } from "@/lib/permissions";
import { QuestionList } from "@/components/QuestionList";

export default function ManagePage() {
  const { set, role } = useSetContext();
  const { user } = useAuth();
  const { questions, updateQuestion, deleteQuestion, importQuestions, findDuplicate } =
    useQuestions(set.id);

  return (
    <QuestionList
      questions={questions}
      setId={set.id}
      setName={set.name}
      role={role}
      uid={user?.uid}
      genres={set.genres}
      canImport={canCreateQuestion(role)}
      onImportRows={importQuestions}
      onUpdate={updateQuestion}
      onDelete={deleteQuestion}
      findDuplicate={findDuplicate}
    />
  );
}
