import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Database, Trash2, Wand2, Save, BookOpen, FileDown, Award, UserCog, ExternalLink, LogIn, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { generarEvidenciasPDF } from "@/lib/evidencias-pdf";
import { ImpersonationPanel } from "@/components/ImpersonationPanel";

export default function Admin() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();

  const [config, setConfig] = useState<any>(null);
  const [baremos, setBaremos] = useState<any[]>([]);
  const [bSel, setBSel] = useState({ bateria: "eurofit", prueba: "wells" });
  const [procs, setProcs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      supabase.from("config_publica").select("*").maybeSingle().then(({ data }) => setConfig(data)),
      supabase.from("baremos").select("*").order("sexo").order("edad_min").order("nota").then(({ data }) => setBaremos(data ?? [])),
      supabase.from("procedimientos").select("*").order("bateria").order("prueba").then(({ data }) => setProcs(data ?? [])),
    ]);
  }, []);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/app" replace />;

  async function guardarConfig() {
    if (!config) return;
    const { error } = await supabase.from("config_publica").update({
      mostrar_eurofit: config.mostrar_eurofit,
      mostrar_cfs: config.mostrar_cfs,
      mostrar_antropometria: config.mostrar_antropometria,
      mostrar_por_curso: config.mostrar_por_curso,
      mostrar_por_sexo: config.mostrar_por_sexo,
      idioma_default: config.idioma_default,
    }).eq("id", config.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "Configuración guardada" });
  }

  async function guardarAutoresYPolitica() {
    if (!config) return;
    const { error } = await supabase.from("config_publica").update({
      autores: config.autores,
      politica_privacidad_md: config.politica_privacidad_md,
      manual_uso_md: config.manual_uso_md,
    }).eq("id", config.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "Autores y política guardados" });
  }

  async function generarDemo() {
    if (!confirm("Esto creará el centro IES Demo Lovable y 100 alumnos demo. ¿Continuar?")) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_seed_demo");
    setBusy(false);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: data as string });
  }

  async function borrarDemo() {
    if (!confirm("Eliminar TODOS los datos demo (centros, grupos, alumnos y pruebas marcados como demo). ¿Continuar?")) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_borrar_demo");
    setBusy(false);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: data as string });
  }

  const baremosFiltrados = baremos.filter((b) => b.bateria === bSel.bateria && b.prueba === bSel.prueba);
  const pruebasUnicas = Array.from(new Set(baremos.filter((b) => b.bateria === bSel.bateria).map((b) => b.prueba)));

  async function actualizarBaremo(id: string, campo: "valor_min" | "valor_max", v: string) {
    const num = v === "" ? null : Number(v);
    const update: any = { [campo]: num };
    const { error } = await supabase.from("baremos").update(update).eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      setBaremos((prev) => prev.map((b) => b.id === id ? { ...b, [campo]: num } : b));
    }
  }

  async function descargarEvidencias() {
    setBusy(true);
    try {
      const [statsR, centrosR, alumnosR, profesR, eurR, cfsR] = await Promise.all([
        supabase.rpc("get_stats_publicas_filtradas", { _sexo: "all", _curso: "all" }),
        supabase.from("centros").select("nombre, provincia, ciudad, anonimo, codigo_anonimo").eq("mostrar_publico", true).order("provincia"),
        supabase.from("alumnos").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("pruebas_eurofit").select("id", { count: "exact", head: true }),
        supabase.from("pruebas_cfs").select("id", { count: "exact", head: true }),
      ]);
      const stats: any = statsR.data ?? {};

      // Captura del dashboard público vía iframe oculto
      let capturaSelector: string | undefined;
      const iframe = document.createElement("iframe");
      iframe.src = `${window.location.origin}/publico`;
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1280px;height:1800px;border:0;";
      document.body.appendChild(iframe);
      await new Promise<void>((resolve) => {
        iframe.onload = () => setTimeout(resolve, 2500);
      });
      try {
        const node = iframe.contentDocument?.querySelector("main");
        if (node) {
          (node as HTMLElement).id = "evidencias-capture";
          // Inyectamos el nodo capturado como hijo temporal del propio doc para html2canvas
          const clone = node.cloneNode(true) as HTMLElement;
          clone.id = "evidencias-capture-clone";
          clone.style.cssText = "position:fixed;left:-9999px;top:0;width:1280px;background:#fff;";
          document.body.appendChild(clone);
          capturaSelector = "#evidencias-capture-clone";
        }
      } catch (e) {
        console.warn("No se pudo acceder al iframe", e);
      }

      await generarEvidenciasPDF({
        autores: config?.autores ?? "Julio Martín-Ruiz",
        totalAlumnos: alumnosR.count ?? 0,
        totalCentros: (centrosR.data ?? []).length,
        totalProfesores: profesR.count ?? 0,
        totalPruebas: (eurR.count ?? 0) + (cfsR.count ?? 0),
        eurofit: stats.eurofit,
        cfs: stats.cfs,
        antropometria: stats.antropometria,
        centros: centrosR.data ?? [],
        capturaSelector,
        urlPublica: `${window.location.origin}/publico`,
      });

      // Limpieza
      document.getElementById("evidencias-capture-clone")?.remove();
      iframe.remove();
      toast({ title: "PDF de evidencias generado" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error generando PDF", description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function guardarProc(p: any) {
    const { error } = await supabase.from("procedimientos").update({
      procedimiento_md: p.procedimiento_md, referencia_apa: p.referencia_apa,
    }).eq("id", p.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "Procedimiento guardado" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-secondary" /> {t("nav.admin")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Panel de administración global.</p>
      </div>

      <Tabs defaultValue="demo">
        <TabsList>
          <TabsTrigger value="demo"><Database className="h-4 w-4 mr-1.5" /> Datos demo</TabsTrigger>
          <TabsTrigger value="config">Página pública</TabsTrigger>
          <TabsTrigger value="autores">Autores y política</TabsTrigger>
          <TabsTrigger value="evidencias"><Award className="h-4 w-4 mr-1.5" /> Evidencias CV</TabsTrigger>
          <TabsTrigger value="baremos">Baremos</TabsTrigger>
          <TabsTrigger value="procs"><BookOpen className="h-4 w-4 mr-1.5" /> Procedimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="evidencias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-secondary" /> PDF de evidencias para CV
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Genera un documento PDF oficial con: estadísticas globales agregadas, captura del panel público, listado de centros adheridos y certificado de uso firmado con tu autoría.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm space-y-1.5 text-muted-foreground list-disc pl-5">
                <li>Portada con certificado y resumen de impacto (centros, profesores, alumnos, pruebas)</li>
                <li>Tablas de medias y desviación típica de Eurofit, CFS y antropometría</li>
                <li>Captura automática del panel público de estadísticas</li>
                <li>Listado completo de centros adheridos (anonimizados cuando proceda)</li>
                <li>Enlace permanente de verificación pública</li>
              </ul>
              <Button onClick={descargarEvidencias} disabled={busy} className="bg-gradient-energy text-secondary-foreground shadow-energy">
                <FileDown className="h-4 w-4 mr-1.5" /> {busy ? "Generando…" : "Descargar PDF de evidencias"}
              </Button>
              <p className="text-xs text-muted-foreground">La generación tarda unos segundos porque incluye una captura real del panel público.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Generar / borrar 100 alumnos demo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Los alumnos demo se asignan a un centro independiente ("IES Demo Lovable") con 4 grupos de 25 alumnos.
                Aparecen en las estadísticas públicas y en tu panel, pero pueden borrarse en cualquier momento.
              </p>
              <div className="flex gap-2">
                <Button onClick={generarDemo} disabled={busy} className="bg-gradient-energy text-secondary-foreground shadow-energy">
                  <Wand2 className="h-4 w-4 mr-1.5" /> Generar 100 alumnos demo
                </Button>
                <Button onClick={borrarDemo} disabled={busy} variant="destructive">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Borrar todos los demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Visibilidad de la página pública</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <>
                  <Toggle label="Mostrar batería Eurofit" v={config.mostrar_eurofit} on={(v) => setConfig({ ...config, mostrar_eurofit: v })} />
                  <Toggle label="Mostrar batería CFS" v={config.mostrar_cfs} on={(v) => setConfig({ ...config, mostrar_cfs: v })} />
                  <Toggle label="Mostrar antropometría" v={config.mostrar_antropometria} on={(v) => setConfig({ ...config, mostrar_antropometria: v })} />
                  <Toggle label="Comparativas por curso" v={config.mostrar_por_curso} on={(v) => setConfig({ ...config, mostrar_por_curso: v })} />
                  <Toggle label="Comparativas por sexo" v={config.mostrar_por_sexo} on={(v) => setConfig({ ...config, mostrar_por_sexo: v })} />
                  <div className="space-y-1.5 max-w-xs">
                    <Label>Idioma por defecto</Label>
                    <Select value={config.idioma_default} onValueChange={(v) => setConfig({ ...config, idioma_default: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="val">Valencià</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={guardarConfig}><Save className="h-4 w-4 mr-1.5" /> Guardar</Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autores" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Autores y política de privacidad</CardTitle>
              <p className="text-xs text-muted-foreground">El nombre de los autores aparece en el footer y en el certificado del PDF de evidencias.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <>
                  <div className="space-y-1.5">
                    <Label>Autor / autores de la aplicación</Label>
                    <Input
                      value={config.autores ?? ""}
                      onChange={(e) => setConfig({ ...config, autores: e.target.value })}
                      placeholder="Julio Martín-Ruiz"
                      maxLength={300}
                    />
                    <p className="text-xs text-muted-foreground">Aparece en el footer público y en los informes oficiales.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Política de privacidad (Markdown)</Label>
                    <Textarea
                      rows={10}
                      value={config.politica_privacidad_md ?? ""}
                      onChange={(e) => setConfig({ ...config, politica_privacidad_md: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Se muestra en el popup al registrarse y en el enlace del consentimiento.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Manual de uso (Markdown — solo backup interno)</Label>
                    <Textarea
                      rows={6}
                      value={config.manual_uso_md ?? ""}
                      onChange={(e) => setConfig({ ...config, manual_uso_md: e.target.value })}
                    />
                  </div>
                  <Button onClick={guardarAutoresYPolitica}><Save className="h-4 w-4 mr-1.5" /> Guardar</Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="baremos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Baremos provisionales</CardTitle>
              <p className="text-xs text-muted-foreground">Eurofit (Council of Europe, 1988) + ALPHA-Fitness (Ruiz et al., 2011). Edita los valores umbral por nota.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Select value={bSel.bateria} onValueChange={(v) => setBSel({ bateria: v, prueba: "" })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eurofit">Eurofit</SelectItem>
                    <SelectItem value="cfs">CFS</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bSel.prueba} onValueChange={(v) => setBSel({ ...bSel, prueba: v })}>
                  <SelectTrigger className="w-60"><SelectValue placeholder="Selecciona prueba" /></SelectTrigger>
                  <SelectContent>
                    {pruebasUnicas.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr><th className="py-2 text-left">Sexo</th><th>Edad</th><th>Nota</th><th>Valor mín.</th><th>Valor máx.</th><th>Mejor =</th></tr>
                  </thead>
                  <tbody>
                    {baremosFiltrados.map((b) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-1.5">{b.sexo}</td>
                        <td className="text-center">{b.edad_min}-{b.edad_max}</td>
                        <td className="text-center font-bold">{b.nota}</td>
                        <td><Input type="number" step="0.01" defaultValue={b.valor_min ?? ""} onBlur={(e) => actualizarBaremo(b.id, "valor_min", e.target.value)} className="h-8" /></td>
                        <td><Input type="number" step="0.01" defaultValue={b.valor_max ?? ""} onBlur={(e) => actualizarBaremo(b.id, "valor_max", e.target.value)} className="h-8" /></td>
                        <td className="text-xs">{b.higher_better ? "Mayor" : "Menor"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procs" className="mt-4 space-y-4">
          {procs.map((p) => (
            <Card key={p.id}>
              <CardHeader><CardTitle className="text-base font-display">{p.bateria.toUpperCase()} · {p.prueba}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label>Procedimiento (Markdown)</Label>
                  <Textarea defaultValue={p.procedimiento_md} rows={4} onBlur={(e) => { p.procedimiento_md = e.target.value; }} />
                </div>
                <div className="space-y-1">
                  <Label>Referencia APA</Label>
                  <Textarea defaultValue={p.referencia_apa} rows={2} onBlur={(e) => { p.referencia_apa = e.target.value; }} />
                </div>
                <Button size="sm" onClick={() => guardarProc(p)}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={v} onCheckedChange={on} />
    </div>
  );
}
