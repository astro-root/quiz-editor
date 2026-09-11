"use client";

import { useState } from "react";
import { QuestionSet, Role } from "@/lib/types";
import { inviteMember } from "@/lib/useInvites";
import { useAuth } from "@/lib/auth-context";

interface Props {
  set: QuestionSet;
  isOwner: boolean;
  onClose: () => void;
}

export function ShareDialog({ set, isOwner, onClose }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleInvite() {
    if (!user || !email.trim()) return;
    setStatus("sending");
    try {
      await inviteMember(set.id, set.name, user.uid, email, role);
      setStatus("sent");
      setEmail("");
    } catch (e) {
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">共有設定</h2>

        <div className="mb-4 space-y-1 text-sm">
          {Object.entries(set.members).map(([uid, r]) => (
            <div key={uid} className="flex justify-between text-gray-600">
              <span className="truncate">{uid === user?.uid ? "自分" : uid}</span>
              <span>
                {r === "owner" ? "オーナー" : r === "editor" ? "編集者" : "閲覧者"}
              </span>
            </div>
          ))}
        </div>

        {isOwner ? (
          <div className="space-y-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="招待するメールアドレス"
              className="w-full rounded-lg border border-gray-200 p-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-gray-200 p-2 text-sm"
            >
              <option value="editor">編集者</option>
              <option value="viewer">閲覧者</option>
            </select>
            <button
              onClick={handleInvite}
              className="w-full rounded-lg bg-blue-600 p-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              招待する
            </button>
            {status === "sent" && (
              <p className="text-xs text-green-600">
                招待しました（相手が登録・ログインすると反映されます）
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-red-500">招待に失敗しました</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            メンバーの招待はオーナーのみ行えます
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
