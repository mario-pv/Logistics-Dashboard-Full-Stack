# 🚚 Delivery Logistics: Event-Driven Dispatch & Routing Engine

A distributed, full-stack logistics platform designed to optimize multi-stop delivery routes and track fleet vehicles in real-time. Built with a microservices architecture, this system combines algorithmic route optimization (solving the Vehicle Routing Problem) with highly accurate street-level GPS tracking.

## 🏗️ System Architecture

The program operates on three distinct, decoupled services:

1. **The Optimization Engine (Python/FastAPI):** Ingests delivery coordinates and leverages Google OR-Tools to calculate the mathematically optimal sequence of stops.
2. **The Event Server (Java/Spring Boot):** Acts as the central nervous system. It interpolates street geometry into micro-coordinates and broadcasts real-time vehicular movement via WebSockets.
3. **The Dispatch Dashboard (React/TypeScript):** A high-fidelity, interactive UI utilizing Mapbox GL JS to render custom road geometries, active dispatch assignments, and live fleet telemetry.

## ✨ Key Features

* **Real-Time Fleet Tracking:** Bi-directional STOMP/WebSocket communication allows the dashboard to reflect live driver locations at 250ms intervals.
* **Algorithmic Routing:** Integration with Google OR-Tools optimizes delivery sequences for time and distance efficiency.
* **True Street Geometry:** Connects with the Mapbox Directions API to snap simulated routes to actual city streets (e.g., Detroit), handling one-way roads and intersections flawlessly.
* **Linear Interpolation Simulator:** A custom Java micro-stepper translates static route arrays into smooth, continuous GPS coordinate streams for driver simulation.
* **Interactive Dispatch UI:** Dynamic route creation, driver assignment, payload generation, and active telemetry monitoring.

## 🛠️ Tech Stack

**Frontend**
* React 18 (Vite)
* TypeScript
* Mapbox GL JS
* CSS3 (Custom responsive grid layout)

**Backend (Event & Simulation)**
* Java 17
* Spring Boot (Web, WebSocket)
* STOMP Messaging

**Backend (Routing Engine)**
* Python 3.10+
* FastAPI
* Google OR-Tools

## 🚀 Getting Started

To run this system locally, you will need to start all three services. 

### Prerequisites
* Node.js & npm
* Java 17+ & Maven
* Python 3.10+
* A [Mapbox Access Token](https://www.mapbox.com/)

### 1. Start the Java Backend
The Java server manages the core application logic and opens the WebSocket endpoint.
```bash
cd backend
mvn spring-boot:run
```
*The server will start on `http://localhost:8080`.*

### 2. Start the Python Routing Engine
The Python service handles the core routing calculations. 
```bash
cd routing-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start the React Frontend
Before running the interface, add your credentials and install the web dependencies.

1. Open `frontend/frontend/src/components/MapDashboard.tsx`
2. Insert your personal token into the placeholder at line 7:
   ```typescript
   mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
   ```
3. Run the development server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
*The dashboard will be live at `http://localhost:5173`.*

## 🎮 Usage
The home page will display active routes and stats, click Simulate Route to watch the vehicle execute the delivery path in real-time.

Navigate to the Scheduling tab to create and dispatch new routes, view orders, and view drivers.

Select multiple addresses to generate a new optimized route.

Assign an available driver to the route and click Dispatch.

## 📄 License
This project is licensed under the MIT License.
