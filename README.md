# Tank Level Control - WebHMI & SCADA Gateway

A lightweight, browser-based Industrial HMI and SCADA interface built with Node.js to monitor and control real-time tank level metrics for Siemens S7-1500 PLCs via the native PLC Web Server interface.

![Tank Level WebHMI Screenshot](SS-Tank%20Level%20Control%20%20Browser-Based%20Industrial%20HMI%20for%20Siemens%20S7-1500.png)

## 🚀 Key Features

- **Dynamic Watch Table Scraping:** Uses `axios` and `cheerio` to fetch and parse Siemens S7-1500 variable tables (`DB_Tank`, `DB_Runtime`) in real time.
- **RESTful PLC Control:** Provides POST endpoints to write process parameters (Setpoint Min/Max, Emergency Stop, Alarm Reset) back to the PLC.
- **CPU Status Diagnostics:** Automatically polls CPU module information, operating modes (RUN/STOP), and IP details.
- **Lightweight Architecture:** Fast Express.js backend serving static UI files and handling session-managed PLC communication.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **HTTP & Parsing:** Axios, Cheerio
- **Development Tooling:** Nodemon
- **Hardware Target:** Siemens S7-1500 PLC (Web Server / VarTable Interface)

## 📡 API Endpoints

- `GET /api/poll` – Fetches live tank level, pump states, setpoints, runtime hours, and alarms.
- `POST /api/write` – Writes tag values to the PLC watch table (`{ "tag": "\"DB_Tank\".SP_Min", "value": "40.0" }`).
- `GET /api/cpuinfo` – Retrieves S7-1500 CPU model and operating status.
- `GET /api/debug` – Returns raw parsed tag map for debugging.

## 📦 Local Setup & Execution

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)

### Installation
1. Clone or download this repository.
2. Navigate into the root folder:
   ```bash
   cd "TANK LEVEL CONTROL WEBHMI-NODEJS"
