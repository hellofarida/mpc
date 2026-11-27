-- MPC guide, Phase 2: frustration and performance signals. Run once in the Supabase SQL Editor, AFTER 001-003.
--
-- New event names (all anonymous, nothing typed or personal):
--   rage_click   3+ quick taps in one spot            detail = which element (fixed label)
--   error        something failed                      detail = what (fixed code, e.g. chat-template, geo-denied)
--   slow         something took too long               detail = what, value = milliseconds
--   panel_bounce a site panel opened and closed fast   site_id
--   site_flip    3+ different sites opened quickly     value = how many
--   leave_cancel Cancel on the "You're leaving" box     detail = where it was going
--   plan_abandon picked stops in Plan, never opened     value = how many stops
--   search_empty a search found nothing                 (what was typed is never sent)
--   chat_declined the chatbot declined a question       detail = reason code
--   visit_info   device class once per visit            detail = phone|tablet|desktop, value = page load ms (sampled)
-- `detail` is a short code from a fixed pattern and `value` a small number: there is no free text column.

alter table public.events add column if not exists detail text;
alter table public.events add column if not exists value integer;

alter table public.events drop constraint if exists events_detail_check;
alter table public.events add constraint events_detail_check check (detail is null or detail ~ '^[a-z0-9_-]{1,40}$');
alter table public.events drop constraint if exists events_value_check;
alter table public.events add constraint events_value_check check (value is null or value between 0 and 3600000);

alter table public.events drop constraint if exists events_event_check;
alter table public.events add constraint events_event_check check (event in (
  'page_open', 'garden_view', 'question', 'log_tap', 'join_tap', 'directions_tap', 'walk_open',
  'rage_click', 'error', 'slow', 'panel_bounce', 'site_flip', 'leave_cancel', 'plan_abandon',
  'search_empty', 'chat_declined', 'visit_info'
));

-- The hand-run prune script (service role key) deletes raw events older than N days.
grant delete on table public.events to service_role;
