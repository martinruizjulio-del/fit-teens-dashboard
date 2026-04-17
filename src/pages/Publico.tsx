import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { BarChart3 } from "lucide-react";

export default function Publico() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="container py-12 flex-1">
        <h1 className="font-display text-3xl font-bold">{t("nav.public")}</h1>
        <p className="text-muted-foreground mt-1">Estadísticas anónimas agregadas de toda la comunidad educativa.</p>
        <Card className="mt-8 border-dashed bg-accent/30">
          <CardContent className="p-12 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground mb-1">Próxima entrega</p>
            <p className="text-sm max-w-md mx-auto">Las gráficas con medias, desviaciones típicas, comparativas por curso/sexo y diferencias entre baterías llegarán en el siguiente bloque, junto con los datos demo de 100 alumnos.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
