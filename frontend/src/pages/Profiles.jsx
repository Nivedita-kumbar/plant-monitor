
import { useEffect, useState } from "react";

const defaultThresholds = {
  minLight: 100,
  minSoil: 40,
  maxSoil: 80,
};

function Profiles() {
  const [sensors, setSensors] = useState(null);
  const [error, setError] = useState("");

  const [profiles, setProfiles] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("plantProfiles")) || [];
    } catch {
      return [];
    }
  });

  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);

  const [form, setForm] = useState({
    name: "",
    stage: "Seedling",
    ...defaultThresholds,
  });

  useEffect(() => {
    localStorage.setItem("plantProfiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (profiles.length > 0 && !profiles.some(p => p.id === selectedId)) {
      setSelectedId(profiles[0].id);
    }
    if (profiles.length === 0) {
      setSelectedId("");
    }
  }, [profiles, selectedId]);

  const fetchSensors = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/sensors");
      if (!response.ok) throw new Error();

      setSensors(await response.json());
      setError("");
    } catch {
      setError("Could not connect to the sensor backend.");
    }
  };

  useEffect(() => {
    fetchSensors();
    const interval = setInterval(fetchSensors, 20000);
    return () => clearInterval(interval);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      stage: "Seedling",
      ...defaultThresholds,
    });
  };

  const saveProfile = (e) => {
    e.preventDefault();

    if (Number(form.maxSoil) < Number(form.minSoil)) {
      alert("Maximum soil moisture must be greater than minimum.");
      return;
    }

    if (editingId) {
      setProfiles(previous =>
        previous.map(profile =>
          profile.id === editingId
            ? { ...form, id: editingId, name: form.name.trim() }
            : profile
        )
      );
    } else {
      const newProfile = {
        ...form,
        id: Date.now().toString(),
        name: form.name.trim(),
      };

      setProfiles(previous => [...previous, newProfile]);
      setSelectedId(newProfile.id);
    }

    resetForm();
  };

  const editProfile = (profile) => {
    setForm({
      name: profile.name,
      stage: profile.stage,
      minLight: profile.minLight,
      minSoil: profile.minSoil,
      maxSoil: profile.maxSoil,
    });

    setEditingId(profile.id);
    setViewingProfile(null);

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const deleteProfile = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this plant profile?"
    );

    if (!confirmed) return;

    setProfiles(previous => previous.filter(p => p.id !== id));

    if (selectedId === id) setSelectedId("");

    if (editingId === id) resetForm();

    if (viewingProfile?.id === id) setViewingProfile(null);
  };

  const selectedProfile = profiles.find(p => p.id === selectedId);


const getPlantAlerts = (profile) => {
  if (!sensors || !profile) {
    return [{
      type: "waiting",
      message: "Waiting for sensor data",
    }];
  }

  const light = Number(sensors.light_lux);
  const soil = Number(sensors.soil_moisture);

  const alerts = [];

  if (Number.isFinite(light) && light < Number(profile.minLight)) {
    alerts.push({
      type: "warning",
      message: `Low light: ${light} lux (minimum ${profile.minLight} lux)`,
    });
  }

  if (Number.isFinite(soil) && soil < Number(profile.minSoil)) {
    alerts.push({
      type: "warning",
      message: `Soil too dry: ${soil}% (minimum ${profile.minSoil}%)`,
    });
  }

  if (Number.isFinite(soil) && soil > Number(profile.maxSoil)) {
    alerts.push({
      type: "warning",
      message: `Soil too wet: ${soil}% (maximum ${profile.maxSoil}%)`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "healthy",
      message: "All monitored conditions are within your limits!",
    });
  }

  return alerts;
};

const getPlantStatus = (profile) => {
  const alerts = getPlantAlerts(profile);
  return alerts.map(alert => alert.message).join(" | ");
};


  return (
    <>
      <header>
        <h1>🌱 Plant Profiles</h1>
        <p>Manage and personalise monitoring for your plants.</p>
      </header>

      <section className="status-card">
        <h2>📡 Live Sensor Readings</h2>

        {error && <p className="error">{error}</p>}

        {sensors && (
          <div className="sensor-grid">
            <div className="sensor-card">
              <h3>☀️ Light</h3>
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
          </div>
        )}

        {sensors && (
          <p className="updated">
            Last reading: {new Date(sensors.created_at).toLocaleString()}
          </p>
        )}
      </section>
      
<section className="status-card alert-centre">
  <h2>🚨 Personalised Plant Alert Centre</h2>

  {!sensors ? (
    <p>Waiting for live sensor readings...</p>
  ) : profiles.length === 0 ? (
    <p>Add a plant profile to start receiving personalised alerts.</p>
  ) : (
    <div className="alert-list">
      {profiles.map(profile => {
        const alerts = getPlantAlerts(profile);
        const hasWarning = alerts.some(
          alert => alert.type === "warning"
        );

        return (
          <div
            className={`plant-alert ${
              hasWarning ? "alert-warning" : "alert-healthy"
            }`}
            key={profile.id}
          >
            <div>
              <h3>
                {hasWarning ? "⚠️" : "🌱"} {profile.name}
              </h3>

              {alerts.map((alert, index) => (
                <p key={index}>
                  {alert.type === "healthy" ? "🟢" : "🔴"}{" "}
                  {alert.message}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewingProfile(profile)}
            >
              View Plant
            </button>
          </div>
        );
      })}
    </div>
  )}
</section>


      <section className="status-card">
        <h2>🌿 My Plant Profiles</h2>

        {profiles.length === 0 && (
          <p>No plants added yet. Create your first profile below!</p>
        )}

        <div className="plant-list">
          {profiles.map(profile => (
            <div className="plant-item" key={profile.id}>
              <div>
                <h3>🌱 {profile.name}</h3>
                <p>Growth stage: {profile.stage}</p>
              </div>

              <div className="plant-actions">
                <button
                  type="button"
                  onClick={() => setViewingProfile(profile)}
                >
                  View Details
                </button>

                <button
                  type="button"
                  onClick={() => editProfile(profile)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => deleteProfile(profile.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <h3>{editingId ? "✏️ Edit Plant Profile" : " Add a New Plant"}</h3>

        <form onSubmit={saveProfile} className="profile-form">
          <label>Plant / Crop Name</label>
          <input
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            placeholder="e.g. Tomato, Rose, Money Plant"
            required
          />

          <label>Growth Stage</label>
          <select
            value={form.stage}
            onChange={e => setForm({...form, stage: e.target.value})}
          >
            <option>Seedling</option>
            <option>Vegetative</option>
            <option>Flowering</option>
            <option>Fruiting</option>
            <option>Mature</option>
          </select>

          <label>Minimum Light (lux)</label>
          <input
            type="number"
            min="0"
            value={form.minLight}
            onChange={e => setForm({...form, minLight: e.target.value})}
            required
          />

          <label>Minimum Soil Moisture (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.minSoil}
            onChange={e => setForm({...form, minSoil: e.target.value})}
            required
          />

          <label>Maximum Soil Moisture (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.maxSoil}
            onChange={e => setForm({...form, maxSoil: e.target.value})}
            required
          />

          <button type="submit">
            {editingId ? "Update Plant Profile" : "Save Plant Profile"}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel Editing
            </button>
          )}
        </form>
      </section>

      {viewingProfile && (
        <div
          className="modal-overlay"
          onClick={() => setViewingProfile(null)}
        >
          <div
            className="plant-modal"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setViewingProfile(null)}
            >
              ✕
            </button>

            <h2>🌿 {viewingProfile.name}</h2>
            <p>Plant Profile Details</p>

            <h3>Growth Information</h3>
            <p>Growth stage: {viewingProfile.stage}</p>

            <h3>Custom Sensor Thresholds</h3>
            <p>Minimum light: {viewingProfile.minLight} lux</p>
            <p>Minimum soil moisture: {viewingProfile.minSoil}%</p>
            <p>Maximum soil moisture: {viewingProfile.maxSoil}%</p>

            <h3>Current Sensor Readings</h3>
            {sensors ? (
              <>
                <p>Light: {sensors.light_lux} lux</p>
                <p>Soil moisture: {sensors.soil_moisture}%</p>
                <p>Humidity raw: {sensors.humidity_raw}</p>
                <p>Temperature raw: {sensors.temperature_raw}</p>
              </>
            ) : (
              <p>Sensor data unavailable.</p>
            )}

            <div className="plant-status">
              <strong>Plant Status: </strong>
              {getPlantStatus(viewingProfile)}
            </div>

            <button
              onClick={() => editProfile(viewingProfile)}
              className="modal-edit"
            >
              Edit This Profile
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Profiles;
