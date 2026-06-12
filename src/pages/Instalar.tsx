import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Download, Share, Plus, MoreVertical, Smartphone, Apple, Monitor } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function Instalar() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    document.title = "Instalar la app — CFS";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "Instala CFS en tu móvil u ordenador para usarla como una app nativa: acceso desde el icono del dispositivo y soporte sin conexión.",
    );

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-primary">
            <Logo size={28} /> CFS
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <section className="text-center space-y-3">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Instala CFS en tu dispositivo
          </h1>
          <p className="text-muted-foreground">
            Úsala como una app nativa: icono en la pantalla de inicio, pantalla completa y soporte
            sin conexión.
          </p>

          {installed ? (
            <div className="inline-flex items-center gap-2 rounded-md bg-secondary/15 text-secondary-foreground px-4 py-2 text-sm">
              ✅ La app ya está instalada en este dispositivo
            </div>
          ) : deferred ? (
            <Button size="lg" onClick={handleInstall} className="gap-2">
              <Download className="h-4 w-4" /> Instalar app
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Si tu navegador no muestra el botón automático, sigue las instrucciones según tu dispositivo.
            </p>
          )}
        </section>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Apple className="h-5 w-5" /> iPhone / iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Abre la web en <strong>Safari</strong>.</p>
              <p className="flex items-center gap-2">
                1. Pulsa <Share className="h-4 w-4 inline" /> <strong>Compartir</strong>.
              </p>
              <p className="flex items-center gap-2">
                2. <Plus className="h-4 w-4 inline" /> <strong>Añadir a pantalla de inicio</strong>.
              </p>
              <p>3. Confirma con <strong>Añadir</strong>.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-5 w-5" /> Android
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Abre la web en <strong>Chrome</strong>.</p>
              <p className="flex items-center gap-2">
                1. Pulsa <MoreVertical className="h-4 w-4 inline" /> menú.
              </p>
              <p>2. Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p>
              <p>3. Confirma con <strong>Instalar</strong>.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-5 w-5" /> Escritorio
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>En <strong>Chrome</strong>, <strong>Edge</strong> o <strong>Brave</strong>:</p>
              <p>1. Pulsa el icono <Download className="h-4 w-4 inline" /> en la barra de direcciones.</p>
              <p>2. O Menú → <strong>Instalar CFS…</strong></p>
              <p>3. La app se abrirá en su propia ventana.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿Por qué instalarla?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground grid sm:grid-cols-2 gap-2">
            <p>• Icono propio en el dispositivo.</p>
            <p>• Se abre a pantalla completa, sin barras del navegador.</p>
            <p>• Funciona sin conexión gracias a la caché local.</p>
            <p>• Inicio más rápido y experiencia tipo app nativa.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
