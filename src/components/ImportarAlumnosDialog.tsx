import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  grupoId: string | null;
  grupoNombre?: string;
  onImported?: () => void;
}

// Encabezados (deben coincidir EXACTAMENTE con los que se generan en la plantilla)
// OBLIGATORIOS: nombre, edad. El resto son opcionales.
const COLS_ALUMNOS = [
  "nombre", "edad",
  "apellidos", "sexo", "fecha_nacimiento", "id_aula",
  "peso_kg", "talla_m", "envergadura_cm", "biacromial_cm", "longitud_pierna_cm",
  "extraescolar", "horas_extraescolar",
];
const COLS_EUROFIT = [
  "id_aula",
  "wells_cm", "salto_vertical_cm", "abdominales_60", "lanz_hombros_m", "sprint_50_seg", "cooper_m",
  "omni_wells", "omni_salto", "omni_abdominales", "omni_lanz", "omni_sprint", "omni_cooper",
];
const COLS_CFS = [
  "id_aula",
  "thomas", "biering_sorensen_seg", "sj_cm", "cmj_cm", "lanz_med_der_m", "lanz_med_izq_m",
  "sprint_30_seg", "rockport_min", "rockport_seg", "rockport_fc",
  "omni_thomas", "omni_biering", "omni_saltos", "omni_lanz", "omni_sprint", "omni_rockport",
];

export function ImportarAlumnosDialog({ grupoId, grupoNombre, onImported }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [resumen, setResumen] = useState<{ alumnos: number; eurofit: number; cfs: number; errores: string[] } | null>(null);

  function descargarPlantilla() {
    const wb = XLSX.utils.book_new();

    // Hoja Alumnos con encabezados + 2 filas de ejemplo
    // Solo nombre y edad son obligatorios; el resto se puede dejar en blanco.
    const alumnosRows = [
      COLS_ALUMNOS,
      ["Lucía", 13, "García López", "F", "2011-09-15", 1, 48.5, 1.58, 158, 35, 75, "sí", 3],
      ["Marc",  14, "", "", "", "", "", "", "", "", "", "", ""],
    ];
    const wsAlumnos = XLSX.utils.aoa_to_sheet(alumnosRows);
    wsAlumnos["!cols"] = COLS_ALUMNOS.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, wsAlumnos, "Alumnos");

    const eurofitRows = [
      COLS_EUROFIT,
      [1, 28, 32, 35, 7.2, 8.45, 2100, 4, 6, 5, 5, 7, 6],
      [2, 22, 38, 40, 8.1, 8.20, 2350, 5, 7, 6, 6, 6, 7],
    ];
    const wsEuro = XLSX.utils.aoa_to_sheet(eurofitRows);
    wsEuro["!cols"] = COLS_EUROFIT.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, wsEuro, "Eurofit");

    const cfsRows = [
      COLS_CFS,
      [1, 1, 95, 28, 32, 5.5, 5.2, 5.10, 12, 30, 165, 4, 7, 5, 5, 6, 7],
      [2, 2, 110, 30, 35, 6.0, 5.7, 4.95, 11, 45, 158, 3, 6, 5, 5, 6, 7],
    ];
    const wsCfs = XLSX.utils.aoa_to_sheet(cfsRows);
    wsCfs["!cols"] = COLS_CFS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, wsCfs, "CFS");

    // Hoja Instrucciones
    const inst = [
      ["INSTRUCCIONES"],
      [""],
      ["1. CAMPOS OBLIGATORIOS: solo 'nombre' y 'edad'. El resto se pueden completar después desde la aplicación."],
      ["2. Si dejas 'id_aula' en blanco, se asignará automáticamente un número correlativo."],
      ["3. Si dejas 'sexo' en blanco, se asignará 'M' por defecto (puedes editarlo después)."],
      ["4. Si dejas 'fecha_nacimiento' en blanco pero rellenas 'edad', se calculará una fecha aproximada (1 de septiembre del año correspondiente)."],
      ["5. (Opcional) Rellena las hojas 'Eurofit' y 'CFS' con las pruebas, usando el mismo id_aula."],
      [""],
      ["FORMATOS"],
      ["- edad: número en años (ej. 13)"],
      ["- sexo: M o F (opcional, por defecto M)"],
      ["- fecha_nacimiento: AAAA-MM-DD (ej. 2011-09-15) — opcional si rellenas 'edad'"],
      ["- extraescolar: 'sí' / 'no' (o true/false, 1/0)"],
      ["- decimales con punto (ej. 1.58) o coma (ej. 1,58)"],
      ["- thomas: 1 (sí limitado) o 2 (no limitado)"],
      ["- omni_*: escala 0-10 de esfuerzo percibido"],
      ["- rockport_min y rockport_seg por separado; rockport_fc = pulsaciones al final"],
      [""],
      ["No modifiques los nombres de las columnas ni el orden de las hojas."],
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(inst);
    wsInst["!cols"] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones");

    XLSX.writeFile(wb, "plantilla_importacion_alumnos.xlsx");
    toast({ title: "Plantilla descargada", description: "Rellénala (solo nombre y edad son obligatorios) y vuelve para subirla." });
  }

  function parseBool(v: any): boolean {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;
    const s = String(v ?? "").trim().toLowerCase();
    return ["si", "sí", "yes", "true", "1", "x"].includes(s);
  }
  function parseNum(v: any): number | null {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  function parseInt0(v: any): number | null {
    const n = parseNum(v);
    return n == null ? null : Math.round(n);
  }
  function parseFecha(v: any): string | null {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "number") {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return null;
      return `${d.y.toString().padStart(4, "0")}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(v).trim();
    // Acepta AAAA-MM-DD o DD/MM/AAAA
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return null;
  }

  async function importar() {
    if (!file || !grupoId) return;
    setBusy(true);
    setResumen(null);
    const errores: string[] = [];
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });

      const sheetAl = wb.Sheets["Alumnos"];
      if (!sheetAl) throw new Error("Falta la hoja 'Alumnos' en el Excel.");
      const filasAl = XLSX.utils.sheet_to_json<any>(sheetAl, { defval: null });

      // Mapa id_aula -> alumno_id (uuid) tras insertar
      const idMap = new Map<number, string>();
      let autoAula = 0;

      let okAl = 0;
      for (const row of filasAl) {
        const nombre = String(row.nombre ?? "").trim();
        if (!nombre) {
          continue; // fila vacía, ignorar
        }
        const edadNum = parseInt0(row.edad);
        const fechaProvista = parseFecha(row.fecha_nacimiento);
        if (!edadNum && !fechaProvista) {
          errores.push(`Alumnos · "${nombre}": falta 'edad' o 'fecha_nacimiento' (al menos uno es obligatorio).`);
          continue;
        }
        // Derivar fecha de nacimiento aproximada si solo viene edad
        let fecha = fechaProvista;
        if (!fecha && edadNum) {
          const año = new Date().getFullYear() - edadNum;
          fecha = `${año}-09-01`;
        }
        // id_aula: si viene, úsalo; si no, autoincremental
        autoAula += 1;
        const id_aula = parseInt0(row.id_aula) ?? autoAula;

        // Sexo: opcional, por defecto M
        const sexoRaw = String(row.sexo ?? "M").trim().toUpperCase();
        const sexo = ["M", "F"].includes(sexoRaw) ? sexoRaw : "M";

        // Apellidos opcionales
        const apellidos = String(row.apellidos ?? "").trim() || "—";

        const peso = parseNum(row.peso_kg);
        const talla = parseNum(row.talla_m);
        const bia = parseNum(row.biacromial_cm);
        const payload: any = {
          grupo_id: grupoId,
          id_aula,
          nombre,
          apellidos,
          sexo,
          fecha_nacimiento: fecha,
          peso_kg: peso,
          talla_m: talla,
          envergadura_cm: parseNum(row.envergadura_cm),
          biacromial_cm: bia,
          biacromial_15_cm: bia != null ? Number((bia * 1.5).toFixed(1)) : null,
          longitud_pierna_cm: parseNum(row.longitud_pierna_cm),
          extraescolar: parseBool(row.extraescolar),
          horas_extraescolar: parseNum(row.horas_extraescolar),
          imc: peso && talla ? Number((peso / (talla * talla)).toFixed(2)) : null,
        };
        const { data, error } = await supabase.from("alumnos").insert(payload).select("id, id_aula").single();
        if (error) {
          errores.push(`Alumnos · "${nombre}" (id_aula ${id_aula}): ${error.message}`);
          continue;
        }
        idMap.set(id_aula, data.id);
        okAl++;
      }

      // Crear (o reutilizar) una evaluación para asociar las pruebas importadas
      let evaluacionId: string | null = null;
      const hayPruebas = !!wb.Sheets["Eurofit"] || !!wb.Sheets["CFS"];
      if (hayPruebas) {
        const { data: evNew, error: evErr } = await supabase
          .from("evaluaciones")
          .insert({ grupo_id: grupoId, nombre: `Importación ${new Date().toLocaleDateString()}` })
          .select("id")
          .single();
        if (evErr || !evNew) {
          errores.push(`Evaluación · ${evErr?.message ?? "no se pudo crear"}`);
        } else {
          evaluacionId = evNew.id;
        }
      }

      // Eurofit
      let okEu = 0;
      const sheetEu = wb.Sheets["Eurofit"];
      if (sheetEu && evaluacionId) {
        const filasEu = XLSX.utils.sheet_to_json<any>(sheetEu, { defval: null });
        for (const row of filasEu) {
          const id_aula = parseInt0(row.id_aula);
          if (!id_aula) continue;
          const alumno_id = idMap.get(id_aula);
          if (!alumno_id) {
            errores.push(`Eurofit · id_aula ${id_aula} no existe en la hoja 'Alumnos'.`);
            continue;
          }
          const { error } = await supabase.from("pruebas_eurofit").insert({
            alumno_id,
            evaluacion_id: evaluacionId,
            wells_cm: parseNum(row.wells_cm),
            salto_vertical_cm: parseNum(row.salto_vertical_cm),
            abdominales_60: parseInt0(row.abdominales_60),
            lanz_hombros_m: parseNum(row.lanz_hombros_m),
            sprint_50_seg: parseNum(row.sprint_50_seg),
            cooper_m: parseInt0(row.cooper_m),
            omni_wells: parseInt0(row.omni_wells),
            omni_salto: parseInt0(row.omni_salto),
            omni_abdominales: parseInt0(row.omni_abdominales),
            omni_lanz: parseInt0(row.omni_lanz),
            omni_sprint: parseInt0(row.omni_sprint),
            omni_cooper: parseInt0(row.omni_cooper),
          });
          if (error) errores.push(`Eurofit · id_aula ${id_aula}: ${error.message}`);
          else okEu++;
        }
      }

      // CFS
      let okCfs = 0;
      const sheetCfs = wb.Sheets["CFS"];
      if (sheetCfs && evaluacionId) {
        const filasCfs = XLSX.utils.sheet_to_json<any>(sheetCfs, { defval: null });
        for (const row of filasCfs) {
          const id_aula = parseInt0(row.id_aula);
          if (!id_aula) continue;
          const alumno_id = idMap.get(id_aula);
          if (!alumno_id) {
            errores.push(`CFS · id_aula ${id_aula} no existe en la hoja 'Alumnos'.`);
            continue;
          }
          const { error } = await supabase.from("pruebas_cfs").insert({
            alumno_id,
            evaluacion_id: evaluacionId,
            thomas: parseInt0(row.thomas),
            biering_sorensen_seg: parseNum(row.biering_sorensen_seg),
            sj_cm: parseNum(row.sj_cm),
            cmj_cm: parseNum(row.cmj_cm),
            lanz_med_der_m: parseNum(row.lanz_med_der_m),
            lanz_med_izq_m: parseNum(row.lanz_med_izq_m),
            sprint_30_seg: parseNum(row.sprint_30_seg),
            rockport_min: parseInt0(row.rockport_min),
            rockport_seg: parseInt0(row.rockport_seg),
            rockport_fc: parseInt0(row.rockport_fc),
            omni_thomas: parseInt0(row.omni_thomas),
            omni_biering: parseInt0(row.omni_biering),
            omni_saltos: parseInt0(row.omni_saltos),
            omni_lanz: parseInt0(row.omni_lanz),
            omni_sprint: parseInt0(row.omni_sprint),
            omni_rockport: parseInt0(row.omni_rockport),
          });
          if (error) errores.push(`CFS · id_aula ${id_aula}: ${error.message}`);
          else okCfs++;
        }
      }

      setResumen({ alumnos: okAl, eurofit: okEu, cfs: okCfs, errores });
      if (okAl > 0) {
        toast({
          title: "Importación completada",
          description: `${okAl} alumnos · ${okEu} Eurofit · ${okCfs} CFS${errores.length ? ` · ${errores.length} errores` : ""}.`,
        });
        onImported?.();
      } else {
        toast({ variant: "destructive", title: "No se importó ningún alumno", description: errores[0] ?? "Revisa el archivo." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al procesar el Excel", description: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setResumen(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!grupoId}>
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Importar desde Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Importar alumnos desde Excel
          </DialogTitle>
          <DialogDescription>
            {grupoNombre
              ? <>Los alumnos se añadirán al grupo <b>{grupoNombre}</b>.</>
              : "Selecciona primero un grupo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Card className="bg-accent/30 border-accent">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">1. Descarga la plantilla</p>
                  <p className="text-xs text-muted-foreground">
                    Excel con 3 hojas: <b>Alumnos</b>, <b>Eurofit</b> y <b>CFS</b>. Incluye instrucciones y filas de ejemplo.
                  </p>
                </div>
                <Button type="button" onClick={descargarPlantilla} size="sm">
                  <Download className="h-4 w-4 mr-1" /> Descargar plantilla
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label className="text-sm font-medium">2. Sube la plantilla cumplimentada</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResumen(null); }}
              disabled={!grupoId}
            />
            {file && <p className="text-xs text-muted-foreground">Archivo seleccionado: <b>{file.name}</b></p>}
          </div>

          {resumen && (
            <Card className={resumen.alumnos > 0 ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {resumen.alumnos > 0 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                  Resultado: {resumen.alumnos} alumnos · {resumen.eurofit} Eurofit · {resumen.cfs} CFS
                </div>
                {resumen.errores.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-destructive font-medium">{resumen.errores.length} errores (clic para ver)</summary>
                    <ul className="mt-2 list-disc pl-5 space-y-0.5 max-h-40 overflow-auto">
                      {resumen.errores.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {resumen ? "Cerrar" : "Cancelar"}
          </Button>
          <Button onClick={importar} disabled={!file || !grupoId || busy}>
            <Upload className="h-4 w-4 mr-1" /> {busy ? "Importando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
