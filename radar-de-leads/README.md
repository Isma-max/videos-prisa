# 📡 Radar de Leads

App web interna para **detectar noticias chilenas con potencial para convertirse
en videos cortos** (Facebook, YouTube Shorts, TikTok y Reels).

Importa noticias desde feeds RSS, las puntúa con un **score editorial (0-100)** y
unas **señales detectadas**, y permite generar con IA un **lead** (gancho, ángulo,
por qué funciona, formato, advertencias) y un **guion limpio para locución**.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL) para persistencia
- **Anthropic API** (`claude-opus-4-8`) para generación de texto
- Deploy en **Vercel**

---

## Arquitectura

```
radar-de-leads/
├── supabase/
│   └── schema.sql            # tablas: sources, news (+ trigger, RLS, seed)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # layout + navegación
│   │   ├── page.tsx          # Dashboard (tabla de noticias)
│   │   ├── sources/page.tsx  # Administración de fuentes RSS
│   │   └── api/
│   │       ├── news/         # GET lista, PATCH estado, DELETE
│   │       ├── sources/      # CRUD de fuentes
│   │       ├── import/       # job: importar desde RSS + scoring
│   │       ├── lead/         # POST: generar lead (IA)
│   │       └── script/       # POST: generar guion (IA)
│   ├── components/
│   │   ├── Dashboard.tsx         # tabla, filtros, importación
│   │   ├── SourcesManager.tsx    # ABM de fuentes
│   │   ├── NewsDetailModal.tsx   # detalle + generar lead/guion
│   │   └── badges.tsx            # badges de score y estado
│   └── lib/
│       ├── types.ts          # tipos compartidos
│       ├── supabase.ts       # cliente admin (service_role)
│       ├── scoring.ts        # algoritmo de scoring editorial
│       ├── rss.ts            # parseo de feeds RSS/Atom
│       └── ai.ts             # llamadas a Anthropic (lead + guion)
└── vercel.json               # cron horario de importación
```

### Flujo de datos

```
Fuentes RSS ──▶ /api/import ──▶ scoring.ts ──▶ Supabase (news)
                                                   │
Dashboard ◀── /api/news ◀───────────────────────-─┘
   │
   ├─ /api/lead   ──▶ ai.ts (Anthropic) ──▶ news.lead
   └─ /api/script ──▶ ai.ts (Anthropic) ──▶ news.script
```

### Modelo de datos

- **sources**: feeds RSS (nombre, url, categoría, peso editorial, activa).
- **news**: noticias importadas con `title`, `source`, `url`, `published_at`,
  `category`, `summary`, `signals[]`, `score`, `status`, `lead` (jsonb) y `script`.
  - `status`: `nueva` · `seleccionada` · `descartada` · `guion_generado`.

El backend usa la **service_role key** de Supabase. RLS queda activo y sin
políticas públicas, de modo que la `anon key` no expone datos.

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
cd radar-de-leads
npm install
```

### 2. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta el contenido de [`supabase/schema.sql`](./supabase/schema.sql).
   Esto crea las tablas, el trigger de `updated_at`, RLS y algunas fuentes de ejemplo.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```bash
cp .env.example .env.local
```

| Variable | Dónde se obtiene |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase › Project Settings › API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase › Project Settings › API (¡secreta!) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | opcional, por defecto `claude-opus-4-8` |
| `CRON_SECRET` | opcional, protege `/api/import` |

### 4. Correr en local

```bash
npm run dev
```

Abre <http://localhost:3000>.

---

## Uso

1. **Fuentes RSS** (`/sources`): añade o edita feeds. El *peso* (0-100) influye en
   el score de las noticias de esa fuente.
2. **Dashboard** (`/`): pulsa **“↻ Importar desde RSS”** para traer noticias.
   Se calculan score y señales y se guardan en Supabase (sin duplicar por URL).
3. Filtra por estado, busca por título y ordena por score o fecha.
4. Abre una noticia (**“Ver”**) para:
   - **Generar lead**: gancho, ángulo, por qué funciona, formato y advertencias.
   - **Generar guion**: texto limpio listo para locución.
   - Copiar cualquiera de las dos salidas.
5. Marca noticias como **Seleccionada** / **Descartada**.

---

## El algoritmo de scoring

`src/lib/scoring.ts` combina, de forma transparente y editable:

- **Peso de la fuente** (hasta 15 pts).
- **Frescura** de la noticia (hasta 25 pts): lo reciente vale más.
- **Temáticas virales** por keywords (conflicto, farándula, policial, dinero,
  emoción, insólito, clima…). Cada categoría detectada suma y se reporta como señal.
- **Características del titular** (cifras, preguntas, tono enfático, superlativos, largo).
- **Penalizaciones** para temas áridos en video (licitaciones, comunicados, etc.).

Devuelve `score` (0-100) y `signals` (las señales que explican el puntaje).
Ajusta pesos y keywords a tu criterio editorial.

---

## Importación automática (cron)

[`vercel.json`](./vercel.json) define un cron **cada hora** que llama a `/api/import`.
Si defines `CRON_SECRET`, Vercel Cron envía `Authorization: Bearer <CRON_SECRET>`
automáticamente y el endpoint queda protegido. También puedes dispararlo a mano:

```bash
curl -X POST http://localhost:3000/api/import
# con secreto:
curl -X POST http://localhost:3000/api/import -H "x-cron-secret: $CRON_SECRET"
```

---

## Deploy en Vercel

1. Sube el repo a GitHub.
2. En Vercel, **New Project** apuntando el **Root Directory** a `radar-de-leads/`.
3. Carga las mismas variables de entorno en **Project Settings › Environment Variables**.
4. Deploy. El cron de importación queda activo automáticamente.

> Las generaciones de IA pueden tardar; las rutas declaran `maxDuration = 60`.
> En el plan Hobby de Vercel el cron mínimo es diario; ajusta el `schedule` si aplica.

---

## Notas

- **Responsabilidad editorial**: el lead incluye advertencias legales/reputacionales,
  pero la revisión final (presunción de inocencia, menores, víctimas, derechos de
  imagen, fuentes no verificadas) es humana.
- La IA **no inventa datos**; trabaja sobre el título y el resumen del feed.
