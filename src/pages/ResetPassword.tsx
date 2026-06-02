import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase coloca la sesión de recuperación al cargar; escuchamos el evento.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Si ya hay sesión (link recién abierto)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast({ variant: "destructive", title: "La contraseña debe tener al menos 8 caracteres" });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Las contraseñas no coinciden" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast({ title: "Contraseña actualizada", description: "Inicia sesión con tu nueva contraseña." });
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="container flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <Logo size={32} />
          <span className="font-display font-bold">CFA</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elevated animate-scale-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 inline-flex p-3 rounded-full bg-gradient-primary">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Restablecer contraseña</CardTitle>
            <CardDescription>
              {ready
                ? "Introduce tu nueva contraseña."
                : "Validando enlace de recuperación…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pwd">Nueva contraseña</Label>
                  <Input
                    id="pwd"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pwd2">Confirmar contraseña</Label>
                  <Input
                    id="pwd2"
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Actualizar contraseña
                </Button>
              </form>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-6">
                Si el enlace ha caducado, vuelve a solicitar uno nuevo desde la pantalla de inicio de sesión.
                <div className="mt-4">
                  <Link to="/auth" className="text-primary underline">Volver al login</Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
