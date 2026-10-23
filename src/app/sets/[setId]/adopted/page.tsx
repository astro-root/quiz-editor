"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical, Pencil, Save, Shuffle, Undo2 } from "lucide-react";
import { useSetContext } from "@/lib/SetContext";
import { useQuestionStore } from "@/lib/QuestionsContext";
import { canReorder, canManageGenres } from "@/lib/permissions";
import { checkOrder, RULE_DEFS, shuffleWithRules } from "@/lib/orderRules";
import { DEFAULT_RULES, OrderRules, Question } from "@/lib/types";
import { QuestionEditor } from "@/components/QuestionEditor";
import { PersonChip } from "@/components/Avatar";

const byPlay = (a: Question, b: Question) => (a.playOrder ?? Infinity) - (b.playOrder ?? Infinity) || a.order - b.order;

export default function OrderPage() {
  const { set, role, gi, personOf, actions } = useSetContext();
  const store = useQuestionStore();
  const reorderable = canReorder(role);
  const [roundId, setRoundId] = useState("");
  const [working, setWorking] = useState<string[]>([]); // 画面上の並び（未保存を含む）
  const [shuffled, setShuffled] = useState<{ violations: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localRules, setLocalRules] = useState<OrderRules>(DEFAULT_RULES);

  const adopted = useMemo(() => store.live.filter((q) => q.status === "adopted"), [store.live]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of adopted) m.set(q.roundId, (m.get(q.roundId) ?? 0) + 1);
    return m;
  }, [adopted]);
  const saved = useMemo(() => adopted.filter((q) => q.roundId === roundId).sort(byPlay), [adopted, roundId]);
  const savedIds = saved.map((q) => q.id).join(",");
  const byId = useMemo(() => new Map(saved.map((q) => [q.id, q])), [saved]);

  const dirty = working.join(",") !== savedIds;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  // 保存済みの並びが変わったとき：未保存の編集が無ければ追従、あれば手元の並びを保ち、新規分だけ末尾に足す
  useEffect(() => {
    const ids = savedIds ? savedIds.split(",") : [];
    setWorking((prev) => {
      if (!dirtyRef.current && prev.join(",") !== savedIds) return ids;
      const kept = prev.filter((id) => ids.includes(id));
      return [...kept, ...ids.filter((id) => !kept.includes(id))];
    });
  }, [savedIds]);
  useEffect(() => { setShuffled(null); setEditingId(null); setError(""); }, [roundId]);

  const round = set.rounds.find((r) => r.id === roundId);
  const rules = round ? round.rules ?? DEFAULT_RULES : localRules;
  const list = working.map((id) => byId.get(id)).filter((q): q is Question => !!q);

  const keyName = (k: string, ruleId: string) => {
    if (ruleId === "sameGenre") return gi.majorName(k);
    if (ruleId === "sameSub") { const [m, s] = k.split("/"); return `${gi.majorName(m)} / ${gi.subName(m, s)}`; }
    return personOf(k).name;
  };
  const violations = useMemo(() => checkOrder(list, rules, keyName), [list, rules]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = new Set(violations.map((v) => v.index));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setWorking((w) => arrayMove(w, w.indexOf(String(e.active.id)), w.indexOf(String(e.over!.id))));
    setShuffled(null);
  }

  function doShuffle() {
    if (dirty && !shuffled && !confirm("未保存の並び替えがあります。シャッフルで上書きしますか？")) return;
    const r = shuffleWithRules(list, rules);
    setWorking(r.order.map((q) => q.id));
    setShuffled({ violations: r.violations });
  }

  async function saveOrder() {
    setSaving(true);
    setError("");
    try {
      const changes = working
        .map((id, i) => ({ id, playOrder: i + 1 }))
        .filter((o) => byId.get(o.id)?.playOrder !== o.playOrder);
      await store.setPlayOrders(changes);
      setShuffled(null);
    } catch (e: any) {
      console.error("出題順の保存に失敗しました", e);
      setError(e?.code === "permission-denied" ? "出題順を変更する権限がありません" : "保存に失敗しました。もう一度お試しください");
    } finally {
      setSaving(false);
    }
  }

  async function updateRules(next: OrderRules) {
    setError("");
    if (!round) return setLocalRules(next);
    try {
      await actions.saveRounds(set.rounds.map((r) => (r.id === round.id ? { ...r, rules: next } : r)));
    } catch (e) {
      console.error(e);
      setError("ルールの保存に失敗しました");
    }
  }

  const tabBtn = (id: string, label: string) => (
    <button key={id || "none"} onClick={() => !dirty || confirm("未保存の並び替えを破棄してRoundを切り替えますか？") ? setRoundId(id) : null}
      className={`rounded-full border px-3 py-1 text-sm ${roundId === id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-surface text-slate-600 hover:border-brand-300"}`}>
      {label}<span className="ml-1.5 text-xs opacity-70">{counts.get(id) ?? 0}</span>
    </button>
  );

  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">採用問題の数（Round別）</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {set.rounds.map((r) => tabBtn(r.id, r.name))}
        {tabBtn("", "Round未指定")}
      </div>

      <div className="mb-3 rounded-xl border border-slate-200 bg-surface p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">出題順ルール{round ? `（${round.name}）` : "（Round未指定は保存されません）"}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
          {RULE_DEFS.map((d) => (
            <label key={d.id} className="flex items-center gap-1.5">
              <input type="checkbox" disabled={round ? !canManageGenres(role) : false} checked={rules[d.id]} onChange={(e) => updateRules({ ...rules, [d.id]: e.target.checked })} />
              {d.label}を避ける
            </label>
          ))}
          <label className="flex items-center gap-1.5">連続の長さ
            <select value={rules.maxRun} disabled={round ? !canManageGenres(role) : false} onChange={(e) => updateRules({ ...rules, maxRun: Number(e.target.value) })} className="rounded border border-slate-200 px-1 py-0.5 text-sm">
              {[2, 3, 4].map((n) => <option key={n} value={n}>{n}問</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-500">{list.length}問</p>
        {reorderable && (
          <>
            <button onClick={doShuffle} disabled={list.length < 2} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs text-slate-600 hover:border-brand-300 hover:text-accent disabled:opacity-40">
              <Shuffle size={13} />ルールを考慮してシャッフル
            </button>
            {dirty && (
              <>
                <button onClick={saveOrder} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"><Save size={13} />{saving ? "保存中…" : "この順番で保存"}</button>
                <button onClick={() => { setWorking(savedIds ? savedIds.split(",") : []); setShuffled(null); }} disabled={saving} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"><Undo2 size={13} />元に戻す</button>
              </>
            )}
          </>
        )}
      </div>

      {shuffled && (
        <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-info">
          シャッフル結果をプレビュー中です（まだ保存されていません）。{shuffled.violations > 0 ? `条件を完全には満たせず、違反が${shuffled.violations}件残っています。再度シャッフルするか手動で調整してください。` : "すべてのルールを満たしています。"}
        </p>
      )}
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-danger">{error}</p>}
      {violations.length > 0 ? (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-warn-strong">
          <p className="mb-1 flex items-center gap-1 font-medium"><AlertTriangle size={13} />ルール違反 {violations.length}件</p>
          <ul className="list-inside list-disc">{violations.slice(0, 20).map((v, i) => <li key={i}>{v.message}</li>)}</ul>
          {violations.length > 20 && <p>…ほか{violations.length - 20}件</p>}
        </div>
      ) : list.length > 1 ? (
        <p className="mb-3 text-xs text-ok">ルール違反はありません</p>
      ) : null}

      {list.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 bg-surface p-8 text-center text-sm text-slate-400">このRoundに採用された問題がありません。「問題」タブで採用とRoundを設定してください。</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={working} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {list.map((q, i) =>
              editingId === q.id ? (
                <QuestionEditor key={q.id} question={q} onClose={() => setEditingId(null)} />
              ) : (
                <SortableRow key={q.id} q={q} index={i} bad={bad.has(i)} disabled={!reorderable} onEdit={() => setEditingId(q.id)} gi={gi} author={personOf(q.authorUid, q.authorName)} />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({ q, index, bad, disabled, onEdit, gi, author }: { q: Question; index: number; bad: boolean; disabled: boolean; onEdit: () => void; gi: any; author: { name: string; photoURL: string; known: boolean } }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id, disabled });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`flex items-center gap-2 rounded-xl border bg-surface p-2.5 text-sm shadow-sm ${bad ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}>
      {!disabled && (
        <button {...attributes} {...listeners} aria-label={`${index + 1}問目をドラッグして並び替え`} className="touch-none cursor-grab rounded p-2 text-slate-300 hover:bg-slate-50 hover:text-slate-500 active:cursor-grabbing">
          <GripVertical size={18} />
        </button>
      )}
      <span className="w-8 shrink-0 text-center text-xs font-medium text-slate-400">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-slate-700">{q.body}</p>
        <p className="truncate text-accent">{q.answer}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
          {q.genreId && <span>{gi.majorName(q.genreId)}{q.subGenreId && ` / ${gi.subName(q.genreId, q.subGenreId)}`}</span>}
          <PersonChip name={author.name} photoURL={author.photoURL} size={14} muted />
        </p>
      </div>
      <button onClick={onEdit} aria-label="編集" className="shrink-0 rounded p-2 text-slate-300 hover:bg-slate-50 hover:text-slate-500"><Pencil size={14} /></button>
    </div>
  );
}
