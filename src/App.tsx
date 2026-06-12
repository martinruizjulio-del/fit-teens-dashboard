import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import "@/i18n";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Publico from "./pages/Publico";
import AlumnoAcceso from "./pages/AlumnoAcceso";
import Admin from "./pages/Admin";
import CentrosPublico from "./pages/CentrosPublico";
import Instalar from "./pages/Instalar";

import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Centros from "./pages/app/Centros";
import Grupos from "./pages/app/Grupos";
import Alumnos from "./pages/app/Alumnos";
import Pruebas from "./pages/app/Pruebas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/publico" element={<Publico />} />
            <Route path="/centros-publico" element={<CentrosPublico />} />
            <Route path="/instalar" element={<Instalar />} />
            <Route path="/alumno" element={<AlumnoAcceso />} />
            <Route path="/alumno/:codigo" element={<AlumnoAcceso />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="centros" element={<Centros />} />
              <Route path="grupos" element={<Grupos />} />
              <Route path="alumnos" element={<Alumnos />} />
              <Route path="pruebas/:alumnoId" element={<Pruebas />} />
            </Route>

            <Route path="/admin" element={<AppLayout />}>
              <Route index element={<Admin />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
