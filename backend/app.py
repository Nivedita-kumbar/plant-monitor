
import os
import requests

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

CHANNEL_ID = os.getenv("THINGSPEAK_CHANNEL_ID")
READ_API_KEY = os.getenv("THINGSPEAK_READ_API_KEY")


@app.route("/")
def home():
    return jsonify({
        "message": "Plant Monitor Backend is running!",
        "status": "success"
    })


@app.route("/api/test")
def test():
    return jsonify({
        "project": "Plant Monitor",
        "backend": "Flask",
        "status": "connected"
    })


@app.route("/api/sensors")
def get_sensors():

    if not CHANNEL_ID or not READ_API_KEY:
        return jsonify({
            "error": "ThingSpeak credentials are missing"
        }), 500

    url = (
        f"https://api.thingspeak.com/channels/"
        f"{CHANNEL_ID}/feeds.json"
    )

    try:
        response = requests.get(
            url,
            params={
                "api_key": READ_API_KEY,
                "results": 1
            },
            timeout=10
        )

        response.raise_for_status()
        data = response.json()

        feeds = data.get("feeds", [])

        if not feeds:
            return jsonify({
                "error": "No sensor readings found"
            }), 404

        latest = feeds[-1]

        return jsonify({
            "status": "success",
            "entry_id": latest.get("entry_id"),
            "created_at": latest.get("created_at"),
            "light_lux": latest.get("field1"),
            "humidity_raw": latest.get("field2"),
            "temperature_raw": latest.get("field3"),
            "soil_moisture": latest.get("field4"),
            "soil_raw": latest.get("field5")
        })

    except requests.RequestException as error:
        return jsonify({
            "error": "Could not retrieve ThingSpeak data",
            "details": str(error)
        }), 502


@app.route("/api/history")
def get_sensor_history():
    if not CHANNEL_ID or not READ_API_KEY:
        return jsonify({"error": "ThingSpeak credentials are missing"}), 500

    try:
        results = request.args.get("results", 100, type=int)
        results = max(1, min(results or 100, 8000))

        url = f"https://api.thingspeak.com/channels/{CHANNEL_ID}/feeds.json"

        response = requests.get(
            url,
            params={
                "api_key": READ_API_KEY,
                "results": results
            },
            timeout=10
        )

        response.raise_for_status()
        data = response.json()

        feeds = data.get("feeds", [])

        history = []

        for feed in feeds:
            history.append({
                "entry_id": feed.get("entry_id"),
                "created_at": feed.get("created_at"),
                "light_lux": feed.get("field1"),
                "humidity_raw": feed.get("field2"),
                "temperature_raw": feed.get("field3"),
                "soil_moisture": feed.get("field4"),
                "soil_raw": feed.get("field5")
            })

        return jsonify({
            "status": "success",
            "count": len(history),
            "history": history
        })

    except requests.RequestException:
        return jsonify({
            "error": "Could not retrieve historical sensor data"
        }), 502

    except ValueError:
        return jsonify({
            "error": "Invalid response from ThingSpeak"
        }), 502

if __name__ == "__main__":
    app.run(debug=True, port=5000)
