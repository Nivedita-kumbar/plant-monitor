
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Profiles from "./pages/Profiles";
import Graphs from "./pages/Graphs";
import History from "./pages/History";
import Zones from "./pages/Zones";
import "./App.css";
import ZoneDetails from "./pages/ZoneDetails";

function App() {
  return (
    <BrowserRouter>
      <div className="dashboard">
        <Navbar />

        <Routes>
          <Route path="/zones/:zoneId" element={<ZoneDetails />} />
          <Route path="/" element={<Profiles />} />
          <Route path="/zones" element={<Zones />} />
          <Route path="/graphs" element={<Graphs />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
