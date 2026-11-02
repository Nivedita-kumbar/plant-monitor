
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Profiles from "./pages/Profiles";
import Graphs from "./pages/Graphs";
import History from "./pages/History";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="dashboard">
        <Navbar />

        <Routes>
          <Route path="/" element={<Profiles />} />
          <Route path="/graphs" element={<Graphs />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
