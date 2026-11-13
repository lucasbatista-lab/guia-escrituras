-- =============================================================================
-- 20261112000019_whatsapp_inbound_events.sql
-- Additive: WhatsApp Cloud API inbound event ledger (idempotent, service-role).
-- Does NOT touch conversations/messages. Does NOT enable channel in app code.
-- Expired rows: purge via future ops job on expires_at (no cron in this wave).
-- =============================================================================

create table if not exists public.whatsapp_inbound_events (
  id uuid primary key default gen_random_uuid(),
  provider_message_id text not null,
  external_sender_id text not null,
  message_type text not null
    check (message_type in ('text')),
  message_text text not null
    check (char_length(message_text) > 0 and char_length(message_text) <= 4000),
  received_at timestamptz not null,
  available_after timestamptz not null,
  status text not null
    check (status in (
      'pending',
      'bundled',
      'processing',
      'processed',
      'ignored',
      'failed',
      'pending_identity'
    )),
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  processed_at timestamptz,
  expires_at timestamptz not null,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint whatsapp_inbound_events_provider_message_uidx
    unique (provider_message_id)
);

create index if not exists whatsapp_inbound_events_status_available_idx
  on public.whatsapp_inbound_events (status, available_after);

create index if not exists whatsapp_inbound_events_sender_status_idx
  on public.whatsapp_inbound_events (external_sender_id, status);

create index if not exists whatsapp_inbound_events_expires_idx
  on public.whatsapp_inbound_events (expires_at);

comment on table public.whatsapp_inbound_events is
  'WhatsApp inbound text events (Meta message id idempotent). No raw payload. Service-role only. Purge by expires_at in a later ops job.';

alter table public.whatsapp_inbound_events enable row level security;

-- No policies for anon/authenticated — service_role bypasses RLS.
revoke all on table public.whatsapp_inbound_events from public;
revoke all on table public.whatsapp_inbound_events from anon;
revoke all on table public.whatsapp_inbound_events from authenticated;

grant select, insert, update, delete
  on table public.whatsapp_inbound_events
  to service_role;
