-- フィードバック / 投票権リクエストの保存
-- Discord 通知に加え、内容を DB にも残して取りこぼしを防ぐ。

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'feedback',   -- 'feedback' | 'access_request'
  message    text not null default '',
  target     text not null default '',            -- access_request: 希望する予定
  contact    text not null default '',            -- 任意の連絡先
  path       text not null default '',            -- 送信元ページ
  ip_hash    text not null default '',            -- 乱用分析用（SHA-256。生IPは保存しない）
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created on public.feedback (created_at desc);

-- RLS 有効化・ポリシー無し＝ service_role（サーバー専用）のみ操作可。
alter table public.feedback enable row level security;
