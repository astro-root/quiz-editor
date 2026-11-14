import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";

// サイトの運営者（管理者ページに入れる人）かどうか。
// siteAdmins/{uid} という文書があれば運営者。この文書は、Firebase コンソールからしか作れない（ルールで、アプリからは書けない）。
// ここでの判定は、画面を出し分けるためのもの。データを守っているのは、firestore.rules。
export function useIsSiteAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<{ uid: string | null; isAdmin: boolean }>({ uid: null, isAdmin: false });
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getDoc(doc(db, "siteAdmins", uid))
      .then((s) => alive && setState({ uid, isAdmin: s.exists() }))
      .catch(() => alive && setState({ uid, isAdmin: false }));
    return () => { alive = false; };
  }, [uid]);
  const loading = authLoading || (!!uid && state.uid !== uid);
  return { isAdmin: !!uid && state.uid === uid && state.isAdmin, loading };
}
