"use client";

import { createContext, useContext, ReactNode } from "react";
import { QuestionSet, Role } from "./types";
import { useAuth } from "./auth-context";

interface SetContextValue {
  set: QuestionSet;
  role: Role;
  addGenre: (genre: string) => Promise<void>;
  updateNotice: (body: string) => Promise<void>;
}

const SetContext = createContext<SetContextValue | null>(null);

export function SetProvider({
  set,
  addGenre,
  updateNotice,
  children,
}: {
  set: QuestionSet;
  addGenre: (genre: string) => Promise<void>;
  updateNotice: (body: string) => Promise<void>;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const role = (user && set.members[user.uid]) || null;
  if (!role) return null;
  return (
    <SetContext.Provider value={{ set, role, addGenre, updateNotice }}>
      {children}
    </SetContext.Provider>
  );
}

export function useSetContext() {
  const ctx = useContext(SetContext);
  if (!ctx) throw new Error("useSetContext must be used within SetProvider");
  return ctx;
}
