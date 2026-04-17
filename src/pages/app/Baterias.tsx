import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function Baterias() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("nav.baterias")}</h1>
        <p className="text-muted-foreground mt-1">Eurofit y CFS — selecciona un grupo y un alumno para registrar pruebas.</p>
      </div>
      <Card className="border-dashed bg-accent/30">
        <CardContent className="p-10 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground mb-1">Próxima entrega</p>
          <p className="text-sm">Las baterías Eurofit y CFS con cálculo de notas, percepción Omni-Res, baremos y procedimientos APA llegarán en el siguiente bloque. La estructura de base de datos ya está lista.</p>
        </CardContent>
      </Card>
    </div>
  );
}
