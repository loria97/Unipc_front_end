-- Crea la tabella public.courses (catalogo corsi/certificazioni professionalizzanti):
-- identità, contenuti, prezzo autorevole in centesimi, RLS e trigger di manutenzione.

create table public.courses (
  id uuid primary key default gen_random_uuid(),

  -- Identità
  slug text not null unique,
  title text not null,
  type text not null check (type in ('corso', 'certificazione')),
  area text not null,
  abstract text not null,
  hero_image jsonb not null,

  -- Contenuti: array di paragrafi. L'HTML inline è limitato a <strong>/<em>/<a href>
  -- per convenzione applicativa (sanitizzazione lato frontend), non imposto qui con CHECK.
  a_chi_e_rivolto text[] not null default '{}',
  obiettivi text[] not null default '{}',
  requisiti_ammissione text[] not null default '{}',
  programma text[],

  -- Specifiche
  durata_ore integer not null check (durata_ore > 0),
  durata_label text not null,
  cfu integer check (cfu >= 0), -- NULL per le certificazioni
  modalita text not null,
  prove_previste text[],

  -- Prezzo: SEMPRE centesimi interi, mai numeric/float
  list_price_cents integer not null check (list_price_cents >= 0),
  promo_price_cents integer check (promo_price_cents >= 0),
  promo_label text,
  promo_valid_until date,
  vat_regime text not null default 'da_definire'
    check (vat_regime in ('esente_art10', 'iva_22', 'da_definire')),

  -- Titoli e normativa
  riferimenti_normativi jsonb,
  punti_graduatoria jsonb,
  classi_concorso text[],

  -- Pubblicazione
  published boolean not null default false,
  sort_order integer,
  seo jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- I tre campi promo sono tutti NULL oppure tutti valorizzati: nessuno stato intermedio
  constraint courses_promo_fields_consistency check (
    (promo_price_cents is null and promo_label is null and promo_valid_until is null)
    or
    (promo_price_cents is not null and promo_label is not null and promo_valid_until is not null)
  ),

  -- Se la promo è attiva, il prezzo promo deve essere strettamente inferiore al listino
  constraint courses_promo_price_lower_than_list check (
    promo_price_cents is null or promo_price_cents < list_price_cents
  )
);

comment on table public.courses is
  'Catalogo corsi e certificazioni professionalizzanti. list_price_cents/promo_price_cents sono il prezzo autorevole in centesimi.';
comment on column public.courses.hero_image is 'Forma { "src": "...", "alt": "..." }';
comment on column public.courses.seo is 'Forma { "metaTitle": "...", "metaDescription": "..." }';
comment on column public.courses.riferimenti_normativi is 'Array di { "label": "...", "url": "..." }';
comment on column public.courses.punti_graduatoria is 'Forma { "punti": number, "note": "..." }';

-- Funzione trigger generica e riutilizzabile: aggiorna updated_at a ogni update.
-- search_path fissato per evitare hijacking (best practice per funzioni Postgres/Supabase).
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

-- Indici per i filtri del catalogo pubblico ("corsi pubblicati filtrati per area").
-- Nessun indice separato su slug: il vincolo `unique` sopra crea già in automatico
-- un indice btree univoco (courses_slug_key), che copre le ricerche per slug.
create index idx_courses_published_area on public.courses (published, area);

-- RLS
alter table public.courses enable row level security;

-- Il catalogo è pubblico, ma i corsi non pubblicati (bozze) restano invisibili
-- ad anon e authenticated: la visibilità è filtrata esplicitamente su published = true,
-- non è un `using (true)` indiscriminato.
create policy "chiunque legge i corsi pubblicati"
on public.courses
for select
to anon, authenticated
using (published = true);

-- Nessuna policy insert/update/delete: la tabella è scritta solo da service role/dashboard.
