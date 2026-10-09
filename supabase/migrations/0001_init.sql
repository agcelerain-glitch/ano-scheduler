-- ano-scheduler 初期スキーマ
-- 実行: Supabase ダッシュボードの SQL Editor に貼り付けて実行、
--       または supabase CLI (supabase db push) で適用。

create extension if not exists pgcrypto;

-- ========== events ==========
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),   -- 回答用URLに使う推測困難なID
  title         text not null,
  description   text not null default '',
  owner_email   text not null,                                -- 作成した管理者のメール
  date_start    date not null,
  date_end      date not null,
  time_start    time not null,                                -- 1日の時間帯（開始）
  time_end      time not null,                                -- 1日の時間帯（終了, 排他）
  slot_minutes  int  not null default 30,
  timezone      text not null default 'Asia/Tokyo',
  is_closed     boolean not null default false,               -- 回答締切フラグ
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days')  -- 30日で自動削除対象
);

-- ========== participants ==========
create table if not exists public.participants (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  name          text not null,
  edit_key_hash text not null,                                -- 編集キーの SHA-256（平文は保存しない）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ========== responses （スロットごとの ○） ==========
create table if not exists public.responses (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  slot_start     timestamptz not null,                        -- スロット開始(UTC)
  available      boolean not null default true,               -- true=○（×は行を作らない）
  unique (participant_id, slot_start)
);

-- ========== day_memos （参加者×日付のメモ） ==========
create table if not exists public.day_memos (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  memo_date      date not null,
  memo           text not null,
  unique (participant_id, memo_date)
);

-- ========== indexes ==========
create index if not exists idx_responses_event      on public.responses (event_id, slot_start);
create index if not exists idx_responses_participant on public.responses (participant_id);
create index if not exists idx_participants_event    on public.participants (event_id);
create index if not exists idx_daymemos_participant  on public.day_memos (participant_id);
create index if not exists idx_events_expires        on public.events (expires_at);
create index if not exists idx_events_owner          on public.events (owner_email);

-- ========== RLS ==========
-- 全テーブルで RLS を有効化し、ポリシーを一切作らない＝ anon / authenticated からは全拒否。
-- アプリは Vercel サーバー側から service_role（RLSをバイパス）でのみアクセスする。
alter table public.events       enable row level security;
alter table public.participants enable row level security;
alter table public.responses    enable row level security;
alter table public.day_memos    enable row level security;
