import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import AppShell from "@/components/AppShell";
import MapPage from "@/pages/MapPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/carte" element={<MapPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
