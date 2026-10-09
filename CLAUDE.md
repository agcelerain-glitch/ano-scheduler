# CLAUDE.md

このファイルは Claude Code（claude.ai/code）が本リポジトリで作業する際のガイドです。

## プロジェクト概要

**ano-scheduler** — URL共有型の日程調整スケジューラー。
主催者（管理者）がイベントを作成してURLを配布し、参加者が30分刻みグリッドで空き時間を ○ 回答。
集計結果を**ピボットテーブル**で可視化する。

- 詳細仕様は **`requirement.md`**、セットアップ手順は **`README.md`** を参照（こちらが正）。
- `other/` はローカル作業メモ（`memo.txt`等）で **`.gitignore`対象**。リポジトリには含めない。
- 参加者は匿名（ログイン不要）。管理者は Google ログイン＋メール許可リストで限定。

## 技術スタック

- **Vercel**（ホスティング / 実行基盤）
- **Next.js (App Router) / React / TypeScript**
- **Supabase (PostgreSQL)** — DB。※Firestoreは不採用（検討の結果、正規化設計・SQL集計の優位性でSupabaseに決定）。
- 接続は **Supabase Connection Pooler（Supavisor, transactionモード / ポート6543）** 経由。
- レートリミット: Upstash Redis もしくは Vercel Firewall（未確定）。
- 定期実行: Vercel Cron もしくは `pg_cron`（期限切れイベント削除）。

## アーキテクチャ鉄則（厳守）

1. **クライアントからDBへ直接アクセスしない。** 読み書きはすべて Vercel サーバー側API（Route Handler / Server Actions）経由。
2. **`SUPABASE_SERVICE_ROLE_KEY` はサーバー側のみ。** クライアントバンドルに含めない（`NEXT_PUBLIC_` を付けない）。RLSをバイパスする鍵なので厳重に扱う。
3. **全テーブルで RLS 有効化**。`anon` ロールは原則全拒否。サーバーAPIは `service_role` で必要操作のみ。
4. **サーバーレスからは必ず Connection Pooler 経由**で接続（直接接続5432はマイグレーション等のみ）。
5. 管理者は **Supabase Google ログイン＋`ADMIN_EMAILS` 許可リスト**で限定。`middleware.ts` で `/admin` を保護し、各ページ/サーバーアクションでも `requireAdmin()` で再検証する（多層防御）。
7. 参加者の**編集キー**は `hashToken()`（SHA-256）で保存し平文をDBに残さない。照合は `safeEqual()`（定数時間）。発行時に一度だけ本人へ提示。
8. **時刻はUTC（`timestamptz`）で保存**し、表示時にローカルTZ（既定 Asia/Tokyo）へ変換。`"HH:mm"` のようなTZ非依存文字列で時刻を持たない。変換は `lib/slots.ts` の `zonedTimeToUtc()` を使う。
9. **入力検証はサーバー側で必須**（`lib/validation.ts` の zod スキーマ）。送信スロットは候補集合（`validSlotSet`）に含まれるか必ず照合。フロントの検証はUX目的のみ。
10. API ルートは **Node.jsランタイム**（`export const runtime = 'nodejs'`）。暗号処理（`crypto`）を使うため Edge 不可。データページは `export const dynamic = 'force-dynamic'`。

## ディレクトリ構成

```
app/
  page.tsx                              # トップ（紹介）
  layout.tsx / robots.ts                # 共通レイアウト / robots
  admin/login/page.tsx                  # Googleログイン（client）
  admin/page.tsx                        # 管理トップ（一覧＋作成）
  admin/actions.ts                      # 管理用 Server Actions
  admin/CreateEventForm.tsx             # 作成フォーム（client）
  admin/events/[eventId]/page.tsx       # イベント管理
  auth/callback/route.ts                # OAuthコールバック
  auth/signout/route.ts                 # ログアウト
  e/[eventId]/page.tsx                  # 回答・結果閲覧
  e/[eventId]/AnswerForm.tsx            # 回答グリッド（client, 作成/編集兼用）
  e/[eventId]/edit/page.tsx             # 回答編集（編集キー認証）
  api/events/[eventId]/responses/route.ts   # 回答送信(POST)
  api/responses/[participantId]/route.ts    # 回答編集(PUT)
  api/cron/cleanup/route.ts             # 期限切れ削除(Cron)
components/                             # PivotTable / CopyField / ConfirmButton
lib/
  supabase/{admin,server,client,middleware}.ts
  auth.ts  tokens.ts  ratelimit.ts  env.ts
  slots.ts  aggregate.ts  validation.ts  events.ts  format.ts
proxy.ts                               # /admin 保護＋セッション更新（Next16 proxy規約）
supabase/migrations/0001_init.sql      # スキーマ＋RLS
```

## コマンド

```bash
npm run dev        # 開発サーバー (http://localhost:3000)
npm run build      # 本番ビルド
npm run typecheck  # tsc --noEmit
```
※ ESLint は未導入。型安全は `typecheck` で担保する。

> 現時点ではコード未生成のため上記は想定値。`package.json` 作成後に正しいスクリプト名へ更新すること。

## コーディング規約

- 言語: TypeScript（strict）。
- ユーザー向け文言・コメントは日本語。
- 既存ファイルがある場合は、その命名・スタイル・コメント密度に合わせる。
- DBスキーマ変更は `supabase/migrations/` にSQLで残す（手動のGUI変更に頼らない）。

## セキュリティ・プライバシー留意

- イベントページは `noindex`（metaタグ + `X-Robots-Tag`）と `robots.txt` で検索エンジンから除外。
- 参加者名は個人情報。プライバシーポリシーと安全管理措置を用意（APPI）。
- 名称・UIは既存サービス（調整さん等）の商標・意匠を模倣しない。

## 環境変数（例）

`.env` はコミットしない（`.gitignore`済み）。`.env.example` に鍵名のみ記載すること。

```
# サーバー側のみ
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=            # Pooler(6543, transactionモード)
# クライアント公開可（使う場合のみ・最小限）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
