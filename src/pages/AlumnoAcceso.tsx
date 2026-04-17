import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PublicHeader } from "@/components/PublicHeader";
import { GraduationCap, KeyRound, FileDown } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from "recharts";
import { PRUEBAS_EUROFIT, PRUEBAS_CFS, NOMBRE_PRUEBA, calcularEdad, valorParaBaremo, formateaValor } from "@/lib/pruebas";
import { generarInformePDF } from "@/lib/pdf";

export default function AlumnoAcceso() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { codigo: codigoParam } = useParams();
  const { toast } = useToast();
  const [codigo, setCodigo] = useState(codigoParam ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [notas, setNotas] = useState<Record<string, number | null>>({});
  const [procedimientos, setProcedimientos] = useState<any[]>([]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!codigo.trim()) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("get_alumno_by_codigo", {
        _codigo: codigo.trim().toUpperCase(),
      });
      if (error) throw error;
      if (!result || !(result as any).alumno) {
        toast({ variant: "destructive", title: t("studentLogin.notFound") });
        setData(null);
        return;
      }
      const r = result as any;
      // Asegurar codigo_acceso para el PDF
      r.alumno.codigo_acceso = codigo.trim().toUpperCase();
      setData(r);
      const { data: procs } = await supabase.from("procedimientos").select("*");
      setProcedimientos(procs ?? []);
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setLoading(false);
    }
  }

  // Recalcular notas
  useEffect(() => {
    if (!data?.alumno) return;
    const edad = calcularEdad(data.alumno.fecha_nacimiento);
    const todas = [...PRUEBAS_EUROFIT, ...PRUEBAS_CFS];
    Promise.all(todas.map(async (p) => {
      const reg = p.bateria === "eurofit" ? data.eurofit : data.cfs;
      if (!reg) return [p.prueba, null] as const;
      const v = valorParaBaremo(p, reg);
      if (v == null) return [p.prueba, null] as const;
      const { data: n } = await supabase.rpc("calcular_nota", {
        _bateria: p.bateria, _prueba: p.prueba, _sexo: data.alumno.sexo, _edad: edad, _valor: v,
      });
      return [p.prueba, n as number | null] as const;
    })).then((res) => setNotas(Object.fromEntries(res)));
  }, [data]);

  async function exportar() {
    const notasEurofit: Record<string, number | null> = {};
    const notasCfs: Record<string, number | null> = {};
    PRUEBAS_EUROFIT.forEach((p) => { notasEurofit[p.prueba] = notas[p.prueba] ?? null; });
    PRUEBAS_CFS.forEach((p) => { notasCfs[p.prueba] = notas[p.prueba] ?? null; });
    await generarInformePDF({
      alumno: data.alumno, eurofit: data.eurofit, cfs: data.cfs,
      notasEurofit, notasCfs, procedimientos, radarSelector: "#alumno-radar",
    });
  }

  const radarData = data?.alumno ? [
    { cap: "Flex", v: notas.wells ?? notas.thomas ?? 0 },
    { cap: "Salto", v: notas.salto_vertical ?? notas.cmj ?? 0 },
    { cap: "Lanz", v: notas.lanz_hombros ?? notas.lanz_med_der ?? 0 },
    { cap: "Velocidad", v: notas.sprint_50 ?? notas.sprint_30 ?? 0 },
    { cap: "Core", v: notas.abdominales_60 ?? notas.biering_sorensen ?? 0 },
    { cap: "Resistencia", v: notas.cooper ?? notas.rockport ?? 0 },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <PublicHeader />
      <main className="flex-1 container py-12">
        {!data ? (
          <Card className="max-w-md mx-auto shadow-elevated animate-scale-in">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 inline-flex p-3 rounded-full bg-gradient-primary">
                <KeyRound className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="font-display">{t("studentLogin.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("studentLogin.subtitle")}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("studentLogin.code")}</Label>
                  <Input
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    className="font-mono tracking-widest text-center text-lg"
                    maxLength={20}
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !codigo.trim()}>
                  {t("studentLogin.enter")}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  {data.alumno.nombre} {data.alumno.apellidos}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.alumno.sexo === "M" ? "Chico" : "Chica"} · {calcularEdad(data.alumno.fecha_nacimiento)} años
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportar} variant="outline"><FileDown className="h-4 w-4 mr-1.5" /> Mi PDF</Button>
                <Button variant="ghost" onClick={() => { setData(null); setCodigo(""); navigate("/alumno", { replace: true }); }}>Salir</Button>
              </div>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base font-display">Antropometría</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Peso" value={data.alumno.peso_kg ? `${data.alumno.peso_kg} kg` : "—"} />
                <Stat label="Talla" value={data.alumno.talla_m ? `${data.alumno.talla_m} m` : "—"} />
                <Stat label="IMC" value={data.alumno.imc ?? "—"} />
                <Stat label="Envergadura" value={data.alumno.envergadura_cm ? `${data.alumno.envergadura_cm} cm` : "—"} />
              </CardContent>
            </Card>

            {data.eurofit && (
              <TablaResultados titulo="Batería Eurofit" pruebas={PRUEBAS_EUROFIT} registro={data.eurofit} notas={notas} />
            )}
            {data.cfs && (
              <TablaResultados titulo="Batería CFS" pruebas={PRUEBAS_CFS} registro={data.cfs} notas={notas} />
            )}

            <Card id="alumno-radar">
              <CardHeader><CardTitle className="text-base font-display">Mi perfil de notas</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="cap" />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} />
                    <Radar dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} name="Mis notas" />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

function TablaResultados({ titulo, pruebas, registro, notas }: any) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-display">{titulo}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2">Prueba</th>
              <th className="py-2">Resultado</th>
              <th className="py-2">Esfuerzo</th>
              <th className="py-2 text-right">Nota /10</th>
            </tr>
          </thead>
          <tbody>
            {pruebas.map((p: any) => (
              <tr key={p.prueba} className="border-b last:border-0">
                <td className="py-2 font-medium">{NOMBRE_PRUEBA[p.prueba]}</td>
                <td className="py-2 font-mono text-xs">{formateaValor(p, registro)}</td>
                <td className="py-2 text-muted-foreground">{registro[p.omniCampo] ?? "—"}</td>
                <td className="py-2 text-right font-bold">{notas[p.prueba] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
