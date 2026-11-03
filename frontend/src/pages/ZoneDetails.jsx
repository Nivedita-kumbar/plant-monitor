import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function ZoneDetails() {
  const { zoneId } = useParams();
  const navigate = useNavigate();

  const [sensors, setSensors] = useState(null);
  const [error, setError] = useState("");

  const [zones] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("plantZones")) || [];
    } catch {
      return [];
    }
  });

  const [profiles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("plantProfiles")) || [];
    } catch {
      return [];
    }
  });

  // Find the selected zone
  const zone = zones.find((item) => item.id === zoneId);

  // Find the profile assigned to this zone
  const plant =
    profiles.find(
      (profile) =>
        profile.id?.toString() === zone?.profileId?.toString()
    ) || (zoneId === "ZONE-01" ? profiles[0] : null);

  // Only Zone 01 has the physical ESP32 connection
  const isLiveZone =
    zone?.id === "ZONE-01" && zone?.device === "ESP32-001";

  useEffect(() => {
    if (!isLiveZone) return;

    let active = true;

    const fetchSensors = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/sensors"
        );

        if (!response.ok) {
          throw new Error("Sensor backend unavailable");
        }

        const data = await response.json();

        if (active && data.status === "success") {
          setSensors(data);
          setError("");
        } else if (active) {
          setError("No valid sensor readings received.");
        }
      } catch {
        if (active) {
          setError("Could not connect to the sensor backend.");
        }
      }
    };

    fetchSensors();

    const interval = setInterval(fetchSensors, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isLiveZone]);

  // Handle invalid zone IDs
  if (!zone) {
    return (
      <div className="zone-details-page">
        <h1>Zone not found</h1>
        <p>This zone does not exist or may have been removed.</p>

        <button
          className="zone-button"
          onClick={() => navigate("/zones")}
        >
          ← Back to Zones
        </button>
      </div>
    );
  }

  // Calculate personalised alerts
  const getAlerts = () => {
    if (!isLiveZone || !sensors || !plant) return [];

    const alerts = [];

    const light = Number(sensors.light_lux);
    const soil = Number(sensors.soil_moisture);

    if (
      Number.isFinite(light) &&
      light < Number(plant.minLight)
    ) {
      alerts.push(`Low light: ${light} lux`);
    }

    if (
      Number.isFinite(soil) &&
      soil < Number(plant.minSoil)
    ) {
      alerts.push(`Soil too dry: ${soil}%`);
    }

    if (
      Number.isFinite(soil) &&
      soil > Number(plant.maxSoil)
    ) {
      alerts.push(`Soil too wet: ${soil}%`);
    }

    return alerts;
  };

  const alerts = getAlerts();

  return (
    <div className="zone-details-page">

      <button
        className="zone-button"
        onClick={() => navigate("/zones")}
      >
        ← Back to Zones
      </button>

      <header>
        <h1>🌱 {zone.name}</h1>
        <p>{zone.id} — Nursery Zone Monitoring</p>
      </header>

      {/* Zone Information */}
      <section className="status-card">
        <h2>Zone Information</h2>

        <p><strong>Zone ID:</strong> {zone.id}</p>

        <p><strong>Zone Name:</strong> {zone.name}</p>

        <p><strong>Device:</strong> {zone.device}</p>

        <p>
          <strong>Device Status:</strong>{" "}
          {isLiveZone ? "🟢 Connected" : "⚪ Not connected"}
        </p>

        <p>
          <strong>Assigned Plant:</strong>{" "}
          {plant ? plant.name : "No plant profile assigned"}
        </p>

        {plant && (
          <p>
            <strong>Growth Stage:</strong> {plant.stage}
          </p>
        )}
      </section>

      {/* Live Sensor Readings */}
      <section className="status-card">
        <h2>📡 Live Sensor Readings</h2>

        {!isLiveZone ? (
          <p>
            This zone does not have a live ESP32 sensor connection yet.
          </p>
        ) : (
          <>
            {error && <p className="error">{error}</p>}

            {!sensors && !error && (
              <p>Fetching sensor readings...</p>
            )}

            {sensors && (
              <>
                <div className="sensor-grid">

                  <div className="sensor-card">
                    <h3>☀️ Light Intensity</h3>
                    <p>{sensors.light_lux} lux</p>
                  </div>

                  <div className="sensor-card">
                    <h3>💧 Soil Moisture</h3>
                    <p>{sensors.soil_moisture}%</p>
                  </div>

                  <div className="sensor-card">
                    <h3>🌡️ Temperature</h3>
                    <p>
                      {sensors.temperature != null
                        ? `${Number(sensors.temperature).toFixed(1)} °C`
                        : "--"}
                    </p>
                  </div>

                  <div className="sensor-card">
                    <h3>💦 Humidity</h3>
                    <p>
                      {sensors.humidity != null
                        ? `${Number(sensors.humidity).toFixed(1)} %`
                        : "--"}
                    </p>
                  </div>

                </div>

                <p className="updated">
                  Last reading:{" "}
                  {sensors.created_at
                    ? new Date(sensors.created_at).toLocaleString()
                    : "Unavailable"}
                </p>
              </>
            )}
          </>
        )}
      </section>

      {/* Plant Thresholds */}
      <section className="status-card">
        <h2>⚙️ Plant Thresholds</h2>

        {plant ? (
          <>
            <p>Plant: {plant.name}</p>
            <p>Minimum light: {plant.minLight} lux</p>
            <p>Minimum soil moisture: {plant.minSoil}%</p>
            <p>Maximum soil moisture: {plant.maxSoil}%</p>
          </>
        ) : (
          <p>Assign a plant profile to enable personalised thresholds.</p>
        )}
      </section>

      {/* Zone Alerts */}
      <section className="status-card">
        <h2>🚨 Zone Alerts</h2>

        {!plant ? (
          <p>Assign a plant profile to enable personalised alerts.</p>
        ) : !isLiveZone ? (
          <p>Waiting for a sensor connection to enable live alerts.</p>
        ) : !sensors ? (
          <p>Waiting for sensor data...</p>
        ) : alerts.length > 0 ? (
          alerts.map((alert, index) => (
            <p className="error" key={index}>
              ⚠️ {alert}
            </p>
          ))
        ) : (
          <p>
            🟢 All monitored conditions are within your configured limits!
          </p>
        )}
      </section>

    </div>
  );
}

export default ZoneDetails;