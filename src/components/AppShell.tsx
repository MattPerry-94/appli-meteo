import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Sun, Map, SunMedium, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

function AppNavLink(props: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink to={props.to} className={({ isActive }) => cn("segment flex-1 sm:flex-none", isActive && "segment-active")}>
      <span className="opacity-80">{props.icon}</span>
      <span>{props.label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="grainient-surface ambience-fade min-h-dvh text-slate-900 dark:text-zinc-50">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-5 md:px-6">
        <header className="sticky top-3 z-30 flex items-center justify-between gap-3 rounded-3xl border border-slate-900/[0.07] bg-white/70 px-3 py-2.5 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="accent-surface accent-glow relative grid size-11 shrink-0 place-items-center rounded-2xl">
              <Sun className="size-5 text-white drop-shadow-sm" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="eyebrow">Projet météo</div>
              <div className="display text-xl">Meteo</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="segment-group hidden sm:flex">
              <AppNavLink to="/" label="Accueil" icon={<Sun className="size-4" />} />
              <AppNavLink to="/carte" label="Carte" icon={<Map className="size-4" />} />
            </nav>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Passer en thème clair" : "Passer en thème sombre"}
              className="btn btn-ghost rounded-2xl"
            >
              {isDark ? <Moon className="accent-ink size-4" /> : <SunMedium className="size-4 text-amber-500" />}
              <span className="hidden md:inline">{isDark ? "Sombre" : "Clair"}</span>
            </button>
          </div>
        </header>

        <nav className="segment-group mt-3 flex w-full sm:hidden">
          <AppNavLink to="/" label="Accueil" icon={<Sun className="size-4" />} />
          <AppNavLink to="/carte" label="Carte" icon={<Map className="size-4" />} />
        </nav>

        <main className="mt-6 animate-rise">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
