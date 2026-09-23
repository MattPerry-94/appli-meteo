import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import AppShell from "@/components/AppShell";

// La carte (radar Windy, contours des départements) n'est chargée qu'à la
// première visite de l'onglet : l'accueil n'en paie pas le poids.
const MapPage = lazy(() => import("@/pages/MapPage"));

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/carte"
            element={
              <Suspense fallback={<div className="skeleton h-40 rounded-3xl" />}>
                <MapPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}
