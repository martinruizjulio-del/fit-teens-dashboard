import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function Admin() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-secondary" /> {t("nav.admin")}
        </h1>
        <p className="text-muted-foreground mt-1">Panel de administración global.</p>
      </div>
      <Card className="border-dashed bg-accent/30">
        <CardContent className="p-10 text-center text-muted-foreground text-sm">
          <p className="font-medium text-foreground mb-1">Próxima entrega</p>
          <p>Edición de baremos y procedimientos, configuración de la página pública, idioma por defecto, generación de 100 alumnos demo y botón para borrarlos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
