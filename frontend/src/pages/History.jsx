
import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:5000/api/history";

function History() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API}?results=8000`);
      if (!response.ok) throw new Error("Unable to load history");

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error("Backend returned an error");
      }

      setHistory(
        result.history.map((item) => ({
          ...item,
          timestamp: new Date(item.created_at).getTime(),
        })).sort((a, b) => b.timestamp - a.timestamp)
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

  const filteredHistory = useMemo(() => {
    const now = Date.now();

    const durations = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };

    return history.filter((item) => {
      const matchesPeriod =
        period === "all" ||
        item.timestamp >= now - durations[period];

      const searchable = [
        item.entry_id,
        item.created_at,
        item.light_lux,
        item.humidity_raw,
        item.temperature_raw,
        item.soil_moisture,
      ].join(" ").toLowerCase();

      return matchesPeriod && searchable.includes(search.toLowerCase());
    });
  }, [history, period, search]);

  const downloadCSV = () => {
    const headers = [
      "Entry ID",
      "Date and Time",
      "Light (lux)",
      "Humidity Raw (ADC)",
      "Temperature Raw (ADC)",
      "Soil Moisture (relative %)",
      "Soil Raw",
    ];

    const rows = filteredHistory.map((item) => [
      item.entry_id,
      item.created_at,
      item.light_lux,
      item.humidity_raw,
      item.temperature_raw,
      item.soil_moisture,
      item.soil_raw,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plant-sensor-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="history-page">
      <div className="history-heading">
        <div>
          <h2>Plant History 📜</h2>
          <p>Your sensor station's recorded readings.</p>
        </div>

        <button
          className="download-button"
          onClick={downloadCSV}
          disabled={filteredHistory.length === 0}
        >
          ↓ Download CSV
        </button>
      </div>

      <div className="history-stats">
        <div className="history-stat">
          <span>Total Records</span>
          <h3>{history.length}</h3>
        </div>

        <div className="history-stat">
          <span>Displayed Records</span>
          <h3>{filteredHistory.length}</h3>
        </div>

        <div className="history-stat">
          <span>Latest Reading</span>
          <h3>
            {history.length
              ? new Date(history[0].timestamp).toLocaleTimeString()
              : "--"}
          </h3>
        </div>
      </div>

      <div className="history-filters">
        <input
          type="text"
          placeholder="Search readings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="1h">Last 1 Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>

        <button onClick={fetchHistory}>↻ Refresh</button>
      </div>

      {error && <p className="history-error">{error}</p>}

      {loading ? (
        <p>Loading history...</p>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Entry</th>
                <th>Date & Time</th>
                <th>Light (lux)</th>
                <th>Humidity (ADC)</th>
                <th>Temperature (ADC)</th>
                <th>Soil (%)</th>
                <th>Soil Raw</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.entry_id}>
                  <td>#{item.entry_id}</td>
                  <td>
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td>{item.light_lux ?? "--"}</td>
                  <td>{item.humidity_raw ?? "--"}</td>
                  <td>{item.temperature_raw ?? "--"}</td>
                  <td>{item.soil_moisture ?? "--"}%</td>
                  <td>{item.soil_raw ?? "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredHistory.length === 0 && (
            <div className="empty-history">
              No matching sensor records found.
            </div>
          )}
        </div>
      )}

      <p className="history-note">
        Readings refresh automatically every 20 seconds.
        Humidity and temperature are raw ADC values.
        Soil moisture is a calibrated relative percentage.
      </p>
    </div>
  );
}

export default History;
