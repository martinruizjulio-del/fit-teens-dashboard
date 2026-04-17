import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, School, ShieldCheck } from "lucide-react";

interface CentroRow {
  id: string;
  nombre: string;
  provincia: string;
  ciudad: string | null;
  anonimo: boolean;
  codigo_anonimo: string | null;
}

export default function CentrosPublico() {
  const { t } = useTranslation();
  const [centros, setCentros] = useState<CentroRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("centros")
      .select("id, nombre, provincia, ciudad, anonimo, codigo_anonimo")
      .eq("mostrar_publico", true)
      .order("provincia", { ascending: true })
      .order("nombre", { ascending: true })
      .then(({ data }) => {
        setCentros((data ?? []) as CentroRow[]);
        setLoading(false);
      });
  }, []);

  const porProvincia = useMemo(() => {
    const map = new Map<string, CentroRow[]>();
    centros.forEach((c) => {
      const key = c.provincia || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [centros]);

  const totalCentros = centros.length;
  const totalProvincias = porProvincia.length;
  const totalAnonimos = centros.filter((c) => c.anonimo).length;

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
            <School className="h-8 w-8 text-primary" /> {t("centrosPublico.title")}
          </h1>
          <p className="text-muted-foreground max-w-3xl">{t("centrosPublico.subtitle")}</p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPI label={t("centrosPublico.totalCentros")} value={totalCentros} />
          <KPI label={t("centrosPublico.totalProvincias")} value={totalProvincias} />
          <KPI label={t("centrosPublico.totalAnonimos")} value={totalAnonimos} />
        </div>

        {/* Mapa por provincia (heatmap simple por barras) */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-secondary" /> {t("centrosPublico.distribucion")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : porProvincia.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("centrosPublico.vacio")}</p>
            ) : (
              <div className="space-y-2">
                {porProvincia.map(([prov, lista]) => {
                  const max = Math.max(...porProvincia.map(([, l]) => l.length));
                  const pct = (lista.length / max) * 100;
                  return (
                    <div key={prov} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{prov}</span>
                        <span className="text-muted-foreground tabular-nums">{lista.length}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listado por provincia */}
        <div className="space-y-6">
          {porProvincia.map(([prov, lista]) => (
            <section key={prov}>
              <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> {prov}
                <Badge variant="secondary" className="ml-1">{lista.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lista.map((c) => (
                  <Card key={c.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold leading-tight">
                          {c.anonimo ? (
                            <span className="font-mono text-sm">{c.codigo_anonimo ?? "—"}</span>
                          ) : (
                            c.nombre
                          )}
                        </div>
                        {c.anonimo && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            <ShieldCheck className="h-3 w-3 mr-1" /> {t("centrosPublico.anonimo")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.anonimo ? t("centrosPublico.ubicacionOculta") : (c.ciudad || c.provincia)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-muted-foreground border-t pt-4">{t("centrosPublico.aviso")}</p>
      </main>
      <SiteFooter />
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-3xl font-display font-bold text-primary">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
