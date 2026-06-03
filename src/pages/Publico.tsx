import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BarChart3, Filter } from "lucide-react";

type StatItem = {
  prueba: string;
  media: number | null | undefined;
  dt?: number | null | undefined;
  unidad: string;
  ref: number;
  pct: number;
};

type RadarItem = {
  capacidad: string;
  eurofit: number;
  cfs: number;
};

export default function Publico() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [sexo, setSexo] = useState<string>("all");
  const [cursos, setCursos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [evalNombres, setEvalNombres] = useState<string[]>([]);
  const [evaluacion, setEvaluacion] = useState<string>("all");
  const [configCargada, setConfigCargada] = useState(false);

  const cursoParam = cursos.length === 0 ? "all" : cursos.join(",");

  // Cargar config pública + lista de evaluaciones, fijando la evaluación por defecto
  useEffect(() => {
    void Promise.all([
      supabase.from("config_publica").select("*").maybeSingle(),
      supabase.rpc("get_evaluaciones_nombres"),
    ]).then(([{ data: cfg }, { data: nombres }]) => {
      setConfig(cfg);
      setEvalNombres(((nombres as string[]) ?? []));
      if (cfg?.evaluacion_default_nombre) setEvaluacion(cfg.evaluacion_default_nombre);
      setConfigCargada(true);
    });
  }, []);

  useEffect(() => {
    if (!configCargada) return;
    setLoading(true);
    supabase
      .rpc("get_stats_publicas_filtradas", { _sexo: sexo, _curso: cursoParam, _evaluacion: evaluacion })
      .then(({ data }) => {
        setStats(data);
        setLoading(false);
      });
  }, [sexo, cursoParam, evaluacion, configCargada]);


  const eurofitData = useMemo<StatItem[]>(() => {
    if (!stats) return [];

    const raw = [
      { prueba: "Wells", media: stats.eurofit?.wells, dt: stats.eurofit?.wells_dt, unidad: "cm", ref: 30 },
      { prueba: "Salto vertical", media: stats.eurofit?.salto, dt: stats.eurofit?.salto_dt, unidad: "cm", ref: 40 },
      { prueba: "Abdominales", media: stats.eurofit?.abdo, dt: stats.eurofit?.abdo_dt, unidad: "reps", ref: 40 },
      { prueba: "Lanz. hombros", media: stats.eurofit?.lanz, dt: stats.eurofit?.lanz_dt, unidad: "m", ref: 8 },
      { prueba: "Sprint 50m", media: stats.eurofit?.sprint, dt: stats.eurofit?.sprint_dt, unidad: "s", ref: 10 },
      { prueba: "Cooper", media: stats.eurofit?.cooper, dt: stats.eurofit?.cooper_dt, unidad: "m", ref: 2500 },
    ];

    return raw.map((d) => ({
      ...d,
      pct: d.media != null ? Math.min(120, (Number(d.media) / d.ref) * 100) : 0,
    }));
  }, [stats]);

  const cfsData = useMemo<StatItem[]>(() => {
    if (!stats) return [];

    const lanzDer = stats.cfs?.lanz_der;
    const lanzIzq = stats.cfs?.lanz_izq;
    const lanzMedia =
      lanzDer != null && lanzIzq != null
        ? (Number(lanzDer) + Number(lanzIzq)) / 2
        : lanzDer ?? lanzIzq ?? null;

    const raw = [
      { prueba: "Thomas", media: stats.cfs?.thomas, dt: stats.cfs?.thomas_dt, unidad: "°", ref: 20 },
      { prueba: "Biering-S.", media: stats.cfs?.biering, dt: stats.cfs?.biering_dt, unidad: "s", ref: 180 },
      { prueba: "Índice elástico", media: stats.cfs?.indice_elastico, dt: stats.cfs?.indice_elastico_dt, unidad: "%", ref: 10 },
      { prueba: "Lanz. unilateral (media)", media: lanzMedia, dt: stats.cfs?.lanz_der_dt, unidad: "m", ref: 8 },
      { prueba: "Sprint 30m", media: stats.cfs?.sprint30, dt: stats.cfs?.sprint30_dt, unidad: "s", ref: 6 },
      { prueba: "Rockport", media: stats.cfs?.rockport, dt: stats.cfs?.rockport_dt, unidad: "min", ref: 18 },
    ];

    return raw.map((d) => ({
      ...d,
      pct: d.media != null ? Math.min(120, (Number(d.media) / d.ref) * 100) : 0,
    }));
  }, [stats]);

  const radar = useMemo<RadarItem[]>(() => {
    if (!stats) return [];

    return [
      { capacidad: "Flexibilidad", eurofit: (stats.eurofit?.wells ?? 0) / 4, cfs: 10 - (stats.cfs?.thomas ?? 0) / 3 },
      { capacidad: "Salto", eurofit: (stats.eurofit?.salto ?? 0) / 5, cfs: (stats.cfs?.cmj ?? 0) / 5 },
      { capacidad: "Lanzamiento", eurofit: stats.eurofit?.lanz ?? 0, cfs: stats.cfs?.lanz_der ?? 0 },
      { capacidad: "Velocidad", eurofit: 12 - (stats.eurofit?.sprint ?? 9), cfs: 8 - (stats.cfs?.sprint30 ?? 5) },
      { capacidad: "Resistencia", eurofit: (stats.eurofit?.cooper ?? 2000) / 300, cfs: 18 - (stats.cfs?.rockport ?? 13) },
    ].map((item) => ({
      ...item,
      eurofit: clamp(item.eurofit, 0, 10),
      cfs: clamp(item.cfs, 0, 10),
    }));
  }, [stats]);

  if (!stats) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="container py-12 flex-1 text-center text-muted-foreground">{t("common.loading")}</main>
        <SiteFooter />
      </div>
    );
  }

  const total = stats.total_alumnos ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <PublicHeader />
      <main className="container py-10 flex-1 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-secondary" /> {t("nav.public")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("publico.summary", { count: total })}</p>
        </div>

        {(config?.periodo_destacado_label || config?.periodo_destacado_fecha) && (
          <Card className="border-primary/40 bg-gradient-primary/10">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5 text-primary" />
                <div>
                  {config.periodo_destacado_label && (
                    <p className="font-display font-semibold text-foreground">{config.periodo_destacado_label}</p>
                  )}
                  {config.periodo_destacado_fecha && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(config.periodo_destacado_fecha).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {config.evaluacion_default_nombre && (
                <span className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground">
                  Evaluación: {config.evaluacion_default_nombre}
                </span>
              )}
            </CardContent>
          </Card>
        )}


        <Card>
          <CardContent className="p-4 flex flex-wrap items-start gap-6">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4 text-primary" /> {t("publico.filters")}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("publico.filterSex")}</Label>
              <RadioGroup value={sexo} onValueChange={setSexo} className="flex flex-wrap gap-3">
                {[
                  { v: "all", l: t("publico.all") },
                  { v: "M", l: t("common.male") },
                  { v: "F", l: t("common.female") },
                ].map((o) => (
                  <label key={o.v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <RadioGroupItem value={o.v} id={`sexo-${o.v}`} />
                    <span>{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("publico.filterGrade")}</Label>
              <div className="flex flex-wrap gap-3">
                {[
                  { v: "1ESO", l: "1º ESO" },
                  { v: "2ESO", l: "2º ESO" },
                  { v: "3ESO", l: "3º ESO" },
                  { v: "4ESO", l: "4º ESO" },
                ].map((o) => {
                  const checked = cursos.includes(o.v);
                  return (
                    <label key={o.v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        id={`curso-${o.v}`}
                        checked={checked}
                        onCheckedChange={(v) =>
                          setCursos((prev) =>
                            v ? [...prev, o.v] : prev.filter((c) => c !== o.v),
                          )
                        }
                      />
                      <span>{o.l}</span>
                    </label>
                  );
                })}
                {cursos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCursos([])}
                    className="text-xs text-muted-foreground underline self-center"
                  >
                    {t("publico.all")}
                  </button>
                )}
              </div>
            </div>
            {loading && <span className="text-xs text-muted-foreground self-center">{t("common.loading")}</span>}
          </CardContent>
        </Card>

        {total === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">{t("publico.noResults")}</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <NotaGlobalCard titulo="Nota global CFS" nota={stats.nota_cfs} colorVar="--secondary" />
              <NotaGlobalCard titulo="Nota global Eurofit" nota={stats.nota_eurofit} colorVar="--primary" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <NormalizedBarsCard
                title="Medias batería CFS"
                description="Normalizado (% sobre valor de referencia) para comparar pruebas con escalas distintas. Valor real visible junto a cada barra."
                data={cfsData}
                colorVar="--secondary"
              />
              <NormalizedBarsCard
                title="Medias batería Eurofit"
                description="Normalizado (% sobre valor de referencia) para comparar pruebas con escalas distintas. Valor real visible junto a cada barra."
                data={eurofitData}
                colorVar="--primary"
              />
            </div>

            <CapabilityRadarCard data={radar} />

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Antropometría media</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="IMC" value={stats.antropometria?.imc} dt={stats.antropometria?.imc_dt} />
                <Stat label="Envergadura (cm)" value={stats.antropometria?.env} dt={stats.antropometria?.env_dt} />
                <Stat label="Biacromial (cm)" value={stats.antropometria?.bia} dt={stats.antropometria?.bia_dt} />
                <Stat label="Long. pierna (cm)" value={stats.antropometria?.pierna} dt={stats.antropometria?.pierna_dt} />
              </CardContent>
            </Card>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4 border-t">
          Datos agregados anónimos. Baremos provisionales basados en Eurofit (Council of Europe, 1988) y ALPHA-Fitness (Ruiz et al., 2011).
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function NormalizedBarsCard({
  title,
  description,
  data,
  colorVar,
}: {
  title: string;
  description: string;
  data: StatItem[];
  colorVar: "--primary" | "--secondary";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item) => (
          <div key={item.prueba} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{item.prueba}</span>
              <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                {item.media != null ? `${Number(item.media).toFixed(2)} ${item.unidad}` : "—"}
                {item.dt != null ? ` ± ${Number(item.dt).toFixed(2)}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(item.pct, 100)}%`,
                    backgroundColor: `hsl(var(${colorVar}))`,
                  }}
                />
              </div>
              <span className="w-12 text-right text-xs font-mono text-muted-foreground">{Math.round(item.pct)}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CapabilityRadarCard({ data }: { data: RadarItem[] }) {
  const size = 320;
  const center = size / 2;
  const radius = 112;
  const levels = 5;
  const maxValue = 10;

  const eurofitPoints = data
    .map((item, index) => pointForValue(index, data.length, item.eurofit, maxValue, center, radius))
    .join(" ");
  const cfsPoints = data
    .map((item, index) => pointForValue(index, data.length, item.cfs, maxValue, center, radius))
    .join(" ");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Comparativa de capacidades (Eurofit vs CFS)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] items-center">
        <div className="mx-auto w-full max-w-[360px]">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" role="img" aria-label="Comparativa de capacidades Eurofit y CFS">
            {Array.from({ length: levels }, (_, levelIndex) => {
              const currentRadius = (radius * (levelIndex + 1)) / levels;
              const polygon = data
                .map((_, index) => pointForRadius(index, data.length, center, currentRadius))
                .join(" ");

              return (
                <polygon
                  key={currentRadius}
                  points={polygon}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                />
              );
            })}

            {data.map((item, index) => {
              const [x, y] = pointTuple(index, data.length, center, radius + 24);
              return (
                <g key={item.capacidad}>
                  <line
                    x1={center}
                    y1={center}
                    x2={pointTuple(index, data.length, center, radius)[0]}
                    y2={pointTuple(index, data.length, center, radius)[1]}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor={x < center - 8 ? "end" : x > center + 8 ? "start" : "middle"}
                    dominantBaseline={y < center ? "auto" : "hanging"}
                    fontSize="12"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {item.capacidad}
                  </text>
                </g>
              );
            })}

            <polygon
              points={eurofitPoints}
              fill="hsl(var(--primary))"
              fillOpacity="0.22"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
            <polygon
              points={cfsPoints}
              fill="hsl(var(--secondary))"
              fillOpacity="0.22"
              stroke="hsl(var(--secondary))"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <LegendItem label="Eurofit" colorVar="--primary" />
          <LegendItem label="CFS" colorVar="--secondary" />
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            {data.map((item) => (
              <div key={item.capacidad} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
                <span className="text-foreground">{item.capacidad}</span>
                <span className="font-mono" style={{ color: "hsl(var(--primary))" }}>{item.eurofit.toFixed(1)}</span>
                <span className="font-mono" style={{ color: "hsl(var(--secondary))" }}>{item.cfs.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendItem({ label, colorVar }: { label: string; colorVar: "--primary" | "--secondary" }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className="h-3 w-3 rounded-sm"
        style={{ backgroundColor: `hsl(var(${colorVar}))` }}
        aria-hidden="true"
      />
      <span className="text-foreground">{label}</span>
    </div>
  );
}

function pointForValue(
  index: number,
  total: number,
  value: number,
  maxValue: number,
  center: number,
  radius: number,
) {
  const [x, y] = pointTuple(index, total, center, (radius * value) / maxValue);
  return `${x},${y}`;
}

function pointForRadius(index: number, total: number, center: number, radius: number) {
  const [x, y] = pointTuple(index, total, center, radius);
  return `${x},${y}`;
}

function pointTuple(index: number, total: number, center: number, radius: number): [number, number] {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Stat({ label, value, dt }: { label: string; value: any; dt?: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold font-mono">
        {value != null ? Number(value).toFixed(2) : "—"}
        {dt != null && <span className="text-muted-foreground font-normal"> ± {Number(dt).toFixed(2)}</span>}
      </p>
    </div>
  );
}

function NotaGlobalCard({ titulo, nota, colorVar }: { titulo: string; nota: any; colorVar: "--primary" | "--secondary" }) {
  const n = nota != null ? Number(nota) : null;
  const pct = n != null ? Math.max(0, Math.min(100, (n / 10) * 100)) : 0;
  const calificacion = n == null ? "—" : n >= 9 ? "Excelente" : n >= 7 ? "Notable" : n >= 5 ? "Aprobado" : "Mejorable";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-5xl font-bold" style={{ color: `hsl(var(${colorVar}))` }}>
            {n != null ? n.toFixed(2) : "—"}
          </span>
          <span className="text-muted-foreground text-sm">/ 10</span>
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-md bg-muted">{calificacion}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: `hsl(var(${colorVar}))` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Media de las notas (1-10) de cada prueba realizada, calculadas según baremos por edad y sexo.
        </p>
      </CardContent>
    </Card>
  );
}
