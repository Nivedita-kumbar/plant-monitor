
import { useEffect, useMemo, useState } from "react";

const selectStyle = {
  padding: "12px 16px",
  borderRadius: "10px",
  border: "2px solid #39875b",
  backgroundColor: "#245c3a",
  color: "#ffffff",
  colorScheme: "dark",
  fontSize: "14px",
  fontWeight: "600",
  minWidth: "180px",
  cursor: "pointer",
  outline: "none",
};

const optionStyle = {
  backgroundColor: "#ffffff",
  color: "#245c3a",
};

function History() {
  const [history, setHistory] = useState([]);
  const [zones, setZones] = useState([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");

  function loadHistory() {
    try {
      const savedAlerts = JSON.parse(
        localStorage.getItem("plantAlertHistory") || "[]"
      );

      const savedZones = JSON.parse(
        localStorage.getItem("plantZones") || "[]"
      );

      setHistory(
        savedAlerts.sort(
          (a, b) =>
            new Date(b.startedAt).getTime() -
            new Date(a.startedAt).getTime()
        )
      );

      setZones(savedZones);
    } catch (error) {
      console.error("Could not load alert history:", error);
    }
  }

  useEffect(() => {
    loadHistory();

    const interval = setInterval(loadHistory, 5000);

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
      const timestamp = new Date(item.startedAt).getTime();

      const matchesPeriod =
        period === "all" ||
        timestamp >= now - durations[period];

      const matchesZone =
        selectedZone === "all" ||
        item.zoneId === selectedZone;

      const searchable = [
        item.zoneId,
        item.zoneName,
        item.message,
        item.status,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesPeriod &&
        matchesZone &&
        searchable.includes(search.toLowerCase())
      );
    });
  }, [history, period, search, selectedZone]);

  const activeCount = history.filter(
    (item) => item.status === "active"
  ).length;

  const resolvedCount = history.filter(
    (item) => item.status === "resolved"
  ).length;

  const downloadCSV = () => {
    const headers = [
      "Zone ID",
      "Zone Name",
      "Alert",
      "Status",
      "Started At",
      "Resolved At",
    ];

    const rows = filteredHistory.map((item) => [
      item.zoneId,
      item.zoneName,
      item.message,
      item.status,
      item.startedAt,
      item.resolvedAt || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "plant-alert-history.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="history-page">
      <div className="history-heading">
        <div>
          <h2>Plant Alert History 📜</h2>
          <p>Track plant alerts across all your nursery zones.</p>
        </div>

        <button
          className="download-button"
          onClick={downloadCSV}
          disabled={filteredHistory.length === 0}
        >
          ↓ Download CSV
        </button>
      </div>

      {/* Statistics */}
      <div className="history-stats">
        <div className="history-stat">
          <span>Total Alerts</span>
          <h3>{history.length}</h3>
        </div>

        <div className="history-stat">
          <span>Active Alerts</span>
          <h3>{activeCount}</h3>
        </div>

        <div className="history-stat">
          <span>Resolved Alerts</span>
          <h3>{resolvedCount}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <input
          type="text"
          placeholder="Search alerts or zones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          style={selectStyle}
        >
          <option value="all" style={optionStyle}>
            All Zones
          </option>

          {zones.map((zone) => (
            <option
              key={zone.id}
              value={zone.id}
              style={optionStyle}
            >
              {zone.id} - {zone.name}
            </option>
          ))}
        </select>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={selectStyle}
        >
          <option value="all" style={optionStyle}>
            All Time
          </option>
          <option value="1h" style={optionStyle}>
            Last 1 Hour
          </option>
          <option value="24h" style={optionStyle}>
            Last 24 Hours
          </option>
          <option value="7d" style={optionStyle}>
            Last 7 Days
          </option>
        </select>

        <button onClick={loadHistory}>
          ↻ Refresh
        </button>
      </div>

      {/* Zone-wise alert history */}
      {zones.map((zone) => {
        const zoneAlerts = filteredHistory.filter(
          (item) => item.zoneId === zone.id
        );

        if (
          selectedZone !== "all" &&
          selectedZone !== zone.id
        ) {
          return null;
        }

        return (
          <section
            className="zone-history-section"
            key={zone.id}
          >
            <div className="zone-history-heading">
              <div>
                <h3>🌱 {zone.id}</h3>
                <p>{zone.name}</p>
              </div>

              <span className="zone-alert-count">
                {zoneAlerts.length} Alerts
              </span>
            </div>

            {zoneAlerts.length === 0 ? (
              <div className="empty-history">
                No alerts recorded for this zone.
              </div>
            ) : (
              <div className="alert-history-list">
                {zoneAlerts.map((item) => (
                  <div
                    className="alert-history-card"
                    key={item.id}
                  >
                    <div className="alert-history-top">
                      <strong>⚠️ {item.message}</strong>

                      <span
                        className={
                          item.status === "active"
                            ? "alert-status active"
                            : "alert-status resolved"
                        }
                      >
                        {item.status === "active"
                          ? "Active"
                          : "Resolved"}
                      </span>
                    </div>

                    <p>
                      <strong>Started:</strong>{" "}
                      {new Date(
                        item.startedAt
                      ).toLocaleString()}
                    </p>

                    {item.resolvedAt && (
                      <p>
                        <strong>Resolved:</strong>{" "}
                        {new Date(
                          item.resolvedAt
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {zones.length === 0 && (
        <div className="empty-history">
          No zones have been created yet.
        </div>
      )}

      <p className="history-note">
        Only alert events are displayed. Normal sensor readings
        are not stored in this history.
      </p>
    </div>
  );
}

export default History;
