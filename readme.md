# Meteorological Alerts Simulator (IMD Prototype)

A prototype system for simulating meteorological alerts using archival data from the India Meteorological Department (IMD). This project features a Haskell-based simulation engine backend and a modern React-based dashboard frontend.

## 🚀 Getting Started

Follow these instructions to set up and run the prototype on your local machine.

### Prerequisites

Ensure you have the following installed:
- **Haskell Ecosystem**: [GHC](https://www.haskell.org/ghc/) and [Cabal](https://www.haskell.org/cabal/)
- **Node.js**: [LTS version recommended](https://nodejs.org/)
- **npm**: Usually comes with Node.js

---

### 🛠️ Backend Setup (Haskell)

The backend is responsible for processing meteorological data and providing a REST API for simulations.

1. **Navigate to the root directory**:
   ```powershell
   cd path/to/capstone
   ```

2. **Build and Run the server**:
   Using Cabal:
   ```powershell
   cabal update
   cabal run imd-server
   ```

3. **Verification**:
   The server will start on `http://localhost:8080`. You can test it by visiting:
   `http://localhost:8080/districts`

---

### 🎨 Frontend Setup (React + Vite)

The frontend provides an interactive dashboard to visualize alerts and simulate scenarios.

1. **Navigate to the frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Start the development server**:
   ```powershell
   npm run dev
   ```

4. **Access the Dashboard**:
   Open your browser and navigate to the URL provided by Vite (typically `http://localhost:5173`).

---

## 📂 Project Structure

- `Main.hs`: Entry point for the Haskell Servant API.
- `Types.hs` & `Classifier.hs`: Core simulation and classification logic.
- `imd_archive.csv`: The archival data used for simulations.
- `frontend/`: React application source code.
  - `src/App.tsx`: Main dashboard component.
  - `src/useSimulation.ts`: Custom hook for API interactions.

## 📊 Data Source
The simulation relies on `imd_archive.csv`. Ensure this file remains in the root directory for the backend to load data correctly.
