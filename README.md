# Tank Level Control - WebHMI & SCADA Gateway

A lightweight, browser-based Industrial HMI and SCADA interface built with Node.js to monitor and control real-time tank level metrics for Siemens S7-1500 PLCs via the native PLC Web Server interface[cite: 7].

![Tank Level WebHMI Screenshot](SS-Tank%20Level%20Control%20%20Browser-Based%20Industrial%20HMI%20for%20Siemens%20S7-1500.png)

## 📄 PLC Program Documentation

- 📄 **[View Full Siemens S7-1500 Ladder Logic Program (PDF)](Tank_Level_Control_PLC_Logic.pdf)** — Complete TIA Portal Ladder diagram printout covering cycle control, alarms, interlocks, and runtime calculations[cite: 4, 5, 6].

### ⚡ Siemens S7-1500 Ladder Logic Architecture (Main OB1)

| Network | Title | Description |
| :--- | :--- | :--- |
| **Network 1** | SimLevel to TankLevel | Moves `DB_Tank.Sim_Level` into `DB_Tank.Tank_Level` process value[cite: 4]. |
| **Network 2** | High Level Alarm (auto-clear) | Sets `DB_Tank.Alarm_High` when level exceeds 90.0%[cite: 4]. |
| **Network 3** | Low Level Alarm (auto-clear) | Sets `DB_Tank.Alarm_Low` when level drops below 10.0%[cite: 4]. |
| **Network 4** | System Turns ON | Handles Start/Stop logic for `DB_Tank.System_Run` and clears output interlocks[cite: 5]. |
| **Network 5** | Pump ON (Fill Tank) | Triggers `DB_Tank.Pump_On` when level falls below `SP_Min` with interlocks clear[cite: 5]. |
| **Network 6** | Pump OFF (Tank Full) | Resets `DB_Tank.Pump_On` when level reaches or exceeds `SP_Max`[cite: 5]. |
| **Network 7** | Emergency Stop | Latches Emergency Stop state, resets pump output, and forces High/Low alarm flags[cite: 5]. |
| **Network 8** | Reset Alarm | Clears High and Low level alarm latches upon receiving `DB_Tank.Alarm_Reset`[cite: 6]. |
| **Network 9** | WWW Communication | Executes the `WWW` instruction (`DB WWW_CTRL`) for S7-1500 Web Server data syncing[cite: 6]. |
| **Network 10** | Pump Runtime Calculate | Uses a `1Hz Clock` bit and `CALCULATE` block to accumulate total `DB_Runtime.Runtime_Hours`[cite: 6]. |
| **Network 11** | Runtime Reset | Clears accumulated runtime counters via `DB_Tank.Runtime_Reset`[cite: 6]. |

## 🚀 Key Features

- **Dynamic Watch Table Scraping:** Uses `axios` and `cheerio` to fetch and parse Siemens S7-1500 variable tables (`DB_Tank`, `DB_Runtime`) in real time[cite: 7].
- **RESTful PLC Control:** Provides POST endpoints to write process parameters (Setpoint Min/Max, Emergency Stop, Alarm Reset) back to the PLC[cite: 7].
- **CPU Status Diagnostics:** Automatically polls CPU module information, operating modes (RUN/STOP), and IP details[cite: 7].
- **Lightweight Architecture:** Fast Express.js backend serving static UI files and handling session-managed PLC communication[cite: 7].

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js[cite: 7]
- **HTTP & Parsing:** Axios, Cheerio[cite: 7]
- **Development Tooling:** Nodemon[cite: 7]
- **Hardware Target:** Siemens S7-1500 PLC (Web Server / VarTable Interface)[cite: 7]

## 📡 API Endpoints

- `GET /api/poll` – Fetches live tank level, pump states, setpoints, runtime hours, and alarms[cite: 7].
- `POST /api/write` – Writes tag values to the PLC watch table (`{ "tag": "\"DB_Tank\".SP_Min", "value": "40.0" }`)[cite: 7].
- `GET /api/cpuinfo` – Retrieves S7-1500 CPU model and operating status[cite: 7].
- `GET /api/debug` – Returns raw parsed tag map for debugging[cite: 7].

## 📦 Local Setup & Execution

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)

### Installation
1. Clone or download this repository.
2. Navigate into the root folder:
   ```bash
   cd "TANK LEVEL CONTROL WEBHMI-NODEJS"
