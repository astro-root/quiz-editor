# クイズ作問エディタ（MVP）

クイズ大会などの作問を効率化するための専用Webエディタ。Excel/スプレッドシートの代替ではなく、問題を1つの「オブジェクト」として扱う専用UIを目指すプロジェクトのMVP。

## 1. 概要

- 問題は「セル」ではなく「カード」として編集する
- 作問モード：1問に集中し、`⌘/Ctrl+Enter` で保存して次の問題へ進む
- 管理モード：問題セット全体を俯瞰し、作問者・タグ・ステータス・校正状態でフィルタ
- 複数人で1つの問題セットを共有し、オーナー／編集者／閲覧者の権限で共同作問

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
- 作問モード（1問集中・インライン編集・自動保存・`⌘/Ctrl+Enter`で次の問題）
- 管理モード（簡易一覧・作問者/タグ/ステータス/校正状態フィルタ）
- メールアドレスでの招待（Cloud Functions不使用。`invites/{email}` ドキュメントを本人だけが読める設計）
- オーナー／編集者／閲覧者の3権限とFirestore Security Rulesによる認可

## MVPで実装していないこと（将来拡張）

- リアルタイム共同編集
- コメント・校正フロー・承認フロー
- 変更履歴・バージョン管理
- AIによる校正・重複検出
- CSV/Excelインポート・エクスポート
- 大会運営システムとの連携
- ドラッグ＆ドロップによる並び替えUI（データモデル上の `order` フィールドは将来の並び替えに対応できる設計にしてある）

## 既知の制約・注意点

- `firestore.rules` の招待承諾ロジックはメールアドレスの大文字小文字を正規化した上で一致させている前提。本番運用前に実際のFirebase Authのメール表記と突き合わせて動作確認すること。
- 問題の並び替えUI自体は未実装（`orderBetween`ヘルパーのみ用意）。
- Firestoreの無料枠（1GiB、読み取り5万/日、書き込み2万/日）を超える規模で運用する場合はBlazeプランへの移行と課金設計の見直しが必要。
