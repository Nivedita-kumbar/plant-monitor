
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

function Graphs() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API}?results=800`);
      if (!response.ok) throw new Error("Could not fetch sensor history");

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error("Backend returned an error");
      }

      setHistory(
        result.history
          .map((item) => ({
            ...item,
            timestamp: new Date(item.created_at).getTime(),
            time: new Date(item.created_at).toLocaleString(),
            light: Number(item.light_lux),
            soil: Number(item.soil_moisture),
            humidity: Number(item.humidity_raw),
            temperature: Number(item.temperature_raw),
          }))
          .filter((item) => Number.isFinite(item.timestamp))
          .sort((a, b) => a.timestamp - b.timestamp)
      );

      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 20000);

    return () => clearInterval(interval);
  }, []);

  const durations = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };

  const filteredHistory = history.filter(
    (item) => item.timestamp >= Date.now() - durations[filter]
  );

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
      title: "Humidity Sensor",
      key: "humidity",
      unit: "ADC",
      color: "#3996c9",
      description: "Raw analog sensor reading",
    },
    {
      title: "Temperature Sensor",
      key: "temperature",
      unit: "ADC",
      color: "#d66b58",
      description: "Raw analog sensor reading",
    },
  ];

  const latest = filteredHistory[filteredHistory.length - 1];

  return (
    <div className="graphs-page">
      <div className="graphs-heading">
        <div>
          <h2>Sensor Analytics 📊</h2>
          <p>Monitor your plant environment over time.</p>
        </div>

        <button className="refresh-button" onClick={fetchHistory}>
          ↻ Refresh
        </button>
      </div>

      <div className="graph-controls">
        <span>Time period:</span>

        {[
          ["1h", "Last 1 Hour"],
          ["24h", "Last 24 Hours"],
          ["7d", "Last 7 Days"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "filter-active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="graph-error">{error}</p>}

      {loading ? (
        <p>Loading sensor data...</p>
      ) : filteredHistory.length === 0 ? (
        <div className="no-data">
          <h3>No readings in this time period 🌱</h3>
          <p>
            Keep your ESP32 running. New sensor readings will appear here
            automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="graph-summary">
            <div className="summary-card">
              <span>Data points</span>
              <h3>{filteredHistory.length}</h3>
            </div>

            <div className="summary-card">
              <span>Latest light</span>
              <h3>{latest.light} lux</h3>
            </div>

            <div className="summary-card">
              <span>Latest soil moisture</span>
              <h3>{latest.soil}%</h3>
            </div>
          </div>

          <div className="chart-grid">
            {chartConfigs.map((config) => (
              <div className="chart-card" key={config.key}>
                <h3>{config.title}</h3>
                <p>{config.description}</p>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredHistory}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 0,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        type="number"
                        scale="time"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
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
            Showing {filteredHistory.length} readings · Automatically
            refreshes every 20 seconds.
          </p>
        </>
      )}
    </div>
  );
}

export default Graphs;
