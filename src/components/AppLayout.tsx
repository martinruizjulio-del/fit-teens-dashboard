import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Building2, Users, GraduationCap, ShieldCheck, LogOut,
} from "lucide-react";
import { useEffect } from "react";

export function AppLayout() {
  const { t } = useTranslation();
  const { user, loading, isAdmin, signOut, impersonating, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }
  if (!user) return null;

  const navItems = [
    { to: "/app", icon: LayoutDashboard, label: t("nav.dashboard"), end: true },
    { to: "/app/centros", icon: Building2, label: t("nav.centros") },
    { to: "/app/grupos", icon: Users, label: t("nav.grupos") },
    { to: "/app/alumnos", icon: GraduationCap, label: t("nav.alumnos") },
  ];

  return (
    <div className="min-h-screen flex w-full bg-gradient-soft">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <Link to="/app" className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
          <Logo size={32} />
          <span className="font-display font-bold text-lg text-sidebar-foreground">CFS</span>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-base ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-base mt-4 border-t border-sidebar-border pt-4 ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                }`
              }
            >
              <ShieldCheck className="h-4 w-4" />
              {t("nav.admin")}
            </NavLink>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <div className="px-3 py-1.5">
            <LanguageSwitcher />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            onClick={() => { void signOut(); navigate("/"); }}
          >
            <LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b bg-background">
          <Link to="/app" className="flex items-center gap-2 font-display font-bold text-primary">
            <Logo size={28} /> CFS
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={() => { void signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {impersonating && (
          <div className="bg-secondary/15 border-b border-secondary/30 px-4 py-2 text-sm flex items-center justify-between gap-2">
            <span className="text-foreground">
              👤 Suplantando a <strong>{impersonating.fullName}</strong> <span className="text-muted-foreground">({impersonating.email})</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => { stopImpersonation(); navigate("/admin"); }}>
              Salir de suplantación
            </Button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav className="md:hidden flex items-center justify-around border-t bg-background py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1.5 text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
