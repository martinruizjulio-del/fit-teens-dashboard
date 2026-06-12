import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ClipboardList, KeyRound, Copy, Search } from "lucide-react";
import { calcularEdad } from "@/lib/pruebas";
import { ImportarAlumnosDialog } from "@/components/ImportarAlumnosDialog";
import { db } from "@/offline/db";
import { createAlumno, updateAlumno, deleteAlumno } from "@/offline/repo";

interface Alumno {
  id: string; grupo_id: string; id_aula: number;
  nombre: string; apellidos: string; sexo: "M" | "F"; fecha_nacimiento: string;
  peso_kg: number | null; talla_m: number | null; imc: number | null;
  envergadura_cm: number | null; biacromial_cm: number | null;
  longitud_pierna_cm: number | null; extraescolar: boolean; horas_extraescolar: number | null;
  codigo_acceso: string;
}

interface Grupo { id: string; centro_id: string; curso: string; letra: string }
interface Centro { id: string; nombre: string }

const emptyForm = {
  nombre: "", apellidos: "", sexo: "M" as "M" | "F", fecha_nacimiento: "", id_aula: 1,
  peso_kg: "", talla_m: "", envergadura_cm: "", biacromial_cm: "", longitud_pierna_cm: "",
  extraescolar: false, horas_extraescolar: "",
};

export default function Alumnos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const data = useLiveQuery(async () => {
    const [grupos, centros] = await Promise.all([db.grupos.toArray(), db.centros.toArray()]);
    return {
      grupos: (grupos as unknown as Grupo[]).slice().sort((a, b) => a.curso.localeCompare(b.curso)),
      centros: centros as unknown as Centro[],
    };
  }, [], { grupos: [] as Grupo[], centros: [] as Centro[] });
  const grupos = data?.grupos ?? [];
  const centros = data?.centros ?? [];

  const [grupoId, setGrupoId] = useState<string>(params.get("grupo") ?? "");

  // If no grupo selected, default to first
  if (!grupoId && grupos.length > 0) {
    setGrupoId(grupos[0].id);
  }

  const alumnos = (useLiveQuery(
    async () => {
      if (!grupoId) return [] as Alumno[];
      const rs = await db.alumnos.where("grupo_id").equals(grupoId).toArray();
      return (rs as unknown as Alumno[]).slice().sort((a, b) => (a.id_aula ?? 0) - (b.id_aula ?? 0));
    },
    [grupoId],
    [] as Alumno[],
  )) ?? [];

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function changeGrupo(v: string) {
    setGrupoId(v);
    setParams({ grupo: v });
  }

  function openNew() {
    setEditId(null);
    const next = (alumnos.reduce((max, a) => Math.max(max, a.id_aula), 0) || 0) + 1;
    setForm({ ...emptyForm, id_aula: next });
    setOpen(true);
  }

  function openEdit(a: Alumno) {
    setEditId(a.id);
    setForm({
      nombre: a.nombre, apellidos: a.apellidos, sexo: a.sexo,
      fecha_nacimiento: a.fecha_nacimiento, id_aula: a.id_aula,
      peso_kg: a.peso_kg?.toString() ?? "", talla_m: a.talla_m?.toString() ?? "",
      envergadura_cm: a.envergadura_cm?.toString() ?? "", biacromial_cm: a.biacromial_cm?.toString() ?? "",
      longitud_pierna_cm: a.longitud_pierna_cm?.toString() ?? "",
      extraescolar: a.extraescolar, horas_extraescolar: a.horas_extraescolar?.toString() ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !grupoId) return;
    const payload = {
      grupo_id: grupoId,
      id_aula: Number(form.id_aula),
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      sexo: form.sexo,
      fecha_nacimiento: form.fecha_nacimiento,
      peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
      talla_m: form.talla_m ? Number(form.talla_m) : null,
      envergadura_cm: form.envergadura_cm ? Number(form.envergadura_cm) : null,
      biacromial_cm: form.biacromial_cm ? Number(form.biacromial_cm) : null,
      longitud_pierna_cm: form.longitud_pierna_cm ? Number(form.longitud_pierna_cm) : null,
      extraescolar: form.extraescolar,
      horas_extraescolar: form.horas_extraescolar ? Number(form.horas_extraescolar) : null,
    };
    try {
      if (editId) await updateAlumno(editId, payload);
      else await createAlumno(payload);
      toast({ title: editId ? "Alumno actualizado" : "Alumno creado" });
      setOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : String(err) });
    }
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar este alumno y todos sus datos?")) return;
    try {
      await deleteAlumno(id);
      toast({ title: "Eliminado" });
    } catch (err) {
      toast({ variant: "destructive", title: err instanceof Error ? err.message : String(err) });
    }
  }

  function copiar(codigo: string) {
    navigator.clipboard.writeText(codigo);
    toast({ title: "Código copiado" });
  }

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alumnos;
    return alumnos.filter((a) =>
      `${a.nombre} ${a.apellidos}`.toLowerCase().includes(q) || a.codigo_acceso.toLowerCase().includes(q),
    );
  }, [alumnos, search]);

  function grupoNombre(g: Grupo): string {
    const c = centros.find((x) => x.id === g.centro_id);
    return `${g.curso.replace("ESO", "º ESO")} ${g.letra}${c ? " — " + c.nombre : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Alumnos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona la lista de alumnos por grupo y registra sus pruebas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={grupoId} onValueChange={changeGrupo}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecciona grupo" /></SelectTrigger>
            <SelectContent>
              {grupos.map((g) => (
                <SelectItem key={g.id} value={g.id}>{grupoNombre(g)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ImportarAlumnosDialog
            grupoId={grupoId || null}
            grupoNombre={(() => {
              const g = grupos.find((x) => x.id === grupoId);
              return g ? `${g.curso.replace("ESO", "º ESO")} ${g.letra}` : undefined;
            })()}
            onImported={() => { /* live query refreshes after pull */ }}
          />
          <Button onClick={openNew} disabled={!grupoId} className="bg-gradient-energy text-secondary-foreground shadow-energy hover:opacity-95">
            <Plus className="h-4 w-4 mr-1" /> Nuevo alumno
          </Button>
        </div>
      </div>

      {grupos.length === 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="p-4 text-sm">
            ⚠️ Crea primero un <Link to="/app/grupos" className="font-medium text-primary underline">grupo</Link>.
          </CardContent>
        </Card>
      )}

      {grupoId && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nombre o código…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>IMC</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No hay alumnos en este grupo.</TableCell></TableRow>
                ) : (
                  filtrados.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.id_aula}</TableCell>
                      <TableCell>
                        <div className="font-medium">{a.apellidos}, {a.nombre}</div>
                      </TableCell>
                      <TableCell>{a.sexo === "M" ? "Chico" : "Chica"}</TableCell>
                      <TableCell>{calcularEdad(a.fecha_nacimiento)}</TableCell>
                      <TableCell>{a.imc ?? "—"}</TableCell>
                      <TableCell>
                        <button onClick={() => copiar(a.codigo_acceso)} className="font-mono text-xs flex items-center gap-1 hover:text-primary">
                          <KeyRound className="h-3 w-3" /> {a.codigo_acceso} <Copy className="h-3 w-3 opacity-50" />
                        </button>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild size="sm" variant="secondary">
                          <Link to={`/app/pruebas/${a.id}`}><ClipboardList className="h-3.5 w-3.5 mr-1" /> Pruebas</Link>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => borrar(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editId ? "Editar alumno" : "Nuevo alumno"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Apellidos *</Label>
                <Input required value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} maxLength={150} />
              </div>
              <div className="space-y-1.5">
                <Label>Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as "M" | "F" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Chico</SelectItem>
                    <SelectItem value="F">Chica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de nacimiento *</Label>
                <Input type="date" required value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nº de aula *</Label>
                <Input type="number" min={1} required value={form.id_aula} onChange={(e) => setForm({ ...form, id_aula: Number(e.target.value) })} />
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Antropometría</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.1" value={form.peso_kg} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Talla (m)</Label>
                  <Input type="number" step="0.01" value={form.talla_m} onChange={(e) => setForm({ ...form, talla_m: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>IMC (auto)</Label>
                  <Input disabled value={form.peso_kg && form.talla_m ? (Number(form.peso_kg) / Number(form.talla_m) ** 2).toFixed(2) : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Envergadura (cm)</Label>
                  <Input type="number" step="0.1" value={form.envergadura_cm} onChange={(e) => setForm({ ...form, envergadura_cm: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Biacromial (cm)</Label>
                  <Input type="number" step="0.1" value={form.biacromial_cm} onChange={(e) => setForm({ ...form, biacromial_cm: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Biacromial × 1.5 (auto)</Label>
                  <Input disabled value={form.biacromial_cm ? (Number(form.biacromial_cm) * 1.5).toFixed(1) : ""} />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-3">
                  <Label>Longitud de pierna (cm)</Label>
                  <Input type="number" step="0.1" value={form.longitud_pierna_cm} onChange={(e) => setForm({ ...form, longitud_pierna_cm: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <Label>¿Realiza actividad extraescolar?</Label>
                <Switch checked={form.extraescolar} onCheckedChange={(v) => setForm({ ...form, extraescolar: v })} />
              </div>
              {form.extraescolar && (
                <div className="space-y-1.5 mt-3">
                  <Label>Horas semanales</Label>
                  <Input type="number" step="0.5" min="0" value={form.horas_extraescolar} onChange={(e) => setForm({ ...form, horas_extraescolar: e.target.value })} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{editId ? "Guardar cambios" : "Crear alumno"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
