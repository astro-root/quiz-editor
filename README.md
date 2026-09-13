# Qraft（クイズ作問エディタ MVP）

クイズ大会などの作問を効率化するための専用Webエディタ。Excel/スプレッドシートの代替ではなく、問題を1つの「オブジェクト」として扱う専用UIを目指すプロジェクトのMVP。

## 1. 概要

- 問題は「セル」ではなく「カード」として編集する
- お知らせページ→作問／管理／採用の4つのページで構成（フォルダを開くと、まず管理者が書いたお知らせが表示される）
- 作問モード：1問に集中し、`⌘/Ctrl+Enter` で保存して次の問題へ進む
- 管理モード：問題セット全体を俯瞰し、作問者・ジャンル・タグ・ステータス・校正状態でフィルタ
- 採用ページ：採用済みの問題だけを表示し、シャッフルや再編集ができる
- 複数人で1つの問題セットを共有し、**管理者／問題統括／作問者／閲覧者**の4段階の権限で共同作問

## 2. 必要な環境

- Node.js 20系
- npm
- Firebaseアカウント（無料のSparkプランで動作します。クレジットカード登録は不要です）

## 3. ローカル起動方法

```bash
npm install
cp .env.example .env.local   # 4の手順で取得した値を書き込む
npm run dev
```

`http://localhost:3000` を開く。

## 4. Firebaseプロジェクトの作成方法

1. https://console.firebase.google.com/ にアクセスし「プロジェクトを追加」
2. プロジェクト名を入力（例：quiz-question-editor）
3. Google Analyticsは不要なのでオフのままで問題ない
4. プロジェクト作成後、「ウェブアプリを追加」（`</>`アイコン）をクリック
5. 表示された `firebaseConfig` の値を `.env.local` の各項目に対応させて入力する
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

**重要**：この構成ではCloud Storage・Cloud Functionsは使用しません。これらはBlaze（従量課金）プランへのアップグレードとクレジットカード登録が必須になるため、意図的に避けています。SparkプランのままAuthenticationとFirestoreのみで動作します。

## 5. Firebase Authenticationの設定

1. Firebaseコンソール左メニューから「Authentication」→「Sign-in method」
2. 「メール/パスワード」プロバイダを有効化

## 6. Firestoreの設定

1. Firebaseコンソール左メニューから「Firestore Database」→「データベースの作成」
2. 本番環境モードを選択（ルールは後述の手順でデプロイする）
3. リージョンは日本からのアクセスが多い場合 `asia-northeast1`（東京）を推奨

## 7. 環境変数の設定

`.env.example` を `.env.local` にコピーし、手順4で取得した値を埋める。`.env.local` はGitにコミットしない（`.gitignore` 済み）。

## 8. Firestore Security Rulesのデプロイ方法

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # 作成したFirebaseプロジェクトを選択
firebase deploy --only firestore:rules
```

`firestore.rules` に権限ロジック（オーナー／編集者／閲覧者、招待の検証）が入っている。フロントエンドのボタン表示だけでなく、このルールが最終的なアクセス制御になる。

## 9. Codespacesでの起動方法

1. このリポジトリをGitHubにpush
2. GitHub上で「Code」→「Codespaces」→「Create codespace on main」
3. Codespace起動後、ターミナルで `npm install && cp .env.example .env.local`
4. `.env.local` にFirebaseの値を入力
5. `npm run dev` → ポート3000をブラウザで開く

## 10. 本番デプロイ方法（Vercel）

Firebase Hostingは使わず、既存の運用に合わせてVercelを使用する。

1. https://vercel.com でGitHubリポジトリをインポート
2. 環境変数（`.env.example` と同じキー）をVercelのプロジェクト設定に登録
3. デプロイ

## MVPで実装していること

- メール/パスワードでのアカウント作成・ログイン・ログアウト
- 問題セットの作成、ダッシュボードでの一覧表示
- お知らせページ（管理者が自由記述、フォルダを開くと最初に表示）→作問／管理／採用の4ページ構成
- 作問モード（1問集中・インライン編集・自動保存・`⌘/Ctrl+Enter`で次の問題、文字数表示、キーリピートによる二重作成を防止済み）
- 問題フィールド：問題文・答え・別解／表記揺れ・正誤判定基準・解説・出典（最大5枠、URLはリンク化）・ジャンル（ドロップダウン選択）・タグ・備考・ステータス（下書き／作問完了／採用／不採用）・校正状態（未確認／校正中／要修正／承認済み／保留）
- **4段階の権限**：管理者（メンバー招待・お知らせ編集・ジャンル作成・全問題の編集/削除・全ステータス変更）／問題統括（ジャンル作成・任意の問題の校正状態とステータス変更・問題文の改訂版作成）／作問者（自分の問題の作成・編集・削除、ステータスは下書き／作問完了のみ）／閲覧者（閲覧のみ）
- 改訂履歴（問題統括・管理者が問題文・答えを編集すると、編集前の内容が改訂履歴として残る）
- 採用ページ（採用済みの問題のみ表示、シャッフル表示、インライン再編集）
- 簡易重複検出（同一の問題文がすでにある場合に警告表示）
- コメント機能（役割を問わず全メンバーが問題ごとにコメントを付けられる）
- 変更履歴（ステータス・校正状態の変更のみ記録）
- CSVエクスポート（ファイル名は`Qraft_問題セット名_questions.csv`）・インポート
- 共有機能：メールアドレスでの招待（4ロールいずれか）、招待中一覧の表示・取り消し（管理者のみ）
- Firestore Security Rulesによるロール別の認可（フロントエンドの表示制御だけに頼らない）

## 今回見送った機能とその理由

- **リアルタイム共同編集**：当初の要件通り今回は実装しない（Firestore Realtimeの接続数・帯域コストが増えやすく、MVP検証の優先度も高くない）
- **AIによる校正・重複検出**：外部LLM APIの利用料が発生し、ゼロコスト運用の方針と矛盾するため見送り。今回実装した重複検出は文字列完全一致のみの簡易版
- **大会運営システムとの連携**：連携先システムの仕様が未確定で、汎用的に作り込める段階にないため見送り
- **ドラッグ＆ドロップによる並び替えUI**：データモデル上の `order` フィールドは対応できる設計にしてあるが、UI実装は未着手

## 既知の制約・注意点

- `firestore.rules` の招待承諾ロジックはメールアドレスの大文字小文字を正規化した上で一致させている前提。本番運用前に実際のFirebase Authのメール表記と突き合わせて動作確認すること。
- 問題の並び替えUI自体は未実装（`orderBetween`ヘルパーのみ用意）。
- Firestoreの無料枠（1GiB、読み取り5万/日、書き込み2万/日）を超える規模で運用する場合はBlazeプランへの移行と課金設計の見直しが必要。
- 変更履歴はステータス・校正状態の変更のみを記録する設計にしている。本文・解説などのテキストフィールドまで対象にすると、debounce保存のたびに履歴書き込みが発生し無料枠の書き込み上限（2万/日）を早く消費するため、意図的に対象外にした。
