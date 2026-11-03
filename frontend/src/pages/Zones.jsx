

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Zones.css";

const defaultZones = [
  {
    id: "ZONE-01",
    name: "Demo Nursery Zone",
    plant: "Demo Plant",
    device: "ESP32-001",
    description: "Main prototype monitoring area",
  },
];

const REQUIRED_READINGS = 2;

function readLocalStorage(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved ?? fallback;
  } catch {
    return fallback;
  }
}

function Zones() {
  const navigate = useNavigate();

  const [zones, setZones] = useState(() =>
    readLocalStorage("plantZones", defaultZones)
  );

  const [profiles] = useState(() =>
    readLocalStorage("plantProfiles", [])
  );

  const [showForm, setShowForm] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const [sensors, setSensors] = useState(null);

  const plantProfile = profiles[0] || null;

  // Set default plant profile
  useEffect(() => {
    setSelectedProfileId(profiles[0]?.id?.toString() || "");
  }, []);

  // Fetch live sensor readings every 20 seconds
  useEffect(() => {
    let active = true;

    const fetchSensors = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/sensors"
        );

        if (!response.ok) {
          throw new Error("Sensor API request failed");
        }

        const data = await response.json();

        if (active && data.status === "success") {
          setSensors(data);
        }
      } catch (error) {
        console.error("Could not fetch sensor data:", error);
      }
    };

    fetchSensors();

    const interval = setInterval(fetchSensors, 20000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Save zones
  useEffect(() => {
    localStorage.setItem("plantZones", JSON.stringify(zones));
  }, [zones]);

  // SMART ALERT HISTORY SYSTEM
  useEffect(() => {
    if (!sensors) return;

    // Prevent processing the same ThingSpeak reading twice
    const sampleId =
      sensors.entry_id?.toString() ||
      sensors.created_at?.toString();

    if (!sampleId) return;

    const lastProcessed = localStorage.getItem(
      "plantAlertLastEntryId"
    );

    if (sampleId === lastProcessed) return;

    const liveZone = zones.find(
      zone =>
        zone.id === "ZONE-01" &&
        zone.device === "ESP32-001"
    );

    // No connected zone: do not create artificial alerts
    if (!liveZone) {
      localStorage.setItem("plantAlertLastEntryId", sampleId);
      return;
    }

    const assignedProfile =
      profiles.find(
        profile =>
          profile.id?.toString() ===
          liveZone.profileId?.toString()
      ) || plantProfile;

    if (!assignedProfile) {
      localStorage.setItem("plantAlertLastEntryId", sampleId);
      return;
    }

    const light = Number(sensors.light_lux);
    const soil = Number(sensors.soil_moisture);

    if (!Number.isFinite(light) || !Number.isFinite(soil)) {
      return;
    }

    const tolerance = Math.min(
      50,
      Math.max(
        0,
        Number(assignedProfile.alertTolerance ?? 20)
      )
    );

    const minLight = Number(assignedProfile.minLight);
    const minSoil = Number(assignedProfile.minSoil);
    const maxSoil = Number(assignedProfile.maxSoil);

    const lightLimit = minLight * (1 - tolerance / 100);
    const soilLowLimit = minSoil * (1 - tolerance / 100);
    const soilHighLimit = maxSoil * (1 + tolerance / 100);

    const alertRules = [
      {
        alertKey: "low-light",
        message: "Light is below the required level",
        trigger: light < lightLimit,
        recover: light >= minLight,
      },
      {
        alertKey: "soil-low",
        message: "Soil moisture is too low",
        trigger: soil < soilLowLimit,
        recover: soil >= minSoil,
      },
      {
        alertKey: "soil-high",
        message: "Soil moisture is too high",
        trigger: soil > soilHighLimit,
        recover: soil <= maxSoil,
      },
    ];

    // Read existing history and pending counters
    let history = readLocalStorage("plantAlertHistory", []);
    let pending = readLocalStorage("plantAlertPending", {});

    if (!Array.isArray(history)) history = [];
    if (
      !pending ||
      typeof pending !== "object" ||
      Array.isArray(pending)
    ) {
      pending = {};
    }

    const now = new Date().toISOString();

    alertRules.forEach(rule => {
      const pendingKey = `${liveZone.id}:${rule.alertKey}`;

      const activeEvent = history.find(
        event =>
          event.zoneId === liveZone.id &&
          event.alertKey === rule.alertKey &&
          event.status === "active"
      );

      if (!activeEvent) {
        // No active event: count consecutive problem readings
        if (rule.trigger) {
          pending[pendingKey] = {
            mode: "trigger",
            count:
              pending[pendingKey]?.mode === "trigger"
                ? pending[pendingKey].count + 1
                : 1,
          };

          if (pending[pendingKey].count >= REQUIRED_READINGS) {
            history.unshift({
              id: `${liveZone.id}-${rule.alertKey}-${Date.now()}`,
              zoneId: liveZone.id,
              zoneName: liveZone.name,
              alertKey: rule.alertKey,
              message: rule.message,
              status: "active",
              startedAt: now,
              resolvedAt: null,
            });

            delete pending[pendingKey];
          }
        } else {
          // Condition disappeared before two readings
          delete pending[pendingKey];
        }
      } else {
        // Active event: wait for readings to return to safe range
        if (rule.recover) {
          pending[pendingKey] = {
            mode: "recover",
            count:
              pending[pendingKey]?.mode === "recover"
                ? pending[pendingKey].count + 1
                : 1,
          };

          if (pending[pendingKey].count >= REQUIRED_READINGS) {
            history = history.map(event =>
              event.id === activeEvent.id
                ? {
                    ...event,
                    status: "resolved",
                    resolvedAt: now,
                  }
                : event
            );

            delete pending[pendingKey];
          }
        } else {
          // Not recovered yet; reset recovery counter
          delete pending[pendingKey];
        }
      }
    });

    localStorage.setItem(
      "plantAlertHistory",
      JSON.stringify(history)
    );

    localStorage.setItem(
      "plantAlertPending",
      JSON.stringify(pending)
    );

    localStorage.setItem("plantAlertLastEntryId", sampleId);

  }, [sensors, zones, profiles, plantProfile]);

  // Calculate current zone status for display
  function getZoneAlert(zone) {
    const assignedProfile =
      profiles.find(
        profile =>
          profile.id?.toString() ===
          zone.profileId?.toString()
      ) || (zone.id === "ZONE-01" ? plantProfile : null);

    if (!assignedProfile) {
      return {
        type: "neutral",
        message: "No plant profile assigned to this zone.",
      };
    }

    if (
      zone.id !== "ZONE-01" ||
      zone.device !== "ESP32-001"
    ) {
      return {
        type: "neutral",
        message: "No live sensor connected to this zone.",
      };
    }

    if (!sensors) {
      return {
        type: "neutral",
        message: "Waiting for sensor readings...",
      };
    }

    const light = Number(sensors.light_lux);
    const soil = Number(sensors.soil_moisture);

    const tolerance = Math.min(
      50,
      Math.max(
        0,
        Number(assignedProfile.alertTolerance ?? 20)
      )
    );

    const lightLimit =
      Number(assignedProfile.minLight) *
      (1 - tolerance / 100);

    const soilLowLimit =
      Number(assignedProfile.minSoil) *
      (1 - tolerance / 100);

    const soilHighLimit =
      Number(assignedProfile.maxSoil) *
      (1 + tolerance / 100);

    const alerts = [];

    if (light < lightLimit) {
      alerts.push("Light is below the alert limit");
    }

    if (soil < soilLowLimit) {
      alerts.push("Soil moisture is too low");
    }

    if (soil > soilHighLimit) {
      alerts.push("Soil moisture is too high");
    }

    if (alerts.length > 0) {
      return {
        type: "warning",
        message: alerts.join(" • "),
      };
    }

    return {
      type: "healthy",
      message: "Plant conditions are within your alert limits.",
    };
  }

  // Add a new zone
  function addZone(e) {
    e.preventDefault();

    if (!zoneName.trim()) return;

    const assignedProfile = profiles.find(
      profile =>
        profile.id?.toString() === selectedProfileId
    );

    const nextNumber =
      Math.max(
        0,
        ...zones.map(zone =>
          Number(zone.id.replace("ZONE-", "")) || 0
        )
      ) + 1;

    const newZone = {
      id: `ZONE-${String(nextNumber).padStart(2, "0")}`,
      name: zoneName.trim(),
      plant: assignedProfile?.name || "Not assigned",
      profileId: selectedProfileId,
      device: deviceId.trim() || "Not assigned",
      description: "New nursery monitoring zone",
    };

    setZones(previous => [...previous, newZone]);

    setZoneName("");
    setDeviceId("");
    setSelectedProfileId(profiles[0]?.id?.toString() || "");
    setShowForm(false);
  }

  return (
    <div className="zones-page">
      <div className="zones-heading">
        <div>
          <h1>Zone Management</h1>
          <p>Monitor and manage your nursery zones.</p>
        </div>

        <button
          className="add-zone-button"
          onClick={() => setShowForm(!showForm)}
        >
          + Add Zone
        </button>
      </div>

      {showForm && (
        <form className="zone-form" onSubmit={addZone}>
          <h2>Create a New Zone</h2>

          <label>Zone Name</label>
          <input
            value={zoneName}
            onChange={e => setZoneName(e.target.value)}
            placeholder="Example: Greenhouse Zone"
            required
          />

          <label>Assign Plant Profile</label>
          <select
            value={selectedProfileId}
            onChange={e => setSelectedProfileId(e.target.value)}
          >
            <option value="">No profile assigned</option>

            {profiles.map(profile => (
              <option
                key={profile.id}
                value={profile.id.toString()}
              >
                {profile.name}
              </option>
            ))}
          </select>

          <label>ESP32 Device ID</label>
          <input
            value={deviceId}
            onChange={e => setDeviceId(e.target.value)}
            placeholder="Leave blank if not connected"
          />

          <div className="zone-form-actions">
            <button type="submit" className="save-zone-button">
              Save Zone
            </button>

            <button
              type="button"
              className="cancel-zone-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="zone-count">
        {zones.length} {zones.length === 1 ? "Zone" : "Zones"} Created
      </div>

      <div className="zones-grid">
        {zones.map(zone => {
          const alert = getZoneAlert(zone);

          return (
            <div className="zone-card" key={zone.id}>
              <div className="zone-card-header">
                <span className="zone-icon">🌱</span>

                <span
                  className={
                    zone.device === "ESP32-001"
                      ? "zone-status connected"
                      : "zone-status pending"
                  }
                >
                  {zone.device === "ESP32-001"
                    ? "Connected"
                    : "Device not connected"}
                </span>
              </div>

              <span className="zone-id">{zone.id}</span>

              <h2>{zone.name}</h2>

              <p className="zone-description">
                {zone.description}
              </p>

              <div className="zone-info">
                <p><strong>Plant:</strong> {zone.plant}</p>
                <p><strong>Device:</strong> {zone.device}</p>
              </div>

              <div className={`zone-alert ${alert.type}`}>
                <strong>
                  {alert.type === "healthy"
                    ? "✓ Plant Healthy"
                    : alert.type === "warning"
                    ? "⚠ Attention Required"
                    : "ℹ Plant Status"}
                </strong>

                <p>{alert.message}</p>
              </div>

              <button
                className="zone-button"
                onClick={() => navigate(`/zones/${zone.id}`)}
              >
                View Zone →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Zones;
