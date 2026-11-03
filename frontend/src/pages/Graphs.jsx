import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API = "http://127.0.0.1:5000/api/history";

const DEFAULT_ZONE = {
  id: "ZONE-01",
  name: "Demo Nursery Zone",
  deviceId: "ESP32-001",
};

function getSavedZones() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("plantZones") || "[]"
    );

    return Array.isArray(saved) && saved.length > 0
      ? saved
      : [DEFAULT_ZONE];
  } catch {
    return [DEFAULT_ZONE];
  }
}

const chartConfigs = [
  {
    title: "Light Intensity",
    key: "light",
    unit: "lux",
    color: "#e6a23c",
    description: "Ambient light measured by BH1750",
  },
  {
    title: "Soil Moisture",
    key: "soil",
    unit: "%",
    color: "#39875b",
    description: "Calibrated relative soil moisture",
  },
  {
    title: "Humidity",
    key: "humidity",
    unit: "%",
    color: "#3996c9",
    description: "Ambient relative humidity",
  },
  {
    title: "Temperature",
    key: "temperature",
    unit: "°C",
    color: "#d66b58",
    description: "Ambient temperature",
  },
];

function Graphs() {
  const [zones, setZones] = useState(getSavedZones);
  const [selectedZone, setSelectedZone] = useState(
    () => getSavedZones()[0]?.id || "ZONE-01"
  );

  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeZone = zones.find(
    (zone) => zone.id === selectedZone
  );

  const hasLiveHardware =
    activeZone?.id === "ZONE-01" ||
    activeZone?.deviceId === "ESP32-001" ||
    activeZone?.device === "ESP32-001";

  // Keep zone list updated
  useEffect(() => {
    const updateZones = () => {
      const savedZones = getSavedZones();
      setZones(savedZones);

      if (
        !savedZones.some(
          (zone) => zone.id === selectedZone
        )
      ) {
        setSelectedZone(savedZones[0]?.id || "ZONE-01");
      }
    };

    updateZones();

    window.addEventListener("storage", updateZones);

    const interval = setInterval(updateZones, 5000);

    return () => {
      window.removeEventListener("storage", updateZones);
      clearInterval(interval);
    };
  }, [selectedZone]);

  // Fetch historical readings
  const fetchHistory = async () => {
    if (!hasLiveHardware) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API}?results=800`);

      if (!response.ok) {
        throw new Error("Could not fetch sensor history");
      }

      const result = await response.json();

      if (result.status !== "success") {
        throw new Error("Backend returned an error");
      }

      const formattedHistory = result.history
        .map((item) => ({
          ...item,
          timestamp: new Date(item.created_at).getTime(),
          light: Number(item.light_lux),
          soil: Number(item.soil_moisture),

          // Backend now returns calibrated values
          humidity: Number(item.humidity),
          temperature: Number(item.temperature),
        }))
        .filter(
          (item) =>
            Number.isFinite(item.timestamp) &&
            item.created_at &&
            Number.isFinite(item.humidity) &&
            Number.isFinite(item.temperature)
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      setHistory(formattedHistory);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh when selected zone changes
  useEffect(() => {
    setLoading(true);
    setError("");
    setHistory([]);

    if (!hasLiveHardware) {
      setLoading(false);
      return;
    }

    fetchHistory();

    const interval = setInterval(fetchHistory, 20000);

    return () => clearInterval(interval);
  }, [selectedZone, hasLiveHardware]);

  const durations = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };

  const filteredHistory = history.filter(
    (item) =>
      item.timestamp >= Date.now() - durations[filter]
  );

  const latest =
    filteredHistory[filteredHistory.length - 1];

  return (
    <div className="graphs-page">

      {/* Heading */}
      <div className="graphs-heading">
        <div>
          <h2>Sensor Analytics 📊</h2>
          <p>Monitor your plant environment zone by zone.</p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchHistory}
          disabled={!hasLiveHardware}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Zone Selector */}
      <div
        className="graph-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: "600" }}>
          Select Zone:
        </span>

        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            border: "2px solid #39875b",
            backgroundColor: "#245c3a",
            color: "#ffffff",
            colorScheme: "dark",
            fontSize: "15px",
            fontWeight: "600",
            minWidth: "240px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {zones.map((zone) => (
            <option
              key={zone.id}
              value={zone.id}
              style={{
                backgroundColor: "#ffffff",
                color: "#245c3a",
              }}
            >
              {zone.name} ({zone.id})
            </option>
          ))}
        </select>
      </div>

      {/* Zone Information */}
      <div
        className="summary-card"
        style={{ marginBottom: "20px" }}
      >
        <span>Currently Viewing</span>

        <h3>
          {activeZone?.name || "Selected Zone"}
        </h3>

        <p>Zone ID: {activeZone?.id || selectedZone}</p>

        <p>
          Hardware: {activeZone?.deviceId || activeZone?.device || "Not assigned"}
        </p>

        <p>
          Status:{" "}
          {hasLiveHardware
            ? "Connected to live sensor data"
            : "No sensor data connected"}
        </p>
      </div>

      {/* No Hardware Message */}
      {!hasLiveHardware ? (
        <div className="no-data">
          <h3>🌱 No sensor data available for this zone</h3>

          <p>
            This zone has not been connected to a physical
            ESP32 yet. Its graphs will appear once hardware
            is assigned.
          </p>
        </div>
      ) : (
        <>
          {/* Time Filters */}
          <div className="graph-controls">
            <span>Time period:</span>

            {[
              ["1h", "Last 1 Hour"],
              ["24h", "Last 24 Hours"],
              ["7d", "Last 7 Days"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={
                  filter === value ? "filter-active" : ""
                }
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <p className="graph-error">{error}</p>
          )}

          {loading ? (
            <p>Loading sensor data...</p>
          ) : filteredHistory.length === 0 ? (
            <div className="no-data">
              <h3>No readings in this time period 🌱</h3>

              <p>
                Keep your ESP32 running. New readings will
                appear here automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="graph-summary">
                <div className="summary-card">
                  <span>Data Points</span>
                  <h3>{filteredHistory.length}</h3>
                </div>

                <div className="summary-card">
                  <span>Latest Light</span>
                  <h3>{latest.light} lux</h3>
                </div>

                <div className="summary-card">
                  <span>Latest Soil Moisture</span>
                  <h3>{latest.soil}%</h3>
                </div>

                <div className="summary-card">
                  <span>Latest Humidity</span>
                  <h3>{latest.humidity}%</h3>
                </div>

                <div className="summary-card">
                  <span>Latest Temperature</span>
                  <h3>{latest.temperature}°C</h3>
                </div>
              </div>

              {/* Sensor Graphs */}
              <div className="chart-grid">
                {chartConfigs.map((config) => (
                  <div
                    className="chart-card"
                    key={config.key}
                  >
                    <h3>{config.title}</h3>
                    <p>{config.description}</p>

                    <div className="chart-container">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <LineChart
                          data={filteredHistory}
                          margin={{
                            top: 10,
                            right: 20,
                            left: 0,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                          />

                          <XAxis
                            dataKey="timestamp"
                            type="number"
                            scale="time"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            }
                            tick={{ fontSize: 11 }}
                          />

                          <YAxis
                            width={55}
                            tick={{ fontSize: 11 }}
                          />

                          <Tooltip
                            labelFormatter={(value) =>
                              new Date(value).toLocaleString()
                            }
                            formatter={(value) => [
                              `${value} ${config.unit}`,
                              config.title,
                            ]}
                          />

                          <Line
                            type="monotone"
                            dataKey={config.key}
                            stroke={config.color}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5 }}
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>

              <p className="last-updated">
                Showing {filteredHistory.length} readings.
                Automatically refreshes every 20 seconds.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Graphs;