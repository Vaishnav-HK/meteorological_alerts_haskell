# Logic-Based DRR Framework Implementation Plan

## Proposed Changes

### Backend (Haskell)
- Modify [package.yaml](file:///c:/CollegeMaterialsAndShit/Sem4/PFL/capstone/package.yaml) to have `source-dirs: .` and include necessary dependencies (`servant-server`, `wai-cors`, `cassava`).
- Create `imd_archive.csv` with sample historical data matching the prompt's `[District, Event, Value, Severity]` schema.
- Rewrite [Main.hs](file:///c:/CollegeMaterialsAndShit/Sem4/PFL/capstone/Main.hs) to:
  1. Load and parse `imd_archive.csv`.
  2. Define the Servant API: `type API = "simulate" :> Capture "district" String :> Get '[JSON] Scenario`.
  3. Implement the handler to look up the district, build the initial `Scenario`, simulate for 12 hours (`simulate 12 sc`), and return the final state.
  4. Serve via `Warp` on port 8080 with permissive CORS.

### Frontend (React + Vite)
- Initialize a React project using Vite in a `frontend` subdirectory.
- Install `tailwindcss`, `framer-motion`, `recharts`, `lucide-react`.
- Build the Dashboard with an "Apple Pro" aesthetic:
  - **Search & Trigger**: Input field to type/select a district.
  - **Animated Resilience Pulse**: `framer-motion` to animate infrastructure health from 100% decaying to their simulated values.
  - **Visual Analytics**: `Recharts` LineChart showing degradation over 12 hours.
  - **Tactical Protocol Card**: Prominent display of the `getProtocol` string with color-coded shadows based on threat level.
  - **Systemic Resilience Score**: Large UI text showing average asset health.
  - **Error Handling**: Graceful "System Offline" toast if the Haskell API is unreachable.

## Verification Plan
### Automated Tests
- Run `curl http://localhost:8080/simulate/Mumbai` to verify the Haskell API returns valid JSON.
- Start the React development server to verify UI rendering and animations.

### Manual Verification
- Test valid and invalid district inputs.
- Verify the "System Offline" UI triggers when the backend is stopped.
