import { collection, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

// セット内の問題と未承諾の招待を削除してから、セット本体を削除する。
// 途中で失敗した場合は残りが残るので、同じ操作を再実行すれば続きから削除される。
export async function deleteQuestionSet(setId: string) {
  for (const sub of ["questions", "pendingInvites"]) {
    const snap = await getDocs(collection(db, "questionSets", setId, sub));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  }
  await deleteDoc(doc(db, "questionSets", setId));
}
