create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  email text unique not null,
  name text,
  mobile text,
  whatsapp_opt_in boolean default false,
  highest_qualification text,
  discipline text,
  branch text,
  date_of_birth date,
  created_at timestamptz default now()
);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  source_post_id integer unique,
  title text not null,
  career_field text,
  category text,
  source_category text,
  min_qualification text default 'graduate',
  eligible_streams text[] default '{any}',
  min_age integer,
  max_age integer,
  apply_link text,
  apply_start date,
  apply_end date,
  exam_date date,
  exam_date_text text,
  admit_card_text text,
  updated_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  exam_id uuid references exams(id) on delete cascade,
  category text,
  created_at timestamptz default now(),
  check (exam_id is not null or category is not null)
);

create table if not exists notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  exam_id uuid references exams(id) on delete cascade,
  milestone text check (milestone in ('t-7','t-3','t-1')),
  channel text check (channel in ('whatsapp','email')),
  sent_at timestamptz default now(),
  unique (user_id, exam_id, milestone, channel)
);

-- single-row table tracking the ingestion cron's watermark.
-- Seeded to 3 days back so the first-ever run pulls a manageable recent
-- batch instead of walking every post since the site's 2012 archive.
create table if not exists ingestion_state (
  id boolean primary key default true check (id),
  last_poll timestamptz not null default (now() - interval '3 days')
);
insert into ingestion_state (id, last_poll) values (true, now() - interval '3 days')
  on conflict (id) do nothing;

create index if not exists idx_exams_category on exams(category);
create index if not exists idx_exams_apply_end on exams(apply_end);
create index if not exists idx_subscriptions_user on subscriptions(user_id);
create index if not exists idx_notifications_user_exam on notifications_log(user_id, exam_id);
