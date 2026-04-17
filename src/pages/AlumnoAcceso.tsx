import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PublicHeader } from "@/components/PublicHeader";
import { GraduationCap, KeyRound } from "lucide-react";

export default function AlumnoAcceso() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { codigo: codigoParam } = useParams();
  const { toast } = useToast();
  const [codigo, setCodigo] = useState(codigoParam ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

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
      setData(result);
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setLoading(false);
    }
  }

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
          <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {data.alumno.nombre} {data.alumno.apellidos}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Stat label="Sexo" value={data.alumno.sexo === "M" ? t("common.male") : t("common.female")} />
                <Stat label="Peso" value={data.alumno.peso_kg ? `${data.alumno.peso_kg} kg` : "—"} />
                <Stat label="Talla" value={data.alumno.talla_m ? `${data.alumno.talla_m} m` : "—"} />
                <Stat label="IMC" value={data.alumno.imc ?? "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Pruebas Eurofit</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {data.eurofit ? "Datos disponibles — visualización detallada en próxima entrega." : "Aún no se han registrado pruebas."}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Pruebas CFS</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {data.cfs ? "Datos disponibles — visualización detallada en próxima entrega." : "Aún no se han registrado pruebas."}
              </CardContent>
            </Card>

            <Button variant="outline" onClick={() => { setData(null); setCodigo(""); navigate("/alumno", { replace: true }); }}>
              {t("common.back")}
            </Button>
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
