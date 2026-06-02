import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PROVINCIAS_ES } from "@/lib/constants";
import { Building2, Plus, MapPin, Mail, Phone, EyeOff } from "lucide-react";

interface Centro {
  id: string;
  nombre: string;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string;
  email: string | null;
  telefono: string | null;
  created_by: string | null;
  anonimo: boolean;
  codigo_anonimo: string | null;
  mostrar_publico: boolean;
}

export default function Centros() {
  const { t } = useTranslation();
  const { user, impersonating } = useAuth();
  const { toast } = useToast();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState<string>("");

  // form
  const [form, setForm] = useState({
    nombre: "", direccion: "", codigo_postal: "", ciudad: "",
    provincia: "", email: "", telefono: "",
    anonimo: false, mostrar_publico: true,
  });

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data, error } = await supabase.from("centros").select("*").order("nombre");
    if (error) {
      toast({ variant: "destructive", title: error.message });
      return;
    }
    setCentros((data ?? []) as Centro[]);
  }

  function loadFromExisting(id: string) {
    setSelectedExisting(id);
    const c = centros.find((x) => x.id === id);
    if (c) {
      setForm({
        nombre: c.nombre,
        direccion: c.direccion ?? "",
        codigo_postal: c.codigo_postal ?? "",
        ciudad: c.ciudad ?? "",
        provincia: c.provincia,
        email: c.email ?? "",
        telefono: c.telefono ?? "",
        anonimo: c.anonimo ?? false,
        mostrar_publico: c.mostrar_publico ?? true,
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const payload = { ...form, created_by: user.id };
    const { error } = await supabase.from("centros").insert(payload);
    if (error) {
      toast({ variant: "destructive", title: error.message });
      return;
    }
    toast({ title: t("centros.createdOk") });
    setOpen(false);
    setForm({ nombre: "", direccion: "", codigo_postal: "", ciudad: "", provincia: "", email: "", telefono: "", anonimo: false, mostrar_publico: true });
    setSelectedExisting("");
    void load();
  }

  // Centros que el profesor ha creado
  const myCentros = centros.filter((c) => c.created_by === (impersonating?.userId ?? user?.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("centros.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("centros.subtitle")}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-energy text-secondary-foreground shadow-energy hover:opacity-95">
              <Plus className="h-4 w-4 mr-2" /> {t("centros.createNew")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{t("centros.createNew")}</DialogTitle>
            </DialogHeader>

            {/* Reutilizar centro existente */}
            {centros.length > 0 && (
              <div className="space-y-1.5 pb-3 border-b">
                <Label>{t("centros.selectExisting")}</Label>
                <Select value={selectedExisting} onValueChange={loadFromExisting}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent>
                    {centros.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre} — {c.ciudad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Si seleccionas uno, se rellenarán los datos. Aún así crearemos un nuevo registro tuyo.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("centros.name")} *</Label>
                <Input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("centros.address")}</Label>
                <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("centros.postalCode")}</Label>
                  <Input value={form.codigo_postal} onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })} maxLength={10} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("centros.city")}</Label>
                  <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("centros.province")} *</Label>
                <Select required value={form.provincia} onValueChange={(v) => setForm({ ...form, provincia: v })}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {PROVINCIAS_ES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("centros.email")}</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("centros.phone")}</Label>
                  <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label htmlFor="anonimo-switch" className="text-sm font-medium cursor-pointer">
                      {t("centros.anonimoLabel")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("centros.anonimoHelp")}</p>
                  </div>
                  <Switch
                    id="anonimo-switch"
                    checked={form.anonimo}
                    onCheckedChange={(v) => setForm({ ...form, anonimo: v })}
                  />
                </div>
                <div className="flex items-start justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex-1">
                    <Label htmlFor="publico-switch" className="text-sm font-medium cursor-pointer">
                      {t("centros.mostrarPublicoLabel")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("centros.mostrarPublicoHelp")}</p>
                  </div>
                  <Switch
                    id="publico-switch"
                    checked={form.mostrar_publico}
                    onCheckedChange={(v) => setForm({ ...form, mostrar_publico: v })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2">{t("common.save")}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {myCentros.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>{t("centros.noCentros")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myCentros.map((c) => (
            <Card key={c.id} className="hover:shadow-elevated transition-base">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="line-clamp-2">{c.nombre}</span>
                </CardTitle>
                {c.anonimo && c.codigo_anonimo && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <EyeOff className="h-3 w-3" /> {t("centros.publicAs")} <span className="font-mono font-semibold text-foreground">{c.codigo_anonimo}</span>
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                {(c.ciudad || c.provincia) && (
                  <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {[c.ciudad, c.provincia].filter(Boolean).join(", ")}</p>
                )}
                {c.email && <p className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5" /> {c.email}</p>}
                {c.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {c.telefono}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
