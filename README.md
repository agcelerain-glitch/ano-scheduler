# ano-scheduler

匿名で使える、シンプルな日程調整ツール。
主催者がイベントを作成してURLを配布し、参加者が30分刻みグリッドで空き時間を ○ 回答。
集計はピボットテーブルで可視化します。

- 技術: **Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / Supabase (PostgreSQL) / Vercel**
- 全DBアクセスは Vercel サーバー側 API 経由（Supabase への直アクセス禁止）。
- 管理画面は **Supabase Google ログイン＋メール許可リスト** で限定。
- データは作成から **30日** で自動削除（Vercel Cron）。
- 仕様は [`requirement.md`](./requirement.md)、開発ルールは [`CLAUDE.md`](./CLAUDE.md) 参照。

---

## ローカル開発

```bash
npm install
cp .env.example .env    # 値を埋める
npm run dev             # http://localhost:3000
npm run typecheck       # 型チェック
npm run build           # 本番ビルド
```

---

## 手動でやること（Supabase / Vercel / Google）

### 1. Supabase

1. [supabase.com](https://supabase.com) でプロジェクト作成。
2. **SQL Editor** で [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) を実行（テーブル＋RLS作成）。
3. **Project Settings → API** から取得して環境変数へ:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（anon public）
   - `SUPABASE_SERVICE_ROLE_KEY`（service_role・サーバー専用）
4. **Authentication → Providers → Google** を有効化（下記 Google 設定の Client ID / Secret を貼る）。
5. **Authentication → URL Configuration** の *Redirect URLs* に本番/プレビュー/ローカルの
   `…/auth/callback` を追加（例: `http://localhost:3000/auth/callback`、`https://<your-domain>/auth/callback`）。

### 2. Google OAuth（Google Cloud Console）

1. **OAuth 同意画面**を設定（外部/内部）。
2. **認証情報 → OAuth 2.0 クライアント ID（ウェブ）**を作成。
3. *承認済みのリダイレクト URI* に Supabase のコールバックを追加:
   `https://<project-ref>.supabase.co/auth/v1/callback`
4. 発行された **Client ID / Client Secret** を Supabase の Google プロバイダ設定に登録。

### 3. Upstash Redis（レートリミット）

1. [upstash.com](https://upstash.com) で Redis データベース作成（または Vercel Marketplace から）。
2. REST の URL / TOKEN を環境変数へ:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - ※本番で未設定だと、回答・編集など書き込み系APIは **フェイルクローズ（拒否）** になります。

### 4. Vercel

1. このリポジトリを Vercel にインポート。
2. **Settings → Environment Variables** に `.env.example` の全キーを設定
   （`NEXT_PUBLIC_SITE_URL` は本番ドメイン、`CRON_SECRET` はランダムな長い文字列）。
3. デプロイ。`vercel.json` の Cron（毎日 15:00 UTC = 00:00 JST）が
   `/api/cron/cleanup` を呼び、期限切れイベントを削除します。
   - Cron は `Authorization: Bearer <CRON_SECRET>` を自動付与します（`CRON_SECRET` を設定しておくこと）。

### 5. 管理者の許可

- `ADMIN_EMAILS` にカンマ区切りで管理者の Google アカウントのメールを設定。
  ここに載っているメールだけが `/admin` にアクセスできます。

---

## 使い方

- 管理者: `/admin` でログイン → イベント作成 → 回答用URLをコピーして配布。
- 参加者: 届いたURL (`/e/<id>`) を開く → 名前入力 → グリッドで○ → 送信。
  送信後に表示される編集用URLで後から修正可能。
- LINE のトークに回答用URLを貼れば、LINE 内ブラウザでそのまま開けます。

## 今後の予定

- 管理者向け PWA 対応（ホーム追加・プッシュ等）。
- CSV エクスポート、通知連携など（`requirement.md` のスコープ外項目参照）。
