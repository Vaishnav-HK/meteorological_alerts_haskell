# Logic-Based DRR Framework - Walkthrough

## Completed Components

### Backend (Haskell + Servant)
- Created the CSV handler to reliably stream [imd_archive.csv](file:///c:/CollegeMaterialsAndShit/Sem4/PFL/capstone/imd_archive.csv) transforming tabular data records directly into the required [Scenario](file:///c:/CollegeMaterialsAndShit/Sem4/PFL/capstone/frontend/src/useSimulation.ts#8-14) constructs via `Parser.hs`.
- Scaffolded a robust Servant REST routing interface exposing `GET /simulate/:district`.
- Connected `Classifier.simulate 12` to execute domain logic purely in Haskell to calculate projected resilience.
- Pre-configured `wai-cors` middleware allowing Cross-Origin Resource Sharing interactions from the local Vite development instance without blocked requests.

### Frontend (React + Vite)
- Drafted a minimalist "Apple Pro" UX with soft aesthetic backgrounds, glass-morphic border highlights, and native-feeling typographic spacing over the dashboard.
- Engineered `Framer Motion` powered decay bars representing `PowerGrid`, `Hospital`, `TransitHub`, and `Residential` health percentages. The bars animate steadily downward from 100% full capacity upon completing the API request.
- Charted the 12-hour infrastructure degradation trajectory natively using `Recharts`, showing an explicit time-series visualization.
- Computed the Global Resilience Index taking the mean value, highlighted via a "Tactical Protocol" notification card glowing in synchronization with the hazard severity (e.g., Red alerts).
- Designed robust empty states ("Select a District") and interceptors ("System Offline") protecting the experience layout in case the Haskell core server terminates.

## Validation Results
- API Connectivity Check: Server answers queries gracefully at `http://localhost:8080/simulate/Mumbai`.
- End-to-End Delivery: React [useSimulation](file:///c:/CollegeMaterialsAndShit/Sem4/PFL/capstone/frontend/src/useSimulation.ts#15-54) custom hook manages the React component lifecycle cleanly, injecting parsed values or flagging the appropriate exceptions for the interface to render.
