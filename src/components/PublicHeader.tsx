import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ManualDialog } from "./ManualDialog";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";

export function PublicHeader() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-primary">
          <Logo size={36} />
          <span className="hidden sm:inline text-lg">CFA</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/publico">
            <Button variant="ghost" size="sm">{t("nav.public")}</Button>
          </Link>
          <Link to="/centros-publico">
            <Button variant="ghost" size="sm">{t("nav.centrosPublico")}</Button>
          </Link>
          <Link to="/alumno">
            <Button variant="ghost" size="sm">{t("nav.studentAccess")}</Button>
          </Link>
          <ManualDialog />
          <LanguageSwitcher />
          {user ? (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/app")}>
                <UserIcon className="h-4 w-4 mr-1.5" /> {t("nav.dashboard")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { void signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-energy text-secondary-foreground shadow-energy hover:opacity-95">
                {t("nav.login")}
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
