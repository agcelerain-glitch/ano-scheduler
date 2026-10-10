-- フィードバックの既読状態（管理者ごと）
-- 管理者（email）ごとに「どのフィードバックを読んだか」を記録する。
-- super と一般管理者で既読状態は独立。未読バッジ・既読表記の判定に使う。

create table if not exists public.feedback_reads (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  email       text not null,                                -- 読んだ管理者のメール（小文字正規化して保存）
  read_at     timestamptz not null default now(),
  primary key (feedback_id, email)
);

-- email 単位での未読集計を速くする補助インデックス。
create index if not exists idx_feedback_reads_email on public.feedback_reads (email);

-- RLS 有効化・ポリシー無し＝ service_role（サーバー専用）のみ操作可。
alter table public.feedback_reads enable row level security;
