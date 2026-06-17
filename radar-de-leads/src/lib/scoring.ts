// ════════════════════════════════════════════════════════════════
// Algoritmo simple de scoring editorial (0-100).
//
// La idea: estimar qué tan apta es una noticia para convertirse en un
// video corto y viral. No pretende ser perfecto; es transparente y fácil
// de ajustar. Devuelve un score y las "señales detectadas" que lo explican.
// ════════════════════════════════════════════════════════════════

export interface ScoreInput {
  title: string;
  summary?: string | null;
  publishedAt?: string | Date | null;
  sourceWeight?: number; // 0-100
  category?: string | null;
}

export interface ScoreResult {
  score: number; // 0-100
  signals: string[]; // explicación legible de qué disparó el score
}

// Palabras/temáticas que suelen funcionar en video corto (contexto chileno).
const SIGNAL_KEYWORDS: { label: string; weight: number; terms: string[] }[] = [
  {
    label: "Conflicto / polémica",
    weight: 14,
    terms: [
      "polémica",
      "polemica",
      "escándalo",
      "escandalo",
      "funa",
      "críticas",
      "criticas",
      "denuncia",
      "acusa",
      "enojo",
      "indignación",
      "indignacion",
      "repudio",
    ],
  },
  {
    label: "Farándula / celebridades",
    weight: 12,
    terms: [
      "farándula",
      "farandula",
      "influencer",
      "instagram",
      "tiktok",
      "viral",
      "matrimonio",
      "pololeo",
      "quiebre",
      "romance",
    ],
  },
  {
    label: "Policial / seguridad",
    weight: 12,
    terms: [
      "robo",
      "asalto",
      "portonazo",
      "balacera",
      "homicidio",
      "detenido",
      "carabineros",
      "pdi",
      "narco",
      "encerrona",
    ],
  },
  {
    label: "Dinero / bolsillo",
    weight: 11,
    terms: [
      "bono",
      "ife",
      "subsidio",
      "sueldo",
      "precio",
      "alza",
      "gratis",
      "pago",
      "afp",
      "retiro",
      "deuda",
      "remate",
    ],
  },
  {
    label: "Emoción / historia humana",
    weight: 10,
    terms: [
      "emotivo",
      "conmovedor",
      "héroe",
      "heroe",
      "rescate",
      "milagro",
      "perro",
      "mascota",
      "abuelo",
      "abuela",
      "niño",
      "nino",
    ],
  },
  {
    label: "Insólito / curioso",
    weight: 9,
    terms: [
      "insólito",
      "insolito",
      "increíble",
      "increible",
      "sorprende",
      "récord",
      "record",
      "extraño",
      "extrano",
      "ovni",
    ],
  },
  {
    label: "Clima / emergencia",
    weight: 8,
    terms: [
      "sismo",
      "terremoto",
      "incendio",
      "alerta",
      "tormenta",
      "marejadas",
      "calor",
      "frío",
      "frio",
      "lluvia",
      "evacuación",
      "evacuacion",
    ],
  },
];

function normalize(text: string): string {
  return text.toLowerCase();
}

export function scoreNews(input: ScoreInput): ScoreResult {
  const signals: string[] = [];
  let score = 0;

  const haystack = normalize(`${input.title} ${input.summary ?? ""}`);

  // 1) Peso de la fuente (hasta 15 pts). Una fuente confiable/relevante suma.
  const sourceWeight = clamp(input.sourceWeight ?? 50, 0, 100);
  score += Math.round((sourceWeight / 100) * 15);

  // 2) Frescura (hasta 25 pts). Lo reciente vale más.
  const ageHours = hoursSince(input.publishedAt);
  if (ageHours !== null) {
    if (ageHours <= 3) {
      score += 25;
      signals.push("Muy reciente (<3 h)");
    } else if (ageHours <= 12) {
      score += 18;
      signals.push("Reciente (<12 h)");
    } else if (ageHours <= 24) {
      score += 12;
      signals.push("Del día (<24 h)");
    } else if (ageHours <= 48) {
      score += 6;
    } else {
      signals.push("Antigua (>48 h)");
    }
  }

  // 3) Temáticas virales por keywords (cada categoría suma una vez).
  for (const group of SIGNAL_KEYWORDS) {
    if (group.terms.some((t) => haystack.includes(t))) {
      score += group.weight;
      signals.push(group.label);
    }
  }

  // 4) Características del titular (hasta ~15 pts).
  const title = input.title.trim();

  if (/\d/.test(title)) {
    score += 4;
    signals.push("Incluye cifras");
  }
  if (/[?¿]/.test(title)) {
    score += 4;
    signals.push("Formato pregunta");
  }
  if (/[!¡]/.test(title)) {
    score += 3;
    signals.push("Tono enfático");
  }
  // Superlativos / palabras gancho
  if (
    /(el más|la más|lo más|histórico|historico|primera vez|nunca antes|así|mira|video|imágenes|imagenes)/i.test(
      title
    )
  ) {
    score += 4;
    signals.push("Gancho/superlativo");
  }

  // Largo del titular: ni muy corto ni kilométrico.
  const words = title.split(/\s+/).filter(Boolean).length;
  if (words >= 6 && words <= 16) {
    score += 3;
  } else if (words > 24) {
    score -= 3;
    signals.push("Titular demasiado largo");
  }

  // 5) Penalización: temas que rinden poco en video corto.
  if (
    /(licitación|licitacion|nombramiento|acta|reunión|reunion|comunicado oficial|balance trimestral)/i.test(
      haystack
    )
  ) {
    score -= 8;
    signals.push("Tema árido para video");
  }

  if (signals.length === 0) {
    signals.push("Sin señales fuertes");
  }

  return { score: clamp(score, 0, 100), signals: dedupe(signals) };
}

function hoursSince(value?: string | Date | null): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
