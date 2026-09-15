"use client";

import { useRef, useState } from "react";
import { useHistory } from "@/lib/useHistory";
import { useRevisions } from "@/lib/useRevisions";
import { shouldLogRevision } from "@/lib/permissions";
import { QuestionCard } from "./QuestionCard";
import { Question, Role } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

// 一覧の1行を展開したときに使う、自分専用のdebounce保存・履歴・改訂ロジックを
// 持つ小さなエディタ。管理ページ・採用ページの両方から使う。
export function InlineQuestionEditor({
  setId,
  question,
  role,
  uid,
  genres,
  onUpdate,
  onDelete,
  findDuplicate,
}: {
  setId: string;
  question: Question;
  role: Role;
  uid: string | undefined;
  genres: string[];
  onUpdate: (id: string, patch: Partial<Question>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  findDuplicate: (body: string, excludeId?: string) => Question | null;
}) {
  const [draft, setDraft] = useState(question);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseline = useRef({ body: question.body, answer: question.answer });
  const revisionLogged = useRef(false);

  const { history, logChange } = useHistory(setId, question.id);
  const { revisions, saveRevision } = useRevisions(setId, question.id);

  function handleChange(patch: Partial<Question>) {
    if (patch.status && patch.status !== draft.status) {
      logChange(question.id, "status", draft.status, patch.status);
    }
    if (patch.proofreadStatus && patch.proofreadStatus !== draft.proofreadStatus) {
      logChange(question.id, "proofreadStatus", draft.proofreadStatus, patch.proofreadStatus);
    }
    const touchesContent = patch.body !== undefined || patch.answer !== undefined;
    if (touchesContent && shouldLogRevision(role) && !revisionLogged.current) {
      saveRevision(question.id, baseline.current.body, baseline.current.answer);
      revisionLogged.current = true;
    }

    const next = { ...draft, ...patch };
    setDraft(next);
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await onUpdate(question.id, patch);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 600);
  }

  return (
    <QuestionCard
      setId={setId}
      question={draft}
      role={role}
      uid={uid}
      genres={genres}
      saveState={saveState}
      duplicateOf={findDuplicate(draft.body, draft.id)}
      history={history}
      revisions={revisions}
      onChange={handleChange}
      onCreateNext={() => {}}
      onNavigate={() => {}}
      onDelete={() => onDelete(question.id)}
      showNavigation={false}
    />
  );
}
