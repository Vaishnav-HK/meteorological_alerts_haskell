module Classifier where

import Types

-- | Asset-specific Resilience Factor (R).
-- Encodes domain expertise: the higher R, the shallower the decay curve.
resilienceCoefficient :: AssetType -> Double
resilienceCoefficient Hospital    = 0.98  -- Reinforced; high redundancy
resilienceCoefficient Residential = 0.85  -- Standard urban decay
resilienceCoefficient TransitHub  = 0.75  -- Vulnerable to flooding/congestion
resilienceCoefficient PowerGrid   = 0.65  -- Critical sensitivity; steepest curve

-- | Parse the intensity string to a numeric value.
-- Defaults to 150 (mid-range) if unparseable.
parseIntensity :: String -> Double
parseIntensity s = case reads s of
    [(n, "")] -> n
    _         -> 150.0

-- | Compute health at step t using the divergent-decay model:
--   Health(t) = 100 * R ^ (t * Intensity / 300)
-- This is equivalent to the recursive definition but computed directly
-- for efficiency in trajectory generation.
healthAt :: AssetType -> Double -> Int -> Double
healthAt assetType intensityVal t =
    let r     = resilienceCoefficient assetType
        decay = r ** (fromIntegral t * intensityVal / 300.0)
    in max 0.0 (100.0 * decay)

-- | Build the 13-point (T+0 to T+12) trajectory for one asset type.
trajectoryFor :: AssetType -> Double -> [Double]
trajectoryFor assetType intensityVal =
    map (healthAt assetType intensityVal) [0..12]

-- | Recursive simulation for N hours (kept for the existing /simulate endpoint)
tick :: Scenario -> Scenario
tick sc =
    let intensityVal  = parseIntensity (intensity sc)
        nextHour      = hour sc + 1
        updateAsset a =
            let r        = resilienceCoefficient (kind a)
                newH     = health a * (r ** (intensityVal / 300.0))
            in a { health = max 0.0 newH }
        newAssets = map updateAsset (assets sc)
    in sc { assets = newAssets, hour = nextHour }

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