import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { OmniRes } from "@/components/OmniRes";
import { EvaluacionSelector } from "@/components/EvaluacionSelector";
import { PRUEBAS_EUROFIT, PRUEBAS_CFS, NOMBRE_PRUEBA, CATEGORIAS, pruebasDePersonalizada, isBateriaPersonalizadaCompleta, calcularEdad, valorParaBaremo, type PruebaDef, type BateriaPersonalizada } from "@/lib/pruebas";
import { ArrowLeft, BookOpen, Save, FileDown, Sliders } from "lucide-react";
import { db } from "@/offline/db";
import { savePrueba } from "@/offline/repo";
import { useSyncStatus } from "@/offline/useSyncStatus";

import { generarInformePDF } from "@/lib/pdf";
import imgWells from "@/assets/procedimientos/wells.png";
import imgThomas from "@/assets/procedimientos/thomas.png";
import imgAbdominales from "@/assets/procedimientos/abdominales_60.png";
import imgBiering from "@/assets/procedimientos/biering_sorensen.png";
import imgSaltoVertical from "@/assets/procedimientos/salto_vertical.png";
import imgSjCmj from "@/assets/procedimientos/sj_cmj.png";
import imgLanzHombros from "@/assets/procedimientos/lanz_hombros.png";
import imgLanzMed from "@/assets/procedimientos/lanz_med.png";
import imgSprint from "@/assets/procedimientos/sprint.png";
import imgCooper from "@/assets/procedimientos/cooper.png";
import imgRockport from "@/assets/procedimientos/rockport.png";

const IMG_PROCEDIMIENTO: Record<string, string> = {
  wells: imgWells, thomas: imgThomas, abdominales_60: imgAbdominales,
  biering_sorensen: imgBiering, salto_vertical: imgSaltoVertical,
  sj: imgSjCmj, cmj: imgSjCmj, lanz_hombros: imgLanzHombros,
  lanz_med: imgLanzMed, lanz_med_der: imgLanzMed, lanz_med_izq: imgLanzMed,
  sprint_50: imgSprint, sprint_30: imgSprint, cooper: imgCooper, rockport: imgRockport,
};

export default function Pruebas() {
  const { alumnoId } = useParams();
  const { toast } = useToast();
  const sync = useSyncStatus();
  const [evaluacionId, setEvaluacionId] = useState<string | null>(null);
  const [eurofit, setEurofit] = useState<any>({});
  const [cfs, setCfs] = useState<any>({});
  const [notas, setNotas] = useState<Record<string, number | null>>({});

  // Alumno + grupo (con bateria_personalizada) desde IndexedDB
  const ctx = useLiveQuery(async () => {
    if (!alumnoId) return null;
    const a = await db.alumnos.get(alumnoId);
    if (!a) return null;
    const grupo = await db.grupos.get((a as { grupo_id: string }).grupo_id);
    return {
      alumno: a as Record<string, unknown>,
      bateriaPersonalizada: ((grupo as { bateria_personalizada?: BateriaPersonalizada } | undefined)?.bateria_personalizada ?? null) as BateriaPersonalizada | null,
    };
  }, [alumnoId], null);

  const procedimientos = (useLiveQuery(() => db.procedimientos.toArray(), [], []) ?? []) as Array<Record<string, unknown>>;

  // Cargar pruebas locales para la evaluación seleccionada
  const pruebasGuardadas = useLiveQuery(async () => {
    if (!alumnoId || !evaluacionId) return { e: null, c: null };
    const [e, c] = await Promise.all([
      db.pruebas_eurofit.where("[alumno_id+evaluacion_id]").equals([alumnoId, evaluacionId]).first(),
      db.pruebas_cfs.where("[alumno_id+evaluacion_id]").equals([alumnoId, evaluacionId]).first(),
    ]);
    return { e: e ?? null, c: c ?? null };
  }, [alumnoId, evaluacionId], { e: null, c: null });

  useEffect(() => {
    setEurofit(pruebasGuardadas?.e ?? {});
    setCfs(pruebasGuardadas?.c ?? {});
  }, [pruebasGuardadas?.e?.id, pruebasGuardadas?.c?.id, evaluacionId]);

  // Recalcular notas — RPC requiere conexión, si offline mantenemos las anteriores
  useEffect(() => {
    if (!ctx?.alumno) return;
    if (!sync.online) return;
    const alumno = ctx.alumno;
    const edad = calcularEdad(alumno.fecha_nacimiento as string);
    const todas = [...PRUEBAS_EUROFIT, ...PRUEBAS_CFS];
    Promise.all(todas.map(async (p) => {
      const reg = p.bateria === "eurofit" ? eurofit : cfs;
      const valor = valorParaBaremo(p, reg);
      if (valor == null) return [p.prueba, null] as const;
      const { data } = await supabase.rpc("calcular_nota", {
        _bateria: p.bateria, _prueba: p.prueba, _sexo: alumno.sexo as "M" | "F", _edad: edad, _valor: valor,
      });
      return [p.prueba, data as number | null] as const;
    })).then((res) => setNotas(Object.fromEntries(res)));
  }, [ctx?.alumno, eurofit, cfs, sync.online]);

  async function guardar(bateria: "eurofit" | "cfs") {
    if (!alumnoId) return;
    if (!evaluacionId) { toast({ variant: "destructive", title: "Selecciona o crea una evaluación primero" }); return; }
    const tabla = bateria === "eurofit" ? "pruebas_eurofit" : "pruebas_cfs";
    const data = bateria === "eurofit" ? eurofit : cfs;
    const payload = { ...data, alumno_id: alumnoId, evaluacion_id: evaluacionId, fecha: data.fecha ?? new Date().toISOString().split("T")[0] };
    delete payload.created_at;
    delete payload.updated_at;
    delete (payload as { _dirty?: unknown })._dirty;
    try {
      await savePrueba(tabla, payload);
      toast({ title: `Batería ${bateria.toUpperCase()} guardada${sync.online ? "" : " (se sincronizará)"}` });
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : String(err) });
    }
  }

  async function guardarPersonalizada() {
    if (!alumnoId || !ctx?.bateriaPersonalizada) return;
    if (!evaluacionId) { toast({ variant: "destructive", title: "Selecciona o crea una evaluación primero" }); return; }
    const tablas = new Set(pruebasDePersonalizada(ctx.bateriaPersonalizada).map((p) => p.bateria));
    try {
      await Promise.all(
        Array.from(tablas).map((b) => {
          const tabla = b === "eurofit" ? "pruebas_eurofit" : "pruebas_cfs";
          const data = b === "eurofit" ? eurofit : cfs;
          const payload = { ...data, alumno_id: alumnoId, evaluacion_id: evaluacionId, fecha: data.fecha ?? new Date().toISOString().split("T")[0] };
          delete payload.created_at;
          delete payload.updated_at;
          delete (payload as { _dirty?: unknown })._dirty;
          return savePrueba(tabla, payload);
        }),
      );
      toast({ title: `Batería personalizada guardada${sync.online ? "" : " (se sincronizará)"}` });
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : String(err) });
    }
  }

  async function exportarPDF() {
    if (!ctx?.alumno) return;
    const notasEurofit: Record<string, number | null> = {};
    const notasCfs: Record<string, number | null> = {};
    PRUEBAS_EUROFIT.forEach((p) => { notasEurofit[p.prueba] = notas[p.prueba] ?? null; });
    PRUEBAS_CFS.forEach((p) => { notasCfs[p.prueba] = notas[p.prueba] ?? null; });
    await generarInformePDF({
      alumno: ctx.alumno, eurofit, cfs, notasEurofit, notasCfs, procedimientos: procedimientos as never,
      bateriaPersonalizada: isBateriaPersonalizadaCompleta(ctx.bateriaPersonalizada) ? ctx.bateriaPersonalizada : null,
    });
  }

  if (!ctx?.alumno) return <div className="text-muted-foreground">Cargando…</div>;

  const alumno = ctx.alumno as Record<string, unknown>;
  const edad = calcularEdad(alumno.fecha_nacimiento as string);
  const bpActiva = isBateriaPersonalizadaCompleta(ctx.bateriaPersonalizada);
  const pruebasPersonalizadas = bpActiva ? pruebasDePersonalizada(ctx.bateriaPersonalizada!) : [];

  let notaBP: number | null = null;
  if (bpActiva) {
    const vals = pruebasPersonalizadas.map((p) => notas[p.prueba]).filter((n): n is number => n != null);
    if (vals.length) notaBP = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/app/alumnos?grupo=${alumno.grupo_id}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver
          </Link>
          <h1 className="font-display text-2xl font-bold mt-1">{alumno.apellidos as string}, {alumno.nombre as string}</h1>
          <p className="text-sm text-muted-foreground">{alumno.sexo === "M" ? "Chico" : "Chica"} · {edad} años · Aula {alumno.id_aula as number}</p>
        </div>
        <Button onClick={exportarPDF} variant="outline">
          <FileDown className="h-4 w-4 mr-1.5" /> Descargar PDF
        </Button>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-3">
          <EvaluacionSelector
            grupoId={alumno.grupo_id as string}
            value={evaluacionId}
            onChange={setEvaluacionId}
          />
          {!evaluacionId && (
            <p className="text-xs text-muted-foreground mt-2">
              Crea una evaluación para empezar a registrar pruebas (puedes tener varias a lo largo del curso).
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={bpActiva ? "personalizada" : "eurofit"}>
        <TabsList>
          <TabsTrigger value="eurofit">Batería Eurofit</TabsTrigger>
          <TabsTrigger value="cfs">Batería CFS</TabsTrigger>
          {bpActiva && <TabsTrigger value="personalizada"><Sliders className="h-3.5 w-3.5 mr-1" />Personalizada</TabsTrigger>}
        </TabsList>

        <TabsContent value="eurofit" className="space-y-4 mt-4">
          {PRUEBAS_EUROFIT.map((p) => (
            <PruebaCard
              key={p.prueba} prueba={p} registro={eurofit} onChange={setEurofit} nota={notas[p.prueba]}
              procedimiento={procedimientos.find((x) => x.bateria === p.bateria && x.prueba === p.prueba) as any}
            />
          ))}
          <Button onClick={() => guardar("eurofit")} className="bg-gradient-energy text-secondary-foreground shadow-energy">
            <Save className="h-4 w-4 mr-1.5" /> Guardar Eurofit
          </Button>
        </TabsContent>

        <TabsContent value="cfs" className="space-y-4 mt-4">
          {PRUEBAS_CFS.map((p) => (
            <PruebaCard
              key={p.prueba} prueba={p} registro={cfs} onChange={setCfs} nota={notas[p.prueba]}
              procedimiento={procedimientos.find((x) => x.bateria === p.bateria && x.prueba === (p.prueba.startsWith("lanz_med") ? "lanz_med" : p.prueba)) as any}
            />
          ))}
          {cfs.indice_elastico != null && (
            <Card className="bg-accent/30">
              <CardContent className="p-4 text-sm">
                <strong>Índice elástico</strong> (CMJ-SJ)/SJ × 100 = <span className="font-mono font-semibold">{cfs.indice_elastico}%</span>
                <span className="text-muted-foreground ml-2">(calculado automáticamente)</span>
              </CardContent>
            </Card>
          )}
          <Button onClick={() => guardar("cfs")} className="bg-gradient-energy text-secondary-foreground shadow-energy">
            <Save className="h-4 w-4 mr-1.5" /> Guardar CFS
          </Button>
        </TabsContent>

        {bpActiva && (
          <TabsContent value="personalizada" className="space-y-4 mt-4">
            <Card className="bg-accent/30">
              <CardContent className="p-4 text-sm flex flex-wrap items-center justify-between gap-2">
                <span>Batería configurada por el profesor del grupo (6 pruebas · una por categoría).</span>
                {notaBP != null && (
                  <Badge variant={notaBP >= 7 ? "default" : notaBP >= 5 ? "secondary" : "destructive"}>
                    Nota media: {notaBP}/10
                  </Badge>
                )}
              </CardContent>
            </Card>

            {CATEGORIAS.map((cat) => {
              const optKey = ctx.bateriaPersonalizada![cat.key];
              const opt = cat.opciones.find((o) => o.key === optKey);
              if (!opt) return null;
              return (
                <div key={cat.key} className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{cat.label}</h3>
                  {opt.pruebas.map((p) => (
                    <PruebaCard
                      key={p.prueba} prueba={p}
                      registro={p.bateria === "eurofit" ? eurofit : cfs}
                      onChange={p.bateria === "eurofit" ? setEurofit : setCfs}
                      nota={notas[p.prueba]}
                      procedimiento={procedimientos.find((x) => x.bateria === p.bateria && x.prueba === (p.prueba.startsWith("lanz_med") ? "lanz_med" : p.prueba)) as any}
                    />
                  ))}
                </div>
              );
            })}

            <Button onClick={guardarPersonalizada} className="bg-gradient-energy text-secondary-foreground shadow-energy">
              <Save className="h-4 w-4 mr-1.5" /> Guardar batería personalizada
            </Button>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function PruebaCard({
  prueba, registro, onChange, nota, procedimiento,
}: {
  prueba: PruebaDef; registro: any; onChange: (r: any) => void; nota: number | null | undefined;
  procedimiento?: { procedimiento_md: string; referencia_apa: string; imagen_url?: string | null };
}) {
  function setVal(campo: string, v: string) {
    onChange({ ...registro, [campo]: v === "" ? null : Number(v) });
  }
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base font-display">
          {NOMBRE_PRUEBA[prueba.prueba]}
          {nota != null && (
            <Badge className="ml-2" variant={nota >= 7 ? "default" : nota >= 5 ? "secondary" : "destructive"}>
              Nota: {nota}/10
            </Badge>
          )}
        </CardTitle>
        {procedimiento && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost"><BookOpen className="h-4 w-4 mr-1" /> Procedimiento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">{NOMBRE_PRUEBA[prueba.prueba]}</DialogTitle></DialogHeader>
              {(procedimiento.imagen_url || IMG_PROCEDIMIENTO[prueba.prueba]) && (
                <img
                  src={procedimiento.imagen_url || IMG_PROCEDIMIENTO[prueba.prueba]}
                  alt={`Ilustración del procedimiento: ${NOMBRE_PRUEBA[prueba.prueba]}`}
                  loading="lazy"
                  className="w-full h-auto rounded-md border bg-white"
                />
              )}
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{procedimiento.procedimiento_md}</div>
              <p className="text-xs text-muted-foreground border-t pt-2 italic">{procedimiento.referencia_apa}</p>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {prueba.composite === "rockport" ? (
          <div className="grid grid-cols-3 gap-3">
            {prueba.subcampos!.map((sc) => (
              <div key={sc.campo} className="space-y-1.5">
                <Label>{sc.label}</Label>
                <Input type="number" step={sc.step} max={sc.max} value={registro[sc.campo] ?? ""} onChange={(e) => setVal(sc.campo, e.target.value)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 max-w-xs">
            <Label>Resultado ({prueba.unidad})</Label>
            <Input type="number" step={prueba.step} value={registro[prueba.campo] ?? ""} onChange={(e) => setVal(prueba.campo, e.target.value)} />
          </div>
        )}
        <OmniRes value={registro[prueba.omniCampo]} onChange={(v) => onChange({ ...registro, [prueba.omniCampo]: v })} required />
      </CardContent>
    </Card>
  );
}
