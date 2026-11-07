# Qraft

クイズ大会などの作問を、チームで進めるための専用Webエディタ。表計算ソフトの代わりに、問題を1つの「カード」として扱い、作問・裏どり・採用・出題順・印刷までを、ひとつのツールで続けて行える。

- 技術構成: Next.js 15（App Router）／React 18／TypeScript／Tailwind CSS 3／Firebase（Authentication・Firestore）
- 公開先: Vercel
- ログイン: Googleアカウントのみ

## 1. できること

### 画面（問題セットの中のタブ）

| タブ | 内容 |
| --- | --- |
| お知らせ | 管理者が書く連絡事項。セットを開くと最初に表示される |
| 作問 | 自分の問題を、すべてカードで並べる（検索・絞り込み・仮想スクロール付き）。「＋」で新しい問題を書くポップアップが開き、カードを押すと編集のポップアップが開く。書きかけは、ブラウザ内に退避される |
| 問題 | セット全体の問題を一覧で見る。「すべて／自分の問題／他の人の問題」を切り替えられる |
| 裏どり | 出典を一覧に出し、確認状態・担当者で絞り込んで確認を進める |
| 出題順 | 採用された問題を、Round（大会）ごとに並べる。ドラッグで並び替え、出題順ルールの違反を表示し、ルールを考慮したシャッフルもできる |
| ゴミ箱 | 削除した問題の復元・完全削除 |
| メンバー | メンバーごとの作成数・採用数・却下数・採用率・裏どり担当数・完了数 |
| 入出力 | Excel（.xlsx）・CSVのエクスポート、インポート（取り込み前に内容を検証する） |
| 印刷 | 採用問題を、問題用紙（問題文のみ）、または解答付きで印刷する |
| 設定 | 問題セットの名前、ジャンル（大→小）、Round、出題順ルールの管理。セットの削除（オーナーのみ） |

### 問題のフィールド

問題文・答え・別解・正誤判定基準・解説・出典（最大5件）・大ジャンル／小ジャンル・タグ・備考・Round・出題順・採用状態・裏どり状態・裏どり担当・添付画像。

- 文字数は、前後の空白を除いて1文字ずつ数える（絵文字も1文字）。編集画面とカードに表示される。
- 同じ問題文がすでにある場合は、作成時に警告が出る。
- 画像は、問題文・答え・解説に付けられる。1問につき6枚まで。ブラウザ上で長辺1280px、約225KBまでに縮小・再圧縮して、Firestoreに保存する（再圧縮で、撮影場所などの付加情報は残らない）。

### 権限（5段階）

| 役割 | できること |
| --- | --- |
| 管理者（admin） | すべての操作。メンバーの招待、お知らせ・問題セット名の編集、セットの設定。セットを作った人（オーナー）は降格・削除できず、セットを削除できるのもオーナーだけ |
| 問題統括（supervisor） | 採用判断、Round・裏どり担当の割り当て、出題順、ジャンル・Roundの管理、任意の問題の編集・ゴミ箱の操作 |
| 作問者（writer） | 問題の作成と、自分の問題の編集・削除。状態は「下書き」「作問完了」のみ。担当になった問題の裏どりもできる |
| 裏どり担当（checker） | 担当問題の確認状態・出典の更新 |
| 閲覧者（viewer） | 閲覧とコメントのみ |

UIのボタン表示は `src/lib/permissions.ts`、最終的な認可は `firestore.rules` が担う。**この2つは必ず揃えること。**

### そのほか

- 改訂履歴: 問題統括・管理者が問題文・答えを編集すると、編集前の内容が残る。
- 変更履歴: 採用状態・裏どり状態・担当・Roundの変更を、追記のみで記録する。
- コメント: 全メンバーが、問題ごとに付けられる（編集・削除は本人のみ）。
- 検索: 問題文・答え・別解・解説・出典・備考・正誤基準・タグ・作成者・ジャンル名が対象。全角/半角、大文字/小文字、ひらがな/カタカナの差を吸収し、スペースで AND 検索になる。
- 招待: ユーザーを選んで役割付きで招待する。招待された人は、ダッシュボードで承諾する。
- プロフィール: 表示名とアイコン（192px、約30KBまでに縮小）を変更できる。
- 表示: ライト／ダークの切り替え。タブのタイトルは「セット名 - Qraft」。
- 動き: ページ切り替え・ポップアップ・タブの選択表示に動きがある（OSの「視差効果を減らす」設定では止まる）。

## 2. 必要な環境

- Node.js 20以上
- npm
- Firebaseアカウント（無料のSparkプランで動作する。クレジットカード登録は不要）

## 3. ローカル起動

```bash
npm install
cp .env.example .env.local   # 4の手順で取得した値を書き込む
npm run dev
```

`http://localhost:3000` を開く。

主なコマンド:

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド（型チェック・lintを含む） |
| `npm run start` | ビルドしたものの起動 |
| `npm run lint` | lint |
| `npx tsc --noEmit` | 型チェックのみ |

変更したら、`npx tsc --noEmit && npm run lint && npm run build` を通してから、commitする。

フォントは `next/font` で Noto Sans JP を取得する。**ビルド時にネットワークが必要。**

## 4. Firebaseプロジェクトの作成

1. https://console.firebase.google.com/ で「プロジェクトを追加」
2. Google Analyticsは不要
3. 「ウェブアプリを追加」（`</>`）で、表示された `firebaseConfig` を `.env.local` に対応させて入力する

| firebaseConfig | 環境変数 |
| --- | --- |
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`（`プロジェクトID.firebaseapp.com` の形） |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

`.env.local` はGitにコミットしない（`.gitignore` 済み）。

**重要**: Cloud Storage と Cloud Functions は使わない。どちらもBlaze（従量課金）プランへの切り替えが必要になるため、意図的に避けている。画像はFirestoreに保存している。

## 5. Authenticationの設定

1. Authentication → Sign-in method → **Google** を有効にする（公開名とサポートメールの入力が必要）
2. Authentication → Settings → **承認済みドメイン**に、公開サイトのドメインを追加する（Vercelのドメイン、独自ドメイン）
3. Authentication → Settings → **ユーザーアカウントのリンク**を、「同じメールアドレスを使用するアカウントをリンクする」にする

3を「プロバイダごとに別のアカウントを作る」のままにすると、Googleでログインするたびに別のIDができ、既存のデータが見えなくなる。問題セットも権限も、ユーザーIDに紐づいているため。

### メール／パスワードからの移行（移行期間のみ）

過去にメール／パスワードで登録した人は、次の順で移行する。**メール／パスワードは、最後まで無効にしない。**

1. オーナー本人が、ログインしたまま、ダッシュボードの黄色い案内から Google を連結する。
2. Authentication → Users で、その人の行に**メールとGoogleの両方**が付き、行が増えていないことを確認する。
3. ほかのメンバーにも案内する。ログアウト中の人は、Googleでログインすると「パスワードを一度だけ入力して連結」の画面が出る。
4. 全員の連結を確認できたら、メール／パスワードを無効にする。

注意: Googleアカウントのメールが、これまでのメールと**違う**と、連結の案内は出ず、新しいアカウントになる。過去のデータは見えず、再招待が必要になる。セットの**オーナーは、必ず同じメールで連結する**こと（オーナーは変更できない設計）。

連結の画面と案内（`AuthScreen.tsx` の連結部分、`LinkGoogleBanner.tsx`、`auth-context.tsx` の連結処理）は、全員の連結が終わったら削除してよい。

## 6. Firestoreの設定

1. Firestore Database → データベースの作成
2. 本番環境モードを選ぶ
3. リージョンは、日本からのアクセスが多い場合 `asia-northeast1`（東京）を推奨

## 7. Security Rulesのデプロイ

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # 作成したプロジェクトを選ぶ
firebase deploy --only firestore:rules
```

`firestore.rules` を変更したら、**コンソールに公開してから**動作を試す。公開前に画像やアイコンの保存を試すと、権限エラーになる。

## 8. 本番デプロイ（Vercel）

1. https://vercel.com でGitHubのリポジトリをインポートする
2. 環境変数（`.env.example` と同じ6つ）を登録する
   - **Production と Preview の両方**にチェックを入れる。Previewに無いと、ブランチのビルドが `auth/invalid-api-key` で失敗する。
   - **Sensitive／Secret にしない。** `NEXT_PUBLIC_` の値はブラウザで使う前提のもので、Secretにすると、ビルドに値が入らない。「公開してよい」という意味の警告が出ても、プレフィックスは外さない。
3. デプロイする
4. **環境変数を変えたら、必ず再デプロイする。** `NEXT_PUBLIC_` の値は、ビルド時に埋め込まれる。

ブランチのプレビューURLでは、承認済みドメインに入っていないため、Googleログインはできない。見た目の確認は、手元の `npm run dev` で行う。

## 9. データの構造（Firestore）

```
users/{uid}                              本人のみ。メールを含む
publicProfiles/{uid}                     招待時のユーザー検索用。メールは含めない
avatars/{uid}                            アイコン（base64、60KBまで）
questionSets/{setId}                     名前・オーナー・members（uid→役割）・memberProfiles・genreTree・rounds・お知らせ
  ├ questions/{questionId}               問題
  │   ├ images/{imageId}                 添付画像（1枚が1文書。作成と削除のみで、更新はしない）
  │   ├ comments/{commentId}             コメント
  │   ├ history/{historyId}              変更履歴（追記のみ）
  │   └ revisions/{revisionId}           改訂履歴（追記のみ）
  └ pendingInvites/{uid}                 招待中の一覧（管理者のみ閲覧）
setInvites/{setId}_{uid}                 招待（IDが同じなので、重複して作れない）
invites/{email}                          旧方式（メール宛）。新規には作らない。残っている招待だけ読む
```

## 10. ファイル構成

```
.
├── .env.example                       環境変数の見本（6項目、値は空）
├── .firebaserc                        Firebaseプロジェクトの紐づけ
├── .gitignore                         node_modules・.next・.env.local などを除外
├── README.md                          このファイル
├── eslint.config.mjs                  ESLintの設定
├── firebase.json                      Firebase CLIの設定（Firestoreのルールとインデックスの場所）
├── firestore.indexes.json             Firestoreのインデックス（現在は空）
├── firestore.rules                    Firestoreのセキュリティルール（最終的な認可）
├── next-env.d.ts                      Next.jsの型定義（自動生成）
├── next.config.mjs                    Next.jsの設定
├── package.json                       依存関係とスクリプト
├── package-lock.json                  依存関係の固定
├── postcss.config.mjs                 PostCSSの設定
├── tailwind.config.ts                 Tailwindの設定（色の変数、フォント、影）
├── tsconfig.json                      TypeScriptの設定
└── src
    ├── app
    │   ├── globals.css                色の変数（ライト／ダーク）、スクロールバー、動き、印刷用スタイル
    │   ├── icon.svg                   タブのアイコン（ロゴ）
    │   ├── layout.tsx                 全体のレイアウト（フォント、テーマ、認証の提供）
    │   ├── page.tsx                   ランディングページ（体験用の入力画面つき）
    │   ├── login
    │   │   └── page.tsx               ログイン画面
    │   ├── signup
    │   │   └── page.tsx               新規登録画面
    │   ├── account
    │   │   └── page.tsx               アカウント設定（表示名・アイコン）
    │   ├── dashboard
    │   │   └── page.tsx               問題セットの一覧・新規作成・招待の承諾
    │   └── sets
    │       └── [setId]
    │           ├── layout.tsx         問題セットの共通部分（ヘッダー、タブのツールバー、データの購読）
    │           ├── template.tsx       タブを移るときの、ページのふわっとした表示
    │           ├── page.tsx           お知らせ
    │           ├── write
    │           │   └── page.tsx       作問（自分の問題のカード一覧、新規作成のポップアップ）
    │           ├── manage
    │           │   └── page.tsx       問題（すべて）
    │           ├── mine
    │           │   └── page.tsx       問題（自分の問題）
    │           ├── others
    │           │   └── page.tsx       問題（他の人の問題）
    │           ├── proofread
    │           │   └── page.tsx       裏どり
    │           ├── adopted
    │           │   └── page.tsx       出題順（並び替え、ルール、シャッフル）
    │           ├── trash
    │           │   └── page.tsx       ゴミ箱
    │           ├── members
    │           │   └── page.tsx       メンバーと統計
    │           ├── io
    │           │   └── page.tsx       入出力（Excel／CSV）
    │           ├── print
    │           │   └── page.tsx       印刷
    │           └── settings
    │               └── page.tsx       設定（セット名、ジャンル、Round、セットの削除）
    ├── components
    │   ├── Avatar.tsx                 ユーザーのアイコン表示
    │   ├── AuthScreen.tsx             ログイン・新規登録の共通画面
    │   ├── CommentSection.tsx         問題ごとのコメント
    │   ├── Fab.tsx                    画面の隅の「＋」ボタン
    │   ├── HistoryPanel.tsx           変更履歴・改訂履歴の表示
    │   ├── ImageField.tsx             画像の添付欄と、書きかけの画像の管理
    │   ├── LinkGoogleBanner.tsx       Googleの連結を促す案内（移行期間のみ）
    │   ├── Logo.tsx                   ロゴ
    │   ├── Modal.tsx                  ポップアップ（Escで閉じる、フォーカスを閉じ込める）
    │   ├── QuestionBrowser.tsx        問題の一覧（検索・絞り込み・仮想スクロール、カードを押すと編集）
    │   ├── QuestionEditor.tsx         問題の編集（ポップアップの中身）
    │   ├── RenameSet.tsx              問題セット名の変更
    │   ├── ScopeNav.tsx               「すべて／自分の問題／他の人の問題」の切り替え
    │   ├── ShareDialog.tsx            招待・権限のポップアップ
    │   └── ThemeSelector.tsx          ライト／ダークの切り替え
    └── lib
        ├── QuestionsContext.tsx       問題の購読と、作成・更新・削除・復元の操作
        ├── SetContext.tsx             現在の問題セットと自分の役割を、配下に渡す
        ├── auth-context.tsx           ログイン状態、Googleログイン、連結
        ├── avatars.ts                 アイコンの読み書き
        ├── deleteSet.ts               問題セットの削除（配下の問題・画像・コメントも）
        ├── firebase.ts                Firebaseの初期化（Firestoreのキャッシュを有効化）
        ├── genres.ts                  ジャンルの索引・旧形式からの移行・ID生成
        ├── imageTools.ts              画像の縮小・再圧縮（問題用1280px、アイコン192px）
        ├── io.ts                      Excel／CSVの入出力、取り込み前の検証
        ├── orderRules.ts              出題順のルール定義、違反のチェック、シャッフル
        ├── permissions.ts             役割ごとの権限と、各種ラベル（UI側の制御）
        ├── questionImages.ts          問題の画像の保存・削除・目録
        ├── search.ts                  検索の正規化と絞り込み
        ├── stats.ts                   メンバーごとの統計
        ├── text.ts                    文字数の数え方（charCount）
        ├── theme.tsx                  ライト／ダークの管理
        ├── time.ts                    時刻の変換
        ├── types.ts                   型定義（問題、問題セット、役割、ルール など）
        ├── useComments.ts             コメントの購読
        ├── useHistory.ts              変更履歴の購読
        ├── useInvites.ts              招待の購読・承諾・辞退
        ├── usePageTitle.ts            タブのタイトル
        ├── useQuestionSets.ts         問題セットの一覧・作成・購読と、セットへの操作
        └── useRevisions.ts            改訂履歴の購読
```

ここに載せていない生成物（`node_modules`、`.next`、`tsconfig.tsbuildinfo`）は、Gitに入れない。

### 構成の決まり

- 画面（`src/app`）は表示と操作だけを持ち、Firestoreの読み書きは `src/lib` に集める。
- 新しい出題順ルールは、`orderRules.ts` の `RULE_DEFS` に足すだけで、チェックとシャッフルの両方に反映される。
- 権限を変えるときは、`permissions.ts` と `firestore.rules` を、必ず一緒に変える。

## 11. 設計上の判断

- **無料枠で動かす。** Spark プランの範囲（読み取り5万／日、書き込み2万／日、1GiB）に収めるため、Firestoreのブラウザ側キャッシュを有効にし、リロードのたびに全件を読み直さないようにしている。変更履歴を、ステータス・裏どり状態・担当・Roundの変更に限っているのも、書き込みを増やさないため。
- **画像はFirestoreに保存する。** Cloud Storageを使うと、Blazeプランが必要になるため。上限は、1枚約225KB、1問6枚まで。
- **空の問題を作らない。** 問題文も答えも空のまま保存はできない（ルールでも拒否する）。作問ポップアップの入力は、[保存]するまでDBに何も作らず、書きかけはブラウザ内（sessionStorage）にだけ残る。
- **LPに書くことは、実際の動作と一致させる。** 根拠は `search.ts`、`permissions.ts`、`orderRules.ts`、印刷・入出力のページ。

## 12. 既知の制約・未確認の事項

- 問題セットを無料枠を超える規模で使う場合は、Blazeプランへの移行と、課金の設計が必要。
- 次の点は、本物のFirebaseでの確認が終わっていない。
  - Googleログインでの、プロフィールの自動作成
  - 長い表示名（40文字超）の切り詰め
  - 画像・アイコンの保存（`firestore.rules` を公開してからでないと、権限エラーになる）
  - スマホの実機での表示（画面幅を変えての確認まで）
- 「LINEなどのアプリ内ブラウザでは、Googleログインができないことがある」は、Googleの方針に基づく一般的な情報で、このアプリでは試していない。
- 問題セット名を変更できるのは管理者のみ（問題統括は変更できない）。

## 13. 見送っているもの

- **リアルタイム共同編集**: 接続数・帯域のコストが増えやすいため。
- **AIによる校正・重複検出**: 外部APIの料金が発生するため。重複の検出は、同じ問題文かどうかの簡易なものだけ。
- **大会運営システムとの連携**: 連携先の仕様が未確定のため。

## 14. 作業上の注意

- 作業用のコピー（Codespacesやクラウド環境など）は、途中で消えることがある。**変更は必ず、手元のリポジトリに適用して、commitしてpushする。**
- `main` に入れる前に、Firebaseの設定（5）が済んでいることを確認する。先に入れると、ログインできない人が出る。
