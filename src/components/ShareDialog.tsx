"use client";

import { useState } from "react";
import { X, Mail, Crown, Pencil, Eye, Clock, Trash2 } from "lucide-react";
import { QuestionSet, Role } from "@/lib/types";
import { cancelInvite, inviteMember, usePendingInvites } from "@/lib/useInvites";
import { useAuth } from "@/lib/auth-context";

interface Props {
  set: QuestionSet;
  isOwner: boolean;
  onClose: () => void;
}

const roleLabel: Record<Role, string> = {
  owner: "オーナー",
  editor: "編集者",
  viewer: "閲覧者",
};

const roleIcon: Record<Role, React.ReactNode> = {
  owner: <Crown size={14} className="text-amber-500" />,
  editor: <Pencil size={14} className="text-blue-500" />,
  viewer: <Eye size={14} className="text-gray-400" />,
};

export function ShareDialog({ set, isOwner, onClose }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const pending = usePendingInvites(set.id, isOwner);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">共有設定</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-2 text-xs font-medium text-slate-400">メンバー</p>
        <div className="mb-4 max-h-40 space-y-1.5 overflow-y-auto">
          {Object.entries(set.members).map(([uid, r]) => {
            const profile = set.memberProfiles?.[uid];
            return (
              <div
                key={uid}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="truncate text-slate-700">
                  {uid === user?.uid
                    ? "自分"
                    : profile?.displayName || profile?.email || uid}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                  {roleIcon[r as Role]}
                  {roleLabel[r as Role]}
                </span>
              </div>
            );
          })}
        </div>

        {isOwner && pending.length > 0 && (
          <>
            <p className="mb-2 text-xs font-medium text-slate-400">招待中</p>
            <div className="mb-4 space-y-1.5">
              {pending.map((p) => (
                <div
                  key={p.email}
                  className="flex items-center justify-between rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-1.5 truncate text-slate-600">
                    <Clock size={13} className="text-amber-500" />
                    {p.email}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    {roleLabel[p.role]}
                    <button
                      onClick={() => cancelInvite(set.id, p.email)}
                      className="text-slate-400 hover:text-red-500"
                      title="招待を取り消す"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {isOwner ? (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="招待するメールアドレス"
                className="w-full rounded-lg border border-slate-200 p-2 pl-9 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-slate-200 p-2 text-sm"
            >
              <option value="editor">編集者として招待</option>
              <option value="viewer">閲覧者として招待</option>
            </select>
            <button
              onClick={handleInvite}
              className="w-full rounded-lg bg-blue-600 p-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              招待する
            </button>
            {status === "sent" && (
              <p className="text-xs text-emerald-600">
                招待しました（相手が登録・ログインすると反映されます）
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-red-500">招待に失敗しました</p>
            )}
          </div>
        ) : (
          <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">
            メンバーの招待はオーナーのみ行えます
          </p>
        )}
      </div>
    </div>
  );
}
