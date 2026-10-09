# 要件定義書：ano-scheduler（日程調整スケジューラー）

- 作成日: 2026-10-09 / 更新日: 2026-10-09
- ステータス: 実装着手（初期実装済み）
- 正式名称: **ano-scheduler**（匿名性 anonymous ＋ 計画アシスタント scheduler の意）
- 元資料: `other/memo.txt`（.gitignore対象のローカルメモ）

---

## 1. 目的・背景

「調整さん」ライクな、**ログイン不要・URL共有型**の日程調整ツールを自作する。
主催者がイベントを作成してURLを配布し、参加者がそのURLから空き時間を回答。
集計結果を**ピボットテーブル（クロス表）**で可視化し、初見の人でも最適な候補枠が一目で分かることを狙う。

- **管理者（主催者）側**: URL配布をはじめ多機能（編集・締切・削除・集計・エクスポート等）。
- **参加者（ユーザー）側**: 端的で分かりやすいUI。名前入力 → グリッドで○× → 送信、で完結。

> ⚠️ 名称・UIは既存サービス（調整さん等）の商標・意匠を模倣しない。正式名称は別途検討（本書では「本サービス」と記載）。

---

## 2. 用語

| 用語 | 定義 |
|---|---|
| イベント | 主催者が作成する1件の日程調整単位。 |
| スロット | 候補となる30分刻みの時間枠（例: 10/10 19:00–19:30）。 |
| 候補日時 | イベントの日付レンジ×1日の時間帯から生成されるスロット集合。 |
| 参加者 | イベントに回答する人。ログイン不要・匿名（名前のみ）。 |
| 回答 | 参加者がスロットごとに付ける ○（可）/ ×（不可）。 |
| 管理者トークン | イベントを編集・削除できる秘密トークン（主催者のみ保持）。 |
| 編集キー | 参加者が自分の回答を後から編集するための秘密キー。 |

---

## 3. 技術スタック

| レイヤ | 採用 | 備考 |
|---|---|---|
| ホスティング / 実行基盤 | **Vercel** | Next.js (App Router) を想定。 |
| フロントエンド | **Next.js / React / TypeScript** | グリッドUIをコンポーネントで構築。 |
| API | **Vercel サーバー側（Route Handler / Server Actions）** | 全DBアクセスはここを経由。Node.jsランタイム。 |
| DB | **Supabase (PostgreSQL)** | ※当初検討のFirestore案は破棄。正規化設計・SQL集計・トランザクションの優位性を採用。 |
| 接続 | **Supabase Connection Pooler（Supavisor, transactionモード / 6543）** | サーバーレスの接続枯渇対策。直接接続(5432)はマイグレーション時のみ。 |
| レートリミット | Upstash Redis もしくは Vercel Firewall | スパム・いたずら・コスト保護。 |
| 定期実行 | Vercel Cron もしくは `pg_cron` | 期限切れイベントの自動削除（TTL代替）。 |

---

## 4. アーキテクチャ原則

1. **クライアントからDBへ直接アクセスしない。** 読み書きはすべてVercelのサーバー側APIを経由する。
2. Supabaseの`service_role`鍵は**サーバー側（Vercel環境変数）のみ**で使用。クライアントへ露出させない。
3. **RLS（Row Level Security）を全テーブルで有効化**し、`anon`ロールは原則全拒否（多層防御）。サーバーAPIは`service_role`で必要操作のみ実行。
4. 権限分離・トークン検証・バリデーション・レートリミットはすべて**サーバー側で実施**。フロントのチェックはUX目的のみで信頼しない。
5. 時刻はDBに**UTC（`timestamptz`）で保存**し、表示時にローカルタイムゾーンへ変換。

---

## 5. 機能要件

### 5.1 管理者（主催者）機能
> 管理者＝開発者/運営者。**Supabase の Google ログイン＋メールアドレス許可リスト（`ADMIN_EMAILS`）** で限定する。
> 許可リストにないアカウントは `/admin` 配下に一切アクセスできない（middleware＋サーバー側で二重チェック）。
> イベント作成・管理はログイン必須。参加者は匿名（ログイン不要）。

- **イベント作成**: タイトル、説明、候補日レンジ（開始日〜終了日）、1日の時間帯（開始〜終了）、スロット間隔（既定30分）、タイムゾーン（既定 Asia/Tokyo）、**参加者の重複可否**を指定。
  - **重複可否（スロット先着制）**: `allow_overlap=true`＝複数人が同じ枠を選べる（通常の日程調整）。`allow_overlap=false`＝1枠につき1人だけ確保（先着・予約型）。用途: 複数人の予定合わせ か、特定の人との個別ミーティング かを切り替える。
- **URL配布**: 回答用URL（`/e/{eventId}`）をコピーして配布（将来 QRコード）。実URLはリクエストのホストから生成（localhost化を防止）。
- **イベント編集**: タイトル・説明を後から変更可能。
- **回答受付の締切**: 回答の受付停止／再開。
- **回答の管理**: 参加者単位で回答を削除。
- **集計表示**: ピボットテーブル（§5.3）。○数が最大の枠を自動ハイライト。**管理者のみ閲覧**。
- **保持期限の確認・削除**: 各イベントの残り日数（30日TTL）を表示。手動で即時削除も可能。
- **フィードバック一覧**: 参加者からのフィードバック/投票権リクエストを閲覧（`/admin/feedback`）。
- **ヘルスチェック**: DB疎通＋Discord通知を検証。
- **イベント削除**（回答・メモもカスケード削除）。

### 5.2 参加者（ユーザー）機能
- 回答用URLを開く → **名前を入力**。
- **30分グリッド**上でスロットを**複数選択**（タップでトグル、日まとめ切替あり）。先着制では確保済み枠は「埋」表示で選択不可。
- **特記事項**を1つの自由記述で残せる（参加者ごとに1つ。例: 「20時以降なら調整可」）。
- 送信すると**編集キー付きリンク**が発行・表示される（この1回だけ表示。コピー／共有ボタン付き・保存喚起）。
- 編集キーで後から**自分の回答のみ**保存・修正可能。
- **匿名性のため、他の参加者の回答や集計は見えない**（閲覧は管理者のみ）。

### 5.3 集計・ピボットテーブル表示（管理者のみ）
- **行＝スロット（日時）、列＝参加者、セル＝○/×** のクロス表。
- 各スロット行に **○の合計数** を表示し、**○が多い行を視覚的にハイライト**（初見でも最適枠が分かる）。
- 匿名性向上のため**参加者には非公開**とし、管理画面でのみ表示。

---

## 6. 画面・URL設計（案）

| 用途 | パス | 権限 |
|---|---|---|
| トップ（紹介） | `/` | 公開 |
| 管理ログイン | `/admin/login` | 公開（Googleログイン起点） |
| 管理トップ（一覧・作成） | `/admin` | 管理者（許可メールのみ） |
| イベント管理 | `/admin/events/{eventId}` | 管理者 |
| 回答・結果閲覧 | `/e/{eventId}` | 公開（eventId は推測困難なUUID） |
| 回答の編集 | `/e/{eventId}/edit?p=&k=`（編集キーで認証） | 本人のみ |
| OAuthコールバック | `/auth/callback` | 公開 |
| Cron（期限切れ削除） | `/api/cron/cleanup` | `CRON_SECRET` |

- `/e/` と `/admin/` には `noindex`（metaタグ＋`X-Robots-Tag`）を付与し検索エンジンから除外。`robots.txt` でも `/e/`・`/admin/`・`/api/`・`/auth/` を除外。
- トークンがURLに含まれ得るため `Referrer-Policy: no-referrer` を全体に設定し、リファラ経由の漏洩を抑止。
- **LINE対応**: `/e/{eventId}` は LINE のトーク内ブラウザ（WebView）でそのまま開ける標準的なレスポンシブWeb。OGPメタで共有時の見栄えを確保。
- **PWA**: 管理者向けに後日 PWA 化（ホーム追加・将来プッシュ）。

---

## 7. データモデル（PostgreSQL / 案）

> UUIDは推測困難な値（`gen_random_uuid()`）。秘密トークン類は**生値を保存せずハッシュ化**して保存し、照合はサーバー側で行う。

> 実スキーマは [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) が正。

```
events
  id              uuid        PK  -- 推測困難。回答用URLに使用
  title           text        not null
  description     text        not null default ''
  owner_email     text        not null  -- 作成した管理者のメール（Googleログイン）
  date_start      date        not null
  date_end        date        not null
  time_start      time        not null  -- 1日の時間帯（開始）
  time_end        time        not null  -- 1日の時間帯（終了, 排他）
  slot_minutes    int         not null default 30
  timezone        text        not null default 'Asia/Tokyo'
  is_closed       boolean     not null default false  -- 締切フラグ
  created_at      timestamptz not null default now()
  expires_at      timestamptz not null default (now() + interval '30 days')  -- 30日TTL

participants
  id              uuid        PK
  event_id        uuid        FK -> events(id) on delete cascade
  name            text        not null
  edit_key_hash   text        not null  -- 編集キーのハッシュ
  created_at      timestamptz not null default now()
  updated_at      timestamptz not null default now()

responses                          -- スロットごとの ○/×
  id              uuid        PK
  event_id        uuid        FK -> events(id) on delete cascade   -- 集計用に非正規化保持
  participant_id  uuid        FK -> participants(id) on delete cascade
  slot_start      timestamptz not null   -- スロット開始(UTC)
  available       boolean     not null   -- true=○ / false=×
  unique(participant_id, slot_start)

day_memos                          -- 参加者×日付のメモ
  id              uuid        PK
  event_id        uuid        FK -> events(id) on delete cascade
  participant_id  uuid        FK -> participants(id) on delete cascade
  memo_date       date        not null
  memo            text        not null
  unique(participant_id, memo_date)
```

- 回答は**参加者ごとに別行**として持つため、同時書き込みの競合（ロストアップデート）が起きにくい。更新は `upsert`（`on conflict (participant_id, slot_start)`）。
- 未回答スロットは「行なし」で表現（○でも×でもない状態）。

---

## 8. セキュリティ要件

- **推測困難なID**: `eventId` は UUID（`gen_random_uuid()`）。URL推測攻撃を防ぐ。
- **管理者認証**: Supabase Google ログイン＋`ADMIN_EMAILS` 許可リスト。middleware で `/admin` を保護し、各ページ/アクションでも `requireAdmin()` で再検証（多層）。
- **編集キー**: 参加者ごとに発行。SHA-256 で**ハッシュ保存**し平文はDBに残さない。送信時に一度だけ本人へ提示。照合は定数時間比較。
- **検索エンジン除外**: `noindex` / `robots.txt` / `X-Robots-Tag`。`Referrer-Policy: no-referrer` でトークンのリファラ漏洩を抑止。
- **レートリミット（やや堅牢）**: 回答・編集の各APIに Upstash Redis のスライディングウィンドウを**2段（バースト＋時間あたり）のAND**で適用。本番で未設定なら書き込みAPIはフェイルクローズ。
- **ボット対策**: フォームにハニーポット項目を設置。
- **サーバー側バリデーション**: 日付・時刻（`12:15`や`25:00`等の不正値）、スロットが候補集合に含まれるか、文字数、型を zod で厳格に検証。候補スロット数の上限（既定2000）。
- **RLS**: 全テーブルで有効化しポリシー無し＝`anon`/`authenticated`は全拒否。`service_role`（サーバー専用）のみ操作。
- **ロストアップデート対策**: 参加者ごとに行を分割。編集は当該参加者の行のみ入れ替えるため競合は限定的。

---

## 9. 時刻・タイムゾーン要件

- 保存は**UTC（`timestamptz`）**で一貫。スロットは開始UTC時刻を正とする（`"10:30"`等のTZ非依存文字列では持たない）。
- v1は**JST固定表示**（国内想定）。ただしUTC保存により将来の複数TZ対応・DST対応の余地を残す。
- クライアントでの表示変換時にDST境界を考慮（海外対応を入れる場合）。

---

## 10. 非機能要件

- **コスト保護**: Supabase/Vercelの無料枠を基本。レートリミットと期限切れ自動削除で肥大化を防止。
- **接続管理**: サーバーレス関数からは必ずConnection Pooler経由で接続。
- **可用性/性能**: 集計クエリにインデックス（`responses(event_id, slot_start)` 等）。参加者多数時はキャッシュ。
- **データ保持（TTL）**: 既定で作成から一定期間（例: 90日）後に自動削除（`expires_at`＋定期ジョブ）。期間は要確定。

---

## 11. 法的・コンプライアンス

- **個人情報保護法（APPI）**: 参加者名等を扱うため、利用目的の明示（プライバシーポリシー）と安全管理措置を用意。
- **商標・不正競争防止法**: 名称・UIが既存サービスに抵触しないよう配慮。
- （海外提供する場合）GDPR等の検討は将来スコープ。

---

## 12. スコープ外（将来候補）

- Googleカレンダー/Outlook連携による空き時間自動検出。
- NG除外型（逆・調整さん）、リアルタイム陣取り風UI（memoのアイデア）。
- 複数タイムゾーン/DSTの本格対応。
- 通知（メール/LINE等）。

---

## 13. 決定事項 / 残課題

**決定済み**
- 正式名称: **ano-scheduler**。
- データ保持期間: **30日**（`expires_at` 既定＋Cronで削除、管理画面で残日数表示・手動削除可）。
- 結果閲覧: 回答用URLと**同一ページ**で公開（調整さん型）。
- レートリミット基盤: **Upstash Redis**（やや堅牢・2段AND）。
- 締切後挙動: 回答フォームは無効化、集計は**閲覧可**。
- 回答方式: ○×2段階（○のみ保存・未選択=×扱い）＋参加者×日付のメモ。
- 管理者認証: Supabase Google ログイン＋メール許可リスト。

**残課題**
- [ ] スロットのドラッグ一括選択（現状はセル単位タップ＋日まとめ切替のみ）。
- [ ] CSVエクスポート／告知文生成／イベント編集UI。
- [x] 管理者向け PWA（ホーム追加・インストール）。※プッシュ通知は今後。
- [ ] QRコード生成、OGP画像の用意。
- [ ] プライバシーポリシーページの実装（APPI 対応文面）。
