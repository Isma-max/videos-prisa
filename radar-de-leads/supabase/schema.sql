-- ════════════════════════════════════════════════════════════════
-- Radar de Leads — esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en: Supabase > SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Extensión para UUIDs
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- Fuentes RSS
-- ────────────────────────────────────────────────────────────────
create table if not exists public.sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  url         text not null unique,
  category    text,                          -- categoría por defecto para sus noticias
  active      boolean not null default true,
  weight      int not null default 50,       -- 0-100, peso editorial de la fuente
  last_fetched_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- Noticias / leads
-- ────────────────────────────────────────────────────────────────
-- estado: 'nueva' | 'seleccionada' | 'descartada' | 'guion_generado'
create table if not exists public.news (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid references public.sources(id) on delete set null,
  source_name text,                          -- desnormalizado para mostrar rápido
  title       text not null,
  url         text not null unique,          -- evita duplicados por link
  published_at timestamptz,
  category    text,
  summary     text,
  signals     text[] not null default '{}',  -- señales detectadas
  score       int not null default 0,        -- score editorial 0-100
  status      text not null default 'nueva',

  -- salida de "Generar lead"
  lead        jsonb,                         -- { gancho, angulo, porQueFunciona, formato, advertencias }
  -- salida de "Generar guion"
  script      text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists news_status_idx       on public.news (status);
create index if not exists news_score_idx         on public.news (score desc);
create index if not exists news_published_at_idx  on public.news (published_at desc);

-- ────────────────────────────────────────────────────────────────
-- updated_at automático
-- ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_set_updated_at on public.news;
create trigger news_set_updated_at
  before update on public.news
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────
-- Row Level Security
-- El backend usa la service_role key (que ignora RLS). Mantenemos RLS
-- activo y sin políticas públicas para que el anon key no exponga datos.
-- Si quieres acceso directo desde el cliente, agrega políticas acá.
-- ────────────────────────────────────────────────────────────────
alter table public.sources enable row level security;
alter table public.news    enable row level security;

-- ────────────────────────────────────────────────────────────────
-- Fuentes de ejemplo (medios chilenos). Edítalas a gusto.
-- ────────────────────────────────────────────────────────────────
insert into public.sources (name, url, category, weight) values
  ('BioBioChile',            'https://www.biobiochile.cl/lista/rss',                 'Nacional',    60),
  ('Emol',                   'https://emol.com/rss/rss.asp?canal=todas',             'Nacional',    60),
  ('La Tercera',             'https://www.latercera.com/feed/',                      'Nacional',    60),
  ('T13',                    'https://www.t13.cl/rss',                               'Nacional',    55)
on conflict (url) do nothing;
