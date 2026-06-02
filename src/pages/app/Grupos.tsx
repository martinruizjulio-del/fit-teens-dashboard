import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CURSOS, LETRAS, generarAniosEscolares } from "@/lib/constants";
import { Users, Plus, ArrowRight, Sliders } from "lucide-react";
import { BateriaPersonalizadaDialog } from "@/components/BateriaPersonalizadaDialog";
import { isBateriaPersonalizadaCompleta, type BateriaPersonalizada } from "@/lib/pruebas";

interface Grupo {
  id: string;
  centro_id: string;
  curso: string;
  letra: string;
  anio_escolar: string;
  centro?: { nombre: string };
  alumno_count?: number;
  bateria_personalizada?: BateriaPersonalizada | null;
}

export default function Grupos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [centros, setCentros] = useState<Array<{ id: string; nombre: string }>>([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({ centro_id: "", curso: "", letra: "", anio_escolar: generarAniosEscolares()[0] });

  useEffect(() => { void load(); }, []);

  async function load() {
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from("grupos").select("*, centro:centros(nombre)").order("created_at", { ascending: false }),
      supabase.from("centros").select("id, nombre").order("nombre"),
    ]);

    // Conteo de alumnos
    const grupos = (g ?? []) as Grupo[];
    if (grupos.length > 0) {
      const ids = grupos.map((x) => x.id);
      const { data: alumnos } = await supabase.from("alumnos").select("grupo_id").in("grupo_id", ids);
      const counts: Record<string, number> = {};
      (alumnos ?? []).forEach((a: any) => { counts[a.grupo_id] = (counts[a.grupo_id] || 0) + 1; });
      grupos.forEach((gr) => { gr.alumno_count = counts[gr.id] || 0; });
    }
    setGrupos(grupos);
    setCentros((c ?? []) as Array<{ id: string; nombre: string }>);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("grupos").insert({
      centro_id: form.centro_id,
      curso: form.curso as any,
      letra: form.letra,
      anio_escolar: form.anio_escolar,
      profesor_id: user.id,
    });
    if (error) {
      toast({ variant: "destructive", title: error.message });
      return;
    }
    toast({ title: t("grupos.createdOk") });
    setOpen(false);
    setForm({ centro_id: "", curso: "", letra: "", anio_escolar: generarAniosEscolares()[0] });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("grupos.title")}</h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-energy text-secondary-foreground shadow-energy hover:opacity-95" disabled={centros.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> {t("grupos.newGroup")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{t("grupos.newGroup")}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("grupos.centro")} *</Label>
                <Select required value={form.centro_id} onValueChange={(v) => setForm({ ...form, centro_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent>
                    {centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("grupos.curso")} *</Label>
                  <Select required value={form.curso} onValueChange={(v) => setForm({ ...form, curso: v })}>
                    <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                    <SelectContent>
                      {CURSOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("grupos.letra")} *</Label>
                  <Select required value={form.letra} onValueChange={(v) => setForm({ ...form, letra: v })}>
                    <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                    <SelectContent>
                      {LETRAS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("grupos.anio")} *</Label>
                <Select required value={form.anio_escolar} onValueChange={(v) => setForm({ ...form, anio_escolar: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {generarAniosEscolares().map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">{t("common.save")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {centros.length === 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="p-4 text-sm">
            ⚠️ Antes de crear grupos, registra al menos un <Link to="/app/centros" className="font-medium text-primary underline">centro educativo</Link>.
          </CardContent>
        </Card>
      )}

      {grupos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>{t("grupos.noGrupos")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grupos.map((g) => (
            <Link key={g.id} to={`/app/grupos/${g.id}`}>
              <Card className="hover:shadow-elevated hover:-translate-y-0.5 transition-smooth cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg flex items-center justify-between">
                    <span>{g.curso.replace("ESO", "º ESO")} {g.letra}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{g.centro?.nombre}</p>
                  <p>{t("grupos.anio")}: {g.anio_escolar}</p>
                  <p className="flex items-center gap-1.5 pt-1">
                    <Users className="h-3.5 w-3.5" /> {g.alumno_count ?? 0} {t("grupos.students")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
