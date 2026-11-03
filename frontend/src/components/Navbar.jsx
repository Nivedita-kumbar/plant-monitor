
import { NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">🌱 Plant Monitor</div>

      <div className="nav-links">
        <NavLink to="/" end>Plant Profiles</NavLink>
        <NavLink to="/zones">Zones</NavLink>
        <NavLink to="/graphs">Sensor Graphs</NavLink>
        <NavLink to="/history">Plant History</NavLink>
      </div>
    </nav>
  );
}

export default Navbar;

