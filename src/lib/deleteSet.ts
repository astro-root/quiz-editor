import { collection, deleteDoc, doc, DocumentReference, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { cleanMeta, deleteImages } from "./questionImages";

async function deleteAll(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const b = writeBatch(db);
    refs.slice(i, i + 400).forEach((r) => b.delete(r));
    await b.commit();
  }
}

// セット内の問題・添付画像・未承諾の招待を削除してから、セット本体を削除する。
// 途中で失敗した場合は残りが残るので、同じ操作を再実行すれば続きから削除される。
export async function deleteQuestionSet(setId: string) {
  const questions = await getDocs(collection(db, "questionSets", setId, "questions"));
  // 添付画像は問題とは別の文書なので、問題の目録（imageMeta）から探して先に消す
  const pics = questions.docs.flatMap((d) => cleanMeta(d.data().imageMeta).map((m) => ({ qid: d.id, id: m.id })));
  if (pics.length) await deleteImages(setId, pics);
  await deleteAll(questions.docs.map((d) => d.ref));
  const invites = await getDocs(collection(db, "questionSets", setId, "pendingInvites"));
  await deleteAll(invites.docs.map((d) => d.ref));
  await deleteDoc(doc(db, "questionSets", setId));
}
