import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Sun, Map, SunMedium, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

function AppNavLink(props: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5",
          "dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/5",
          isActive && "bg-sky-500/10 text-slate-900 ring-1 ring-sky-200/70 dark:bg-white/10 dark:text-white dark:ring-white/10",
        )
      }
    >
      <span className="text-slate-500 transition group-hover:text-slate-900 dark:text-zinc-400 dark:group-hover:text-white">
        {props.icon}
      </span>
      <span>{props.label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="grainient-surface min-h-dvh text-slate-950 dark:text-zinc-50">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-10 pt-6 md:px-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-white/72 ring-1 ring-sky-100/90 shadow-sm backdrop-blur-md dark:bg-white/5 dark:ring-white/10 dark:shadow-none">
              <Sun className="size-5 text-amber-500 dark:text-sky-200" />
            </div>
            <div className="leading-tight">
              <div className="text-sm text-slate-600 dark:text-zinc-300">Projet météo</div>
              <div className="font-serif text-xl tracking-tight">Meteo</div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              "bg-white/72 ring-1 ring-sky-100/90 shadow-sm backdrop-blur-md hover:bg-white/82",
              "dark:bg-white/5 dark:ring-white/10 dark:shadow-none dark:hover:bg-white/10",
            )}
          >
            {isDark ? <Moon className="size-4 text-slate-700 dark:text-zinc-200" /> : <SunMedium className="size-4 text-amber-600" />}
            <span className="hidden sm:inline">{isDark ? "Sombre" : "Clair"}</span>
          </button>
        </header>

        <nav className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/72 p-2 ring-1 ring-sky-100/90 shadow-sm backdrop-blur-md dark:bg-white/5 dark:ring-white/10 dark:shadow-none sm:flex sm:flex-wrap">
          <AppNavLink to="/" label="Accueil" icon={<Sun className="size-4" />} />
          <AppNavLink to="/carte" label="Carte" icon={<Map className="size-4" />} />
        </nav>

        <main className="mt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
