// Tipos compartidos por toda la app.

export type NewsStatus =
  | "nueva"
  | "seleccionada"
  | "descartada"
  | "guion_generado";

export const NEWS_STATUSES: NewsStatus[] = [
  "nueva",
  "seleccionada",
  "descartada",
  "guion_generado",
];

export const STATUS_LABELS: Record<NewsStatus, string> = {
  nueva: "Nueva",
  seleccionada: "Seleccionada",
  descartada: "Descartada",
  guion_generado: "Guion generado",
};

// Salida estructurada del botón "Generar lead".
export interface Lead {
  gancho: string; // hook de apertura
  angulo: string; // ángulo editorial
  porQueFunciona: string; // por qué puede funcionar
  formato: string; // formato recomendado (Short, Reel, etc.)
  advertencias: string; // advertencias legales/reputacionales
}

export interface Source {
  id: string;
  name: string;
  url: string;
  category: string | null;
  active: boolean;
  weight: number;
  last_fetched_at: string | null;
  created_at: string;
}

export interface NewsItem {
  id: string;
  source_id: string | null;
  source_name: string | null;
  title: string;
  url: string;
  published_at: string | null;
  category: string | null;
  summary: string | null;
  signals: string[];
  score: number;
  status: NewsStatus;
  lead: Lead | null;
  script: string | null;
  created_at: string;
  updated_at: string;
}
