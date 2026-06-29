import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PrivacyPolicyDialog } from "@/components/PrivacyPolicyDialog";
import { ImplantacionDialog } from "@/components/ImplantacionDialog";
import { SiteFooter } from "@/components/SiteFooter";
import { ShieldCheck, ArrowLeft, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

const PRODUCTION_ORIGIN = "https://fit-stride-stats.lovable.app";

function getAuthRedirectUrl(path: "/app" | "/reset-password") {
  const isLocalDev = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const origin = isLocalDev ? window.location.origin : PRODUCTION_ORIGIN;

  return `${origin}${path}`;
}

type Stage = "credentials" | "otp" | "forgot";

export default function Auth() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>("credentials");
  const [emailForOtp, setEmailForOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign up
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  // Gating
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [implantacionSent, setImplantacionSent] = useState(false);

  // OTP
  const [otp, setOtp] = useState("");

  if (user && stage === "credentials") {
    navigate("/app", { replace: true });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: siEmail.trim(),
        password: siPassword,
      });
      if (pwError) throw pwError;
      await supabase.auth.signOut();

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: siEmail.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getAuthRedirectUrl("/app"),
        },
      });
      if (otpError) throw otpError;

      setEmailForOtp(siEmail.trim());
      setStage("otp");
      toast({ title: t("auth.otpTitle"), description: t("auth.otpDesc") });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("auth.errors.generic"),
        description: err?.message?.includes("Invalid") ? t("auth.errors.invalidCreds") : err?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptPrivacy) {
      toast({ variant: "destructive", title: t("auth.consent.errorPrivacy") });
      return;
    }
    if (!implantacionSent) {
      toast({ variant: "destructive", title: t("auth.consent.errorImplantacion") });
      return;
    }
    setLoading(true);
    try {
      const parsed = signUpSchema.safeParse({ fullName: suName, email: suEmail, password: suPassword });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.path[0] === "password"
          ? t("auth.errors.weakPassword")
          : t("auth.errors.generic");
        throw new Error(msg);
      }

      const redirectUrl = getAuthRedirectUrl("/app");
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: parsed.data.fullName },
        },
      });
      if (error) throw error;

      // Registrar consentimientos
      if (data.user) {
        await supabase.from("consentimientos").insert([
          { user_id: data.user.id, tipo: "privacidad", version: "v1", aceptado: true },
          { user_id: data.user.id, tipo: "implantacion", version: "v1", aceptado: true },
        ]);
      }

      toast({ title: t("auth.tabSignUp"), description: t("auth.checkEmail") });
    } catch (err: any) {
      toast({ variant: "destructive", title: t("auth.errors.generic"), description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: emailForOtp,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("auth.errors.invalidOtp"),
        description: err?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email: emailForOtp,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getAuthRedirectUrl("/app"),
        },
      });
      toast({ title: t("auth.otpResend") });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(siEmail.trim(), {
        redirectTo: getAuthRedirectUrl("/reset-password"),
      });
      if (error) throw error;
      toast({
        title: "Email enviado",
        description: "Si la cuenta existe, recibirás un enlace para restablecer tu contraseña. Caduca en 1 hora.",
      });
      setStage("credentials");
    } catch (err: any) {
      // No revelamos si el email existe
      toast({
        title: "Email enviado",
        description: "Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="container flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          <Logo size={32} />
          <span className="font-display font-bold">CFS</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/" className="text-primary-foreground/80 hover:text-primary-foreground text-sm flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Link>
          <div className="text-primary-foreground"><LanguageSwitcher /></div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elevated animate-scale-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 inline-flex p-3 rounded-full bg-gradient-primary">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">{t("auth.title")}</CardTitle>
            <CardDescription>{t("app.tagline")}</CardDescription>
          </CardHeader>

          <CardContent>
            {stage === "otp" ? (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{t("auth.otpTitle")}</p>
                  <p className="mt-1">{t("auth.otpDesc")}</p>
                  <p className="mt-2 font-mono text-xs">{emailForOtp}</p>
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                  {t("auth.otpVerify")}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={resendOtp} disabled={loading}>
                  {t("auth.otpResend")}
                </Button>
              </form>
            ) : stage === "forgot" ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Introduce tu email y te enviaremos un enlace seguro para restablecer tu contraseña. El enlace caduca en 1 hora.
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fp-email">{t("auth.email")}</Label>
                  <Input id="fp-email" type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} autoComplete="email" />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !siEmail.trim()}>
                  Enviar enlace de recuperación
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStage("credentials")} disabled={loading}>
                  Volver al inicio de sesión
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="signin">
                <TabsList className="grid grid-cols-2 w-full mb-4">
                  <TabsTrigger value="signin">{t("auth.tabSignIn")}</TabsTrigger>
                  <TabsTrigger value="signup">{t("auth.tabSignUp")}</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="si-email">{t("auth.email")}</Label>
                      <Input id="si-email" type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="si-pwd">{t("auth.password")}</Label>
                      <Input id="si-pwd" type="password" required value={siPassword} onChange={(e) => setSiPassword(e.target.value)} autoComplete="current-password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {t("auth.signIn")}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setStage("forgot")}
                        className="text-xs text-primary hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      🔒 {t("auth.otpDesc").substring(0, 80)}…
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="su-name">{t("auth.fullName")}</Label>
                      <Input id="su-name" required value={suName} onChange={(e) => setSuName(e.target.value)} maxLength={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-email">{t("auth.email")}</Label>
                      <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} maxLength={255} autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-pwd">{t("auth.password")}</Label>
                      <Input id="su-pwd" type="password" required value={suPassword} onChange={(e) => setSuPassword(e.target.value)} minLength={8} autoComplete="new-password" />
                      <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
                    </div>

                    {/* Gating: implantación */}
                    <div className="rounded-md border border-border/70 bg-muted/40 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="implantacion"
                          checked={implantacionSent}
                          disabled={implantacionSent}
                          onCheckedChange={() => { /* solo se marca al enviar el formulario */ }}
                        />
                        <div className="flex-1">
                          <Label htmlFor="implantacion" className="text-sm leading-snug cursor-pointer">
                            {t("auth.consent.implantacionLabel")}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("auth.consent.implantacionHelp")}
                          </p>
                          {!implantacionSent && (
                            <ImplantacionDialog
                              defaultEmail={suEmail}
                              defaultName={suName}
                              onSubmitted={() => setImplantacionSent(true)}
                              trigger={
                                <Button type="button" size="sm" variant="outline" className="mt-2">
                                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                                  {t("auth.consent.implantacionCta")}
                                </Button>
                              }
                            />
                          )}
                          {implantacionSent && (
                            <p className="text-xs text-primary mt-1 font-medium">
                              ✓ {t("implantacion.successTitle")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Gating: privacidad */}
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="privacy"
                        checked={acceptPrivacy}
                        onCheckedChange={(v) => setAcceptPrivacy(v === true)}
                      />
                      <Label htmlFor="privacy" className="text-sm leading-snug cursor-pointer">
                        {t("auth.consent.privacyLabel")}{" "}
                        <PrivacyPolicyDialog
                          trigger={
                            <button type="button" className="underline text-primary hover:text-primary/80">
                              {t("auth.consent.privacyLink")}
                            </button>
                          }
                        />
                        .
                      </Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || !acceptPrivacy || !implantacionSent}>
                      {t("auth.signUp")}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
