-- MPC guide, Phase 2: fuller check-in (favourite garden + optional one-line comment) and analytics columns.
-- Run once in the Supabase dashboard (SQL Editor > New query > paste > Run), AFTER 001 and 002.
--
-- Privacy model (nothing personal is stored):
--   * Still no name, email, location or account. The comment is one short line, and the database itself rejects
--     anything that looks like an email address, a link or a phone number.
--   * Comments are never readable by visitors (the checkins table stays closed to the API) and are never returned by
--     checkin_totals(), so the chatbot and the site can't show or quote them.
--   * Details are added through checkin_details(), which only fills in the visitor's own latest check-in
--     (matched by their random device ID) once, within 2 hours of checking in.
-- Analytics stay first party and cookie free: events gain a random per-visit session id and a placement tag.

-- ---------- checkins: favourite garden and comment ----------
alter table public.checkins add column if not exists favourite_site_id text references public.sites (id);
alter table public.checkins add column if not exists comment text;

alter table public.checkins drop constraint if exists checkins_comment_check;
alter table public.checkins add constraint checkins_comment_check check (
  comment is null or (
    char_length(comment) between 1 and 140
    and comment !~ '[[:cntrl:]]'
    and comment !~* '[[:alnum:]._%+-]+@[[:alnum:]-]+'
    and comment !~* '(https?:|www\.|\.com|\.org|\.net|\.au)'
    and comment !~ '([0-9][[:space:]().-]*){8,}'
  )
);

create or replace function public.checkin_details(
  p_site_id text, p_device_id uuid, p_favourite_site_id text, p_comment text
)
returns boolean -- true = saved, false = nothing to update (no recent check-in, already filled, or nothing sent)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_comment text := nullif(btrim(p_comment), '');
begin
  if p_favourite_site_id is null and v_comment is null then
    return false;
  end if;
  select id into v_id
  from public.checkins
  where device_id = p_device_id and site_id = p_site_id
    and created_at > now() - interval '2 hours'
    and favourite_site_id is null and comment is null
  order by created_at desc
  limit 1;
  if v_id is null then
    return false;
  end if;
  update public.checkins set favourite_site_id = p_favourite_site_id, comment = v_comment where id = v_id;
  return true;
end;
$$;
revoke all on function public.checkin_details(text, uuid, text, text) from public;
grant execute on function public.checkin_details(text, uuid, text, text) to anon, authenticated;

-- ---------- events: session id and placement (for analytics) ----------
alter table public.events add column if not exists session_id uuid;
alter table public.events add column if not exists placement text;
alter table public.events drop constraint if exists events_placement_check;
alter table public.events add constraint events_placement_check
  check (placement is null or placement ~ '^[a-z0-9-]{1,40}$');
create index if not exists events_session on public.events (session_id);

-- The analytics report script (service role key, run by hand) reads events and check-ins.
grant select on table public.events, public.checkins to service_role;
