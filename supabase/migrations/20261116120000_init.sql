-- Giải cứu Vương quốc Toán 12 – schema Supabase
-- Chạy trong SQL Editor hoặc: supabase db push

create table if not exists public.students (
  id uuid primary key,
  name_normalized text not null,
  display_name text not null,
  class text not null,
  class_normalized text not null,
  avatar text not null check (avatar in ('prince', 'princess')),
  created_at timestamptz not null default now(),
  unique (name_normalized, class_normalized)
);

create table if not exists public.sessions (
  id uuid primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  start_level smallint not null default 1 check (start_level between 1 and 7),
  max_level smallint not null default 0 check (max_level between 0 and 7),
  result text not null default 'in_progress' check (result in ('in_progress', 'victory', 'game_over', 'abandoned')),
  last_activity timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  level smallint not null check (level between 1 and 7),
  template_id text not null,
  kind text not null check (kind in ('mc', 'short')),
  params_json jsonb not null default '{}'::jsonb,
  question_text text not null,
  choices_json jsonb,
  given_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  lives_left smallint not null check (lives_left between 0 and 3),
  time_spent_ms integer not null default 0 check (time_spent_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sessions_student_idx on public.sessions (student_id, started_at desc);
create index if not exists attempts_student_idx on public.attempts (student_id, created_at desc);
create index if not exists attempts_session_idx on public.attempts (session_id);
create index if not exists attempts_level_idx on public.attempts (level);
create index if not exists attempts_template_idx on public.attempts (template_id);

-- Bật RLS và không tạo policy cho anon/authenticated:
-- học sinh không đọc/ghi trực tiếp bảng, mọi thao tác đi qua Edge Function dùng service role.
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.attempts enable row level security;

revoke all on table public.students from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.attempts from anon, authenticated;

grant all on table public.students to service_role;
grant all on table public.sessions to service_role;
grant all on table public.attempts to service_role;

-- Các view dùng security_invoker để nếu lỡ bị gọi trực tiếp bằng anon thì RLS vẫn chặn.
create or replace view public.v_student_overview
with (security_invoker = true) as
select
  s.id,
  s.display_name,
  s.class,
  s.avatar,
  s.created_at,
  (select count(*) from public.sessions se where se.student_id = s.id)::int as sessions_count,
  coalesce((select max(se.max_level) from public.sessions se where se.student_id = s.id), 0)::int as max_level,
  (select count(*) from public.attempts a where a.student_id = s.id and not a.is_correct)::int as wrong_count,
  greatest(
    coalesce((select max(a.created_at) from public.attempts a where a.student_id = s.id), s.created_at),
    coalesce((select max(se.last_activity) from public.sessions se where se.student_id = s.id), s.created_at)
  ) as last_played
from public.students s;

create or replace view public.v_level_stats
with (security_invoker = true) as
select
  level,
  count(*)::int as attempts,
  count(*) filter (where not is_correct)::int as wrong,
  coalesce((count(*) filter (where not is_correct))::float8 / nullif(count(*), 0), 0) as wrong_rate
from public.attempts
group by level
order by level;

create or replace view public.v_template_stats
with (security_invoker = true) as
select
  template_id,
  level,
  count(*)::int as attempts,
  count(*) filter (where not is_correct)::int as wrong,
  coalesce((count(*) filter (where not is_correct))::float8 / nullif(count(*), 0), 0) as wrong_rate
from public.attempts
group by template_id, level
order by level, template_id;

revoke all on table public.v_student_overview from anon, authenticated;
revoke all on table public.v_level_stats from anon, authenticated;
revoke all on table public.v_template_stats from anon, authenticated;

grant select on table public.v_student_overview to service_role;
grant select on table public.v_level_stats to service_role;
grant select on table public.v_template_stats to service_role;
