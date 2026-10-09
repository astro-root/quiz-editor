"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { QuestionSet, Role } from "./types";
import { SetActions } from "./useQuestionSets";
import { useAuth } from "./auth-context";
import { effectiveTree, indexTree, GenreIndex } from "./genres";
import { GenreNode } from "./types";

interface SetContextValue {
  set: QuestionSet;
  role: Role;
  actions: SetActions;
  tree: GenreNode[];
  gi: GenreIndex;
  // 表示名・アイコンは常に memberProfiles から引く。退出・削除済みユーザーでも落ちない
  personOf: (uid: string, fallbackName?: string) => { name: string; photoURL: string; known: boolean };
}

const SetContext = createContext<SetContextValue | null>(null);

export function SetProvider({ set, actions, children }: { set: QuestionSet; actions: SetActions; children: ReactNode }) {
  const { user } = useAuth();
  const role = (user && set.members[user.uid]) || null;
  const tree = useMemo(() => effectiveTree(set), [set]);
  const gi = useMemo(() => indexTree(tree), [tree]);
  const value = useMemo(() => {
    if (!role) return null;
    return {
      set, role: role as Role, actions, tree, gi,
      personOf: (uid: string, fallbackName = "") => {
        const p = set.memberProfiles?.[uid];
        if (p) return { name: p.displayName || p.email || "名無し", photoURL: p.photoURL ?? "", known: true };
        return { name: fallbackName ? `${fallbackName}` : "退出したユーザー", photoURL: "", known: false };
      },
    };
  }, [set, role, actions, tree, gi]);
  if (!value) return null;
  return <SetContext.Provider value={value}>{children}</SetContext.Provider>;
}

export function useSetContext() {
  const ctx = useContext(SetContext);
  if (!ctx) throw new Error("useSetContext must be used within SetProvider");
  return ctx;
}
