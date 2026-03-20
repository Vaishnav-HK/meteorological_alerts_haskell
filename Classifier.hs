module Classifier where

import Types

-- | Logic-Based Framework: Defines how Severity erodes Asset Health
-- This is where domain expertise is encoded into the code.
getDecayRate :: AssetType -> Severity -> Double
getDecayRate Hospital Red    = 1.5   -- Reinforced infrastructure
getDecayRate PowerGrid Red   = 22.0  -- High vulnerability to storms
getDecayRate TransitHub Red  = 14.0
getDecayRate Residential Red = 9.0
getDecayRate _ Orange        = 5.0   -- Moderate decay
getDecayRate _ Yellow        = 1.0   -- Minor decay
getDecayRate _ Green         = 0.0

-- | Advances the city state by 1 hour
tick :: Scenario -> Scenario
tick sc = 
    let updateAsset a = a { health = max 0 (health a - getDecayRate (kind a) (threat sc)) }
        newAssets = map updateAsset (assets sc)
    in sc { assets = newAssets, hour = hour sc + 1 }

-- | Recursive simulation for N hours
simulate :: Int -> Scenario -> Scenario
simulate 0 sc = sc
simulate n sc = simulate (n - 1) (tick sc)

-- | Strategic Response Logic based on Projected Resilience
getProtocol :: Scenario -> String
getProtocol sc
    | avgHealth < 35 = "CRITICAL: Immediate Evacuation & Emergency Power Deployment."
    | avgHealth < 65 = "WARNING: Partial Transit Shutdown & Grid Load Shedding."
    | avgHealth < 85 = "ADVISORY: Monitor Localized Flooding/Infrastructure Stress."
    | otherwise      = "STABLE: Standard Monitoring Protocols."
    where 
        avgHealth = sum (map health (assets sc)) / fromIntegral (length (assets sc))

-- | Dynamic Physical Narrative
generateNarrative :: Scenario -> String
generateNarrative sc = case (event sc, threat sc) of
    ("Rainfall", Red) -> "Critical rainfall is overwhelming " ++ districtName sc ++ "'s drainage systems, leading to high-load stress on the Power Grid."
    ("Cyclone", _)    -> "High-velocity cyclonic winds are actively destabilizing structural integrity and transit hubs in " ++ districtName sc ++ "."
    ("Heatwave", _)   -> "Extreme sustained temperatures are causing significant thermal fatigue on the local power grid."
    ("Flood", Red)    -> "Severe flooding has breached primary containment, compromising ground-level infrastructure."
    _                 -> "Localized " ++ event sc ++ " events observed. Current intensity metrics at " ++ intensity sc ++ "."