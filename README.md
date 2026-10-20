# Tank Level Control - WebHMI & SCADA Gateway

A lightweight, browser-based industrial HMI built with Node.js to monitor and control tank level for a Siemens S7-1500 PLC through the PLC's native Web Server interface. The Node.js backend reads and writes the PLC's watch table over HTTP and serves a single-page HMI to the browser.

![Tank Level WebHMI Screenshot](SS-Tank%20Level%20Control%20%20Browser-Based%20Industrial%20HMI%20for%20Siemens%20S7-1500.png)

## 📄 PLC Program Documentation

**[View the full Siemens S7-1500 Ladder Logic program (PDF)](Tank_Level_Control_PLC_Logic.pdf)** - TIA Portal printout of OB1 covering level alarms, pump control, emergency stop, web server communication and runtime calculation.

### ⚡ Ladder Logic Architecture (Main OB1)

| Network | Title | Description |
| :--- | :--- | :--- |
| **1** | SimLevel to TankLevel | Moves `DB_Tank.Sim_Level` into the process value `DB_Tank.Tank_Level`. |
| **2** | High Level Alarm (auto-clear) | `DB_Tank.Alarm_High` is on while level is `>= 90.0`. |
| **3** | Low Level Alarm (auto-clear) | `DB_Tank.Alarm_Low` is on while level is `<= 10.0`. |
| **4** | System Turns ON | Start/stop latch for `DB_Tank.System_Run` using `Manual_Start` and `Manual_Stop`. |
| **5** | Pump ON (Fill Tank) | Sets `DB_Tank.Pump_On` when level is below `SP_Min`, with the system running, no emergency stop and no high alarm. |
| **6** | Pump OFF (Tank Full) | Resets `DB_Tank.Pump_On` when level reaches or exceeds `SP_Max`. |
| **7** | Emergency Stop | While `DB_Tank.Em_Stop` is active, resets `Pump_On` and sets the High and Low alarm flags. |
| **8** | Reset Alarm | `DB_Tank.Alarm_Reset` resets the High and Low alarm flags. |
| **9** | WWW Communication | Executes the `WWW` instruction (control DB 333) to enable the S7-1500 Web Server data exchange. |
| **10** | Pump Runtime Calculate | On each rising edge of the 1 Hz clock bit while the pump is on, adds 1/3600 h to `DB_Runtime.Runtime_Hours` using a `CALCULATE` block (LReal). |
| **11** | Runtime Reset | `DB_Tank.Runtime_Reset` zeroes `DB_Runtime.Runtime_Hours` and `Runtime_MEM`. |

## 🚀 Key Features

- **Watch table scraping:** uses `axios` and `cheerio` to fetch and parse the S7-1500 Web Server variable table (`DB_Tank`, `DB_Runtime`).
- **REST control endpoints:** a POST endpoint writes values back to the PLC (setpoints, emergency stop, alarm reset, runtime reset, simulated level).
- **CPU diagnostics:** reads the CPU module type and operating mode (RUN/STOP) from the Web Server start page.
- **Live and simulate modes:** the HMI can read from the live PLC or run in a simulated mode.
- **Lightweight architecture:** an Express.js server that serves the static UI and handles the cookie-based session with the PLC.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **HTTP & parsing:** Axios, Cheerio
- **Development tooling:** Nodemon
- **Hardware target:** Siemens S7-1500 PLC (Web Server / variable table interface)
- **PLC programming:** TIA Portal, Ladder (LAD)

## 📡 API Endpoints

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/poll` | Live tank level, pump state, setpoints, runtime hours, alarms and system state. |
| `POST` | `/api/write` | Writes one tag value to the PLC, e.g. `{ "tag": "\"DB_Tank\".SP_Min", "value": "40.0" }`. |
| `GET` | `/api/cpuinfo` | CPU model and operating mode (RUN/STOP) with the PLC IP. |
| `GET` | `/api/debug` | Parsed tag map (row index, type code, monitored value) for debugging. |
| `GET` | `/api/cpudebug` | Raw HTML of the Web Server start page, for diagnosing CPU info parsing. |

## 📦 Local Setup & Execution

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or newer
- A Siemens S7-1500 (or PLCSIM Advanced instance) with the **Web Server enabled** in the CPU properties
- The tags `DB_Tank.*` and `DB_Runtime.*` added to a **watch table** on the PLC Web Server, with write access allowed for the tags you want to control

### Installation

1. Clone or download this repository.
2. Go into the project folder:
   ```bash
   cd "TANK LEVEL CONTROL WEBHMI-NODEJS"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Settings are read from environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PLC_IP` | `192.168.0.2` | IP address of the PLC. |
| `PLC_USER` | *(empty)* | Optional Web Server user name. |
| `PLC_PASS` | *(empty)* | Optional Web Server password. |
| `PORT` | `3000` | Port the Node.js server listens on. |

### Run

```bash
# Windows (PowerShell)
$env:PLC_IP="192.168.0.2"; node server.js

# Linux / macOS
PLC_IP=192.168.0.2 node server.js
```

For auto-restart during development, use `npx nodemon server.js`.

Then open **http://localhost:3000** in your browser.

## ⚠️ Limitations

- The PLC Web Server's watch table is parsed as HTML, so the parser depends on Siemens' page markup.
- The Emergency Stop in this project is a software bit written over HTTP. It is a demonstration function and **not a safety function**. A real machine needs a hardwired E-stop.
- The API has no authentication or input validation. Run it on a trusted network only.
- Developed and tested against a simulated process (`Sim_Level`); it is not a production SCADA system.

## 📜 License

This project is licensed under the [MIT License](LICENSE).
