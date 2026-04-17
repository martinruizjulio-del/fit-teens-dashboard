import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, Filter } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

export default function Publico() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [sexo, setSexo] = useState<string>("all");
  const [curso, setCurso] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.rpc("get_stats_publicas_filtradas", { _sexo: sexo, _curso: curso })
      .then(({ data }) => {
        setStats(data);
        setLoading(false);
      });
  }, [sexo, curso]);

  if (!stats) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="container py-12 flex-1 text-center text-muted-foreground">{t("common.loading")}</main>
        <SiteFooter />
      </div>
    );
  }

  // Valor de referencia (≈ percentil alto esperable) para normalizar cada prueba a una escala 0-100.
  // Así pruebas con escalas dispares (Cooper en m, Wells en cm, Sprint en s...) se ven comparables.
  const eurofitRaw = [
    { prueba: "Wells",         media: stats.eurofit?.wells,   dt: stats.eurofit?.wells_dt,   unidad: "cm",  ref: 30 },
    { prueba: "Salto vertical",media: stats.eurofit?.salto,   dt: stats.eurofit?.salto_dt,   unidad: "cm",  ref: 40 },
    { prueba: "Abdominales",   media: stats.eurofit?.abdo,    dt: stats.eurofit?.abdo_dt,    unidad: "reps",ref: 40 },
    { prueba: "Lanz. hombros", media: stats.eurofit?.lanz,    dt: stats.eurofit?.lanz_dt,    unidad: "m",   ref: 8 },
    { prueba: "Sprint 50m",    media: stats.eurofit?.sprint,  dt: stats.eurofit?.sprint_dt,  unidad: "s",   ref: 10 },
    { prueba: "Cooper",        media: stats.eurofit?.cooper,  dt: stats.eurofit?.cooper_dt,  unidad: "m",   ref: 2500 },
  ];
  const cfsRaw = [
    { prueba: "Thomas",     media: stats.cfs?.thomas,    dt: stats.cfs?.thomas_dt,    unidad: "°",  ref: 20 },
    { prueba: "Biering-S.", media: stats.cfs?.biering,   dt: stats.cfs?.biering_dt,   unidad: "s",  ref: 180 },
    { prueba: "SJ",         media: stats.cfs?.sj,        dt: stats.cfs?.sj_dt,        unidad: "cm", ref: 35 },
    { prueba: "CMJ",        media: stats.cfs?.cmj,       dt: stats.cfs?.cmj_dt,        unidad: "cm", ref: 40 },
    { prueba: "Lanz. der.", media: stats.cfs?.lanz_der,  dt: stats.cfs?.lanz_der_dt,  unidad: "m",  ref: 8 },
    { prueba: "Sprint 30m", media: stats.cfs?.sprint30,  dt: stats.cfs?.sprint30_dt,  unidad: "s",  ref: 6 },
    { prueba: "Rockport",   media: stats.cfs?.rockport,  dt: stats.cfs?.rockport_dt,  unidad: "min",ref: 18 },
  ];
  const normaliza = (d: any) => ({
    ...d,
    pct: d.media != null ? Math.min(120, (Number(d.media) / d.ref) * 100) : 0,
  });
  const eurofitData = eurofitRaw.map(normaliza);
  const cfsData = cfsRaw.map(normaliza);

  const radar = [
    { capacidad: "Flexibilidad", eurofit: (stats.eurofit?.wells ?? 0) / 4, cfs: 10 - (stats.cfs?.thomas ?? 0) / 3 },
    { capacidad: "Salto", eurofit: (stats.eurofit?.salto ?? 0) / 5, cfs: (stats.cfs?.cmj ?? 0) / 5 },
    { capacidad: "Lanzamiento", eurofit: stats.eurofit?.lanz ?? 0, cfs: stats.cfs?.lanz_der ?? 0 },
    { capacidad: "Velocidad (inv)", eurofit: 12 - (stats.eurofit?.sprint ?? 9), cfs: 8 - (stats.cfs?.sprint30 ?? 5) },
    { capacidad: "Resistencia", eurofit: (stats.eurofit?.cooper ?? 2000) / 300, cfs: 18 - (stats.cfs?.rockport ?? 13) },
  ];

  const total = stats.total_alumnos ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <PublicHeader />
      <main className="container py-10 flex-1 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-secondary" /> {t("nav.public")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("publico.summary", { count: total })}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground mr-2">
              <Filter className="h-4 w-4 text-primary" /> {t("publico.filters")}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("publico.filterSex")}</Label>
              <Select value={sexo} onValueChange={setSexo}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("publico.all")}</SelectItem>
                  <SelectItem value="M">{t("common.male")}</SelectItem>
                  <SelectItem value="F">{t("common.female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("publico.filterGrade")}</Label>
              <Select value={curso} onValueChange={setCurso}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("publico.all")}</SelectItem>
                  <SelectItem value="1ESO">1º ESO</SelectItem>
                  <SelectItem value="2ESO">2º ESO</SelectItem>
                  <SelectItem value="3ESO">3º ESO</SelectItem>
                  <SelectItem value="4ESO">4º ESO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading && <span className="text-xs text-muted-foreground self-center">{t("common.loading")}</span>}
          </CardContent>
        </Card>

        {total === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">{t("publico.noResults")}</CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Medias batería Eurofit</CardTitle>
                  <p className="text-xs text-muted-foreground">Normalizado (% sobre valor de referencia) para comparar pruebas con escalas distintas. Valor real en el tooltip.</p>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={eurofitData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="prueba" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis domain={[0, 120]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(_v: any, _n, p) => {
                          const d: any = p.payload;
                          return [`${Number(d.media ?? 0).toFixed(2)} ${d.unidad} (${Number(d.pct).toFixed(0)}% ref ${d.ref})`, "Media"];
                        }}
                      />
                      <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Medias batería CFS</CardTitle>
                  <p className="text-xs text-muted-foreground">Normalizado (% sobre valor de referencia) para comparar pruebas con escalas distintas. Valor real en el tooltip.</p>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={cfsData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="prueba" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis domain={[0, 120]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(_v: any, _n, p) => {
                          const d: any = p.payload;
                          return [`${Number(d.media ?? 0).toFixed(2)} ${d.unidad} (${Number(d.pct).toFixed(0)}% ref ${d.ref})`, "Media"];
                        }}
                      />
                      <Bar dataKey="pct" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Comparativa de capacidades (Eurofit vs CFS)</CardTitle></CardHeader>
              <CardContent style={{ height: 360 }}>
                <ResponsiveContainer>
                  <RadarChart data={radar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="capacidad" />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                    <Radar dataKey="eurofit" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Eurofit" />
                    <Radar dataKey="cfs" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.3} name="CFS" />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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
