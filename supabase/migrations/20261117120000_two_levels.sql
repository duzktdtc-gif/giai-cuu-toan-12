-- Giải cứu Vương quốc Toán 12 – nâng cấp 2 màn × 5 câu
-- Không sửa migration cũ; migration này bổ sung cột/view cho phiên bản mới
-- nhưng vẫn giữ dữ liệu 7 màn cũ để giáo viên xem lịch sử.

-- ---------------------------------------------------------------------------
-- sessions: thêm level, thời gian, số câu đúng/sai, số câu gốc đã vượt qua
-- ---------------------------------------------------------------------------
alter table public.sessions add column if not exists level smallint;
update public.sessions set level = start_level where level is null;
alter table public.sessions alter column level set default 1;
alter table public.sessions alter column level set not null;

alter table public.sessions add column if not exists total_time_ms integer not null default 0;
alter table public.sessions add column if not exists wrong_count integer not null default 0;
alter table public.sessions add column if not exists correct_count integer not null default 0;
alter table public.sessions add column if not exists cleared_count smallint not null default 0;

alter table public.sessions drop constraint if exists sessions_level_check;
alter table public.sessions add constraint sessions_level_check check (level between 1 and 7);

alter table public.sessions drop constraint if exists sessions_result_check;
alter table public.sessions add constraint sessions_result_check check (
  result in (
    'in_progress',
    'win',
    'lose_lives',
    'lose_timeout',
    'abandoned',
    -- Giá trị của phiên bản 7 màn cũ.
    'victory',
    'game_over'
  )
);

alter table public.sessions drop constraint if exists sessions_total_time_ms_check;
alter table public.sessions add constraint sessions_total_time_ms_check check (total_time_ms >= 0);

alter table public.sessions drop constraint if exists sessions_wrong_count_check;
alter table public.sessions add constraint sessions_wrong_count_check check (wrong_count >= 0);

alter table public.sessions drop constraint if exists sessions_correct_count_check;
alter table public.sessions add constraint sessions_correct_count_check check (correct_count >= 0);

alter table public.sessions drop constraint if exists sessions_cleared_count_check;
alter table public.sessions add constraint sessions_cleared_count_check check (cleared_count between 0 and 5);

create index if not exists sessions_level_idx on public.sessions (level, started_at desc);
create index if not exists sessions_result_idx on public.sessions (result);

-- ---------------------------------------------------------------------------
-- attempts: thêm câu hỏi, câu tương tự, chỉ số đáp án đã chọn/đúng
-- ---------------------------------------------------------------------------
alter table public.attempts add column if not exists question_id text;
update public.attempts set question_id = template_id where question_id is null;
alter table public.attempts alter column question_id set default '';
alter table public.attempts alter column question_id set not null;

alter table public.attempts add column if not exists is_similar boolean not null default false;
alter table public.attempts add column if not exists chosen_index smallint;
alter table public.attempts add column if not exists correct_index smallint;

alter table public.attempts drop constraint if exists attempts_chosen_index_check;
alter table public.attempts add constraint attempts_chosen_index_check check (
  chosen_index is null or chosen_index between 0 and 3
);

alter table public.attempts drop constraint if exists attempts_correct_index_check;
alter table public.attempts add constraint attempts_correct_index_check check (
  correct_index is null or correct_index between 0 and 3
);

create index if not exists attempts_question_idx on public.attempts (question_id, created_at desc);
create index if not exists attempts_similar_idx on public.attempts (is_similar);

-- ---------------------------------------------------------------------------
-- Backfill thống kê cho các session cũ (chỉ khi các cột còn trống).
-- ---------------------------------------------------------------------------
update public.sessions se
set
  total_time_ms = agg.total_time_ms,
  wrong_count = agg.wrong_count,
  correct_count = agg.correct_count,
  cleared_count = least(5, agg.correct_count)
from (
  select
    session_id,
    coalesce(sum(time_spent_ms), 0)::int as total_time_ms,
    count(*) filter (where not is_correct)::int as wrong_count,
    count(*) filter (where is_correct)::int as correct_count
  from public.attempts
  group by session_id
) agg
where agg.session_id = se.id
  and se.total_time_ms = 0
  and se.wrong_count = 0
  and se.correct_count = 0
  and se.cleared_count = 0;

-- ---------------------------------------------------------------------------
-- Views cho dashboard giáo viên.
-- ---------------------------------------------------------------------------
drop view if exists public.v_student_overview;
create view public.v_student_overview
with (security_invoker = true) as
select
  s.id,
  s.display_name,
  s.class,
  s.avatar,
  s.created_at,
  (select count(*) from public.sessions se where se.student_id = s.id)::int as sessions_count,
  (select count(*) from public.sessions se where se.student_id = s.id and se.result in ('win', 'victory'))::int as win_count,
  (select count(*) from public.sessions se where se.student_id = s.id and se.result in ('lose_lives', 'game_over'))::int as lose_lives_count,
  (select count(*) from public.sessions se where se.student_id = s.id and se.result = 'lose_timeout')::int as lose_timeout_count,
  (select coalesce(sum(se.total_time_ms), 0) from public.sessions se where se.student_id = s.id)::int as total_time_ms,
  (select count(*) from public.attempts a where a.student_id = s.id and not a.is_correct)::int as wrong_count,
  (select count(*) from public.attempts a where a.student_id = s.id and a.is_correct)::int as correct_count,
  coalesce(
    (select se.level from public.sessions se where se.student_id = s.id order by se.last_activity desc limit 1),
    0
  )::int as last_level,
  coalesce(
    (select array_agg(distinct se.level) from public.sessions se where se.student_id = s.id),
    '{}'::smallint[]
  ) as levels_played,
  coalesce((select max(se.max_level) from public.sessions se where se.student_id = s.id), 0)::int as max_level,
  greatest(
    coalesce((select max(a.created_at) from public.attempts a where a.student_id = s.id), s.created_at),
    coalesce((select max(se.last_activity) from public.sessions se where se.student_id = s.id), s.created_at)
  ) as last_played
from public.students s;

drop view if exists public.v_level_stats;
create view public.v_level_stats
with (security_invoker = true) as
select
  a.level,
  count(*)::int as attempts,
  count(*) filter (where not a.is_correct)::int as wrong,
  coalesce((count(*) filter (where not a.is_correct))::float8 / nullif(count(*), 0), 0) as wrong_rate,
  (select count(*) from public.sessions se where se.level = a.level)::int as sessions,
  (select count(*) from public.sessions se where se.level = a.level and se.result in ('win', 'victory'))::int as wins,
  coalesce(
    (
      select avg(se.total_time_ms)
      from public.sessions se
      where se.level = a.level and se.ended_at is not null
    ),
    0
  )::int as avg_time_ms
from public.attempts a
group by a.level
order by a.level;

create or replace view public.v_question_stats
with (security_invoker = true) as
select
  coalesce(a.question_id, a.template_id) as question_id,
  a.level,
  count(*)::int as attempts,
  count(*) filter (where not a.is_correct)::int as wrong,
  coalesce((count(*) filter (where not a.is_correct))::float8 / nullif(count(*), 0), 0) as wrong_rate,
  count(*) filter (where a.is_similar)::int as similar_attempts
from public.attempts a
group by coalesce(a.question_id, a.template_id), a.level
order by a.level, question_id;

-- View cũ vẫn giữ để không làm hỏng client lịch sử; dashboard mới dùng v_question_stats.
create or replace view public.v_template_stats
with (security_invoker = true) as
select
  coalesce(question_id, template_id) as template_id,
  level,
  count(*)::int as attempts,
  count(*) filter (where not is_correct)::int as wrong,
  coalesce((count(*) filter (where not is_correct))::float8 / nullif(count(*), 0), 0) as wrong_rate
from public.attempts
group by coalesce(question_id, template_id), level
order by level, template_id;

revoke all on table public.v_student_overview from anon, authenticated;
revoke all on table public.v_level_stats from anon, authenticated;
revoke all on table public.v_question_stats from anon, authenticated;
revoke all on table public.v_template_stats from anon, authenticated;

grant select on table public.v_student_overview to service_role;
grant select on table public.v_level_stats to service_role;
grant select on table public.v_question_stats to service_role;
grant select on table public.v_template_stats to service_role;
