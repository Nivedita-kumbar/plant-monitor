
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [sensors, setSensors] = useState(null);
  const [error, setError] = useState("");

  const fetchSensors = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/sensors");
      if (!response.ok) throw new Error("Could not fetch sensor data");

      const data = await response.json();
      setSensors(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSensors();

    const interval = setInterval(fetchSensors, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <header>
        <h1>🌱 Plant Monitor</h1>
        <p>Smart, personalised crop monitoring system</p>
      </header>

      <section className="status-card">
        <h2>Live Sensor Dashboard</h2>

        {error && <p className="error">{error}</p>}

        {!sensors && !error && <p>Loading sensor data...</p>}

        {sensors && (
          <>
            <p className="connected">● Sensors Connected</p>

            <div className="sensor-grid">
              <div className="sensor-card">
                <h3>☀️ Light Intensity</h3>
                <p>{sensors.light_lux} lux</p>
              </div>

              <div className="sensor-card">
                <h3>💧 Humidity Raw</h3>
                <p>{sensors.humidity_raw}</p>
              </div>

              <div className="sensor-card">
                <h3>🌡️ Temperature Raw</h3>
                <p>{sensors.temperature_raw}</p>
              </div>

              <div className="sensor-card">
                <h3>🌱 Soil Moisture</h3>
                <p>{sensors.soil_moisture}%</p>
              </div>

              <div className="sensor-card">
                <h3>Soil Raw ADC</h3>
                <p>{sensors.soil_raw}</p>
              </div>
            </div>

            <p className="updated">
              Last reading: {new Date(sensors.created_at).toLocaleString()}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default App;
