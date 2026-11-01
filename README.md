# 🌱 Plant Monitor

**A Smart, Personalised IoT-Based Plant Monitoring System**

Plant Monitor is an IoT-based system designed to monitor environmental conditions around plants and help users make informed plant-care decisions.

It collects real-time sensor readings using an ESP32 and displays them on a web dashboard. Users can create individual plant profiles and configure their own thresholds for different plants or crops.

## ✨ Features

- **Live Sensor Monitoring:** View sensor readings through a web dashboard.
- **Personalised Plant Profiles:** Create profiles for different plants and crops.
- **Custom Thresholds:** Set individual light and soil-moisture thresholds.
- **Plant Health Alerts:** Identify when readings fall outside configured thresholds.
- **Automatic Updates:** Dashboard refreshes sensor readings periodically.
- **IoT Integration:** ESP32 sends sensor data to ThingSpeak, which is retrieved by the Flask backend.

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Hardware | ESP32 DevKit V1 |
| Sensors | BH1750, SHT40I, Capacitive Soil Moisture Sensor |
| IoT Platform | ThingSpeak |
| Backend | Python, Flask |
| Frontend | React, Vite |
| Styling | CSS |

## 🔌 Hardware Components

- ESP32 DevKit V1
- BH1750 Light Intensity Sensor
- SHT40I Temperature and Humidity Sensor
- Capacitive Soil Moisture Sensor
- Connecting wires and power supply

## 🏗️ System Architecture

1. Sensors collect environmental readings from the plant's surroundings.
2. ESP32 processes the readings and sends them to ThingSpeak.
3. Flask backend retrieves the latest readings from ThingSpeak.
4. React frontend fetches sensor data from the Flask API.
5. Users view live readings and compare them against their personalised plant thresholds.

## 📊 Sensor Parameters

| Parameter | Sensor | Dashboard Field |
|---|---|---|
| Light Intensity | BH1750 | Light (lux) |
| Humidity | SHT40I | Humidity raw |
| Temperature | SHT40I | Temperature raw |
| Soil Moisture | Capacitive Soil Sensor | Soil moisture (%) |
| Soil ADC | Capacitive Soil Sensor | Soil raw |

**Note:** Humidity and temperature are currently displayed as raw analog readings and are not yet calibrated into standard units.

## 💻 Project Structure

```text
plant-monitor/
├── backend/
│   ├── app.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Nivedita-kumbar/plant-monitor.git
cd plant-monitor
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
```

Install dependencies:

```bash
venv\Scripts\python.exe -m pip install flask flask-cors requests python-dotenv
```

Create a `.env` file inside the backend folder:

```env
THINGSPEAK_CHANNEL_ID=your_channel_id
THINGSPEAK_READ_API_KEY=your_read_api_key
```

Start the backend:

```bash
venv\Scripts\python.exe app.py
```

The backend runs at `http://127.0.0.1:5000`.

### 3. Set up the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local development URL displayed in your terminal, usually `http://localhost:5173`.

## 🔐 Environment Variables

The backend requires:

- `THINGSPEAK_CHANNEL_ID`
- `THINGSPEAK_READ_API_KEY`

Keep these credentials private. Never commit your `.env` file.

## 🌿 Future Improvements

- Calibrated temperature and humidity readings
- ML-based plant health recommendations
- Crop-specific threshold suggestions
- Historical sensor data visualisation
- Automated irrigation integration
- Mobile-friendly dashboard and notifications

## 👩‍💻 Contributors

Developed as a collaborative IoT project.

---

**Plant Monitor — Smarter Monitoring for Healthier Plants. 🌱**