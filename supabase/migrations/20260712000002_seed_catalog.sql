-- Seed catalog data (plans, traditions, personas). Safe to re-run with ON CONFLICT.

insert into public.traditions (key, label, description, allows_saints_content, active)
values
  ('ecumenical', 'Ecumênica', 'Núcleo compartilhado da fé cristã com respeito às diferenças.', false, true),
  ('evangelical', 'Evangélica', 'Centrada nas Escrituras, graça e discipulado, sem devoção a santos.', false, true),
  ('catholic', 'Católica', 'Escrituras com sensibilidade à tradição católica quando habilitada.', true, true)
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  allows_saints_content = excluded.allows_saints_content,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.tradition_policies (tradition_key, guidance_notes)
values
  ('ecumenical', array[
    'Priorize temas comuns aos cristãos.',
    'Evite dogmatizar práticas exclusivas de uma denominação.'
  ]),
  ('evangelical', array[
    'Não apresente devoção a santos.',
    'Enfatize Cristo, graça e aplicação pastoral.'
  ]),
  ('catholic', array[
    'Pode incluir santos quando o perfil permitir.',
    'Mantenha as Escrituras como âncora.'
  ])
on conflict (tradition_key) do update set
  guidance_notes = excluded.guidance_notes,
  updated_at = timezone('utc', now());

insert into public.personas (key, name, description, source_basis, active, requires_saints_policy, guidance_notes)
values
  ('jesus', 'Jesus', 'Mentor principal — interpretação baseada nos Evangelhos.', 'Evangelhos', true, false,
    array['Nunca fale na primeira pessoa como Jesus divino.', 'Use linguagem de orientação à luz dos Evangelhos.']),
  ('paulo', 'Paulo', 'Interpretação baseada nas cartas paulinas.', 'Cartas paulinas', true, false,
    array['Enfatize graça, justificação e vida em comunidade.']),
  ('pedro', 'Pedro', 'Perspectiva petrina — inicialmente inativa.', 'Evangelhos e cartas petrinas', false, false,
    array['Enfatize restauração após falhas.']),
  ('maria', 'Maria', 'Disponível quando a política da tradição permitir.', 'Narrativas evangélicas sobre Maria', true, true,
    array['Só use quando tradição e perfil permitirem.'])
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  source_basis = excluded.source_basis,
  active = excluded.active,
  requires_saints_policy = excluded.requires_saints_policy,
  guidance_notes = excluded.guidance_notes,
  updated_at = timezone('utc', now());

insert into public.persona_policies (persona_key, allowed_tradition_keys, blocked_tradition_keys, extra_guidance)
values
  ('jesus', null, null, array['Persona padrão.']),
  ('paulo', null, null, array['Útil para graça e ética cristã.']),
  ('pedro', null, null, array['Inativa na fundação.']),
  ('maria', array['catholic'], array['evangelical'], array['Bloqueada para tradição evangélica.'])
on conflict (persona_key) do update set
  allowed_tradition_keys = excluded.allowed_tradition_keys,
  blocked_tradition_keys = excluded.blocked_tradition_keys,
  extra_guidance = excluded.extra_guidance,
  updated_at = timezone('utc', now());

insert into public.plans (key, name, tagline, price_monthly_cents, currency, cta_type, active)
values
  ('essencial', 'Essencial', 'Ponto de partida acolhedor para reflexão diária.', 3800, 'BRL', 'checkout', true),
  ('caminho', 'Caminho', 'Jornada com mais regularidade.', 5800, 'BRL', 'checkout', true),
  ('profundo', 'Profundo', 'Mais profundidade, memória e perspectivas.', 18800, 'BRL', 'checkout', true),
  ('particular', 'Particular', 'Acompanhamento sob medida, sob solicitação.', 98800, 'BRL', 'request_access', true)
on conflict (key) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  price_monthly_cents = excluded.price_monthly_cents,
  cta_type = excluded.cta_type,
  active = excluded.active,
  updated_at = timezone('utc', now());

-- Clear and reseed entitlements for deterministic local config
delete from public.plan_entitlements;

insert into public.plan_entitlements (plan_key, entitlement_key)
values
  ('essencial', 'chat_standard'),
  ('essencial', 'short_memory'),
  ('caminho', 'chat_standard'),
  ('caminho', 'chat_frequent'),
  ('caminho', 'short_memory'),
  ('caminho', 'reading_journeys'),
  ('caminho', 'fair_use_extended'),
  ('profundo', 'chat_standard'),
  ('profundo', 'chat_frequent'),
  ('profundo', 'chat_deep'),
  ('profundo', 'short_memory'),
  ('profundo', 'extended_memory'),
  ('profundo', 'multiple_personas'),
  ('profundo', 'reading_journeys'),
  ('profundo', 'voice_responses'),
  ('profundo', 'priority_support'),
  ('profundo', 'fair_use_extended'),
  ('particular', 'chat_standard'),
  ('particular', 'chat_frequent'),
  ('particular', 'chat_deep'),
  ('particular', 'short_memory'),
  ('particular', 'extended_memory'),
  ('particular', 'multiple_personas'),
  ('particular', 'reading_journeys'),
  ('particular', 'voice_responses'),
  ('particular', 'priority_support'),
  ('particular', 'human_concierge'),
  ('particular', 'custom_content'),
  ('particular', 'whatsapp_access'),
  ('particular', 'fair_use_extended');
