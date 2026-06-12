import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";
import { Activity, ShieldCheck, KeyRound, BarChart3, ArrowRight, GraduationCap, User, Lock } from "lucide-react";
import heroDesktop from "@/assets/hero-cfa.webp.asset.json";
import heroMobile from "@/assets/hero-cfa-960.webp.asset.json";

const Index = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Activity, title: t("landing.feature1Title"), desc: t("landing.feature1Desc") },
    { icon: ShieldCheck, title: t("landing.feature2Title"), desc: t("landing.feature2Desc") },
    { icon: KeyRound, title: t("landing.feature3Title"), desc: t("landing.feature3Desc") },
    { icon: BarChart3, title: t("landing.feature4Title"), desc: t("landing.feature4Desc") },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <picture>
          <source media="(max-width: 767px)" srcSet={heroMobile.url} type="image/webp" />
          <img
            src={heroDesktop.url}
            alt=""
            width={1600}
            height={896}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-hero opacity-80" aria-hidden="true" />
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-secondary blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-primary-glow blur-3xl" />
        </div>
        <div className="container relative py-20 md:py-28 flex flex-col items-center text-center animate-fade-in">
          <Logo size={72} className="mb-6" />
          <h1 className="font-display text-4xl md:text-6xl font-bold max-w-4xl leading-tight">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-primary-foreground/85">
            {t("landing.heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-energy text-base px-7">
                {t("landing.ctaTeacher")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/alumno">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white text-base px-7">
                {t("landing.ctaStudent")}
              </Button>
            </Link>
            <Link to="/publico">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white text-base px-7">
                {t("landing.ctaPublic")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Access section */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("landing.accessTitle")}</h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl mx-auto">{t("landing.accessSubtitle")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 max-w-3xl mx-auto">
          <Card className="p-6 border-border/50 hover:shadow-elevated transition-smooth bg-card flex flex-col">
            <div className="inline-flex p-3 rounded-lg bg-gradient-primary text-primary-foreground mb-4 shadow-glow self-start">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-lg text-foreground mb-1">{t("landing.accessTeacherTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{t("landing.accessTeacherDesc")}</p>
            <Link to="/auth">
              <Button className="w-full bg-gradient-energy text-secondary-foreground shadow-energy hover:opacity-95">
                {t("landing.accessTeacherCta")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>

          <Card className="p-6 border-border/50 hover:shadow-elevated transition-smooth bg-card flex flex-col">
            <div className="inline-flex p-3 rounded-lg bg-gradient-primary text-primary-foreground mb-4 shadow-glow self-start">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-lg text-foreground mb-1">{t("landing.accessStudentTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{t("landing.accessStudentDesc")}</p>
            <Link to="/alumno">
              <Button variant="outline" className="w-full">
                {t("landing.accessStudentCta")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="container py-12 md:py-20 border-t border-border/40">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <Card
              key={i}
              className="p-6 border-border/50 hover:shadow-elevated hover:-translate-y-1 transition-smooth bg-card"
            >
              <div className="inline-flex p-3 rounded-lg bg-gradient-primary text-primary-foreground mb-4 shadow-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Acceso administrador discreto */}
      <div className="container pb-8 flex justify-end">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          aria-label={t("landing.adminAccess")}
        >
          <Lock className="h-3 w-3" />
          {t("landing.adminAccess")}
        </Link>
      </div>

      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
