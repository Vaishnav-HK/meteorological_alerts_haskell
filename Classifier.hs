module Classifier where

import Types

-- | Asset-specific Resilience Factor (R).
-- Encodes domain expertise: the higher R, the shallower the decay curve.
resilienceCoefficient :: AssetType -> Double
resilienceCoefficient Hospital      = 0.98  -- Reinforced; high redundancy
resilienceCoefficient Residential   = 0.85  -- Standard urban decay
resilienceCoefficient TransitHub    = 0.75  -- Vulnerable to flooding/congestion
resilienceCoefficient PowerGrid     = 0.65  -- Critical sensitivity; steepest curve
resilienceCoefficient Communication = 0.90  -- Highly resilient unless PowerGrid fails

-- | Parse the intensity string to a numeric value.
-- Defaults to 150 (mid-range) if unparseable.
parseIntensity :: String -> Double
parseIntensity s = case reads s of
    [(n, "")] -> n
    _         -> 150.0

-- | Compute the effective resilience coefficient after applying a user offset.
-- Offset is in the range [-0.5, +0.5]. Clamped to valid decay range [0.1, 0.99].
effectiveResilience :: AssetType -> Double -> Double
effectiveResilience asset offset =
    max 0.1 (min 0.99 (resilienceCoefficient asset * (1.0 + offset)))

-- | Compute health at step t using the divergent-decay model:
--   Health(t) = 100 * R ^ (t * Intensity / 300)
healthAt :: AssetType -> Double -> Int -> Double
healthAt assetType intensityVal t =
    let r     = resilienceCoefficient assetType
        decay = r ** (fromIntegral t * intensityVal / 300.0)
    in max 0.0 (100.0 * decay)

-- | Offset-aware version of healthAt.
healthAtOffset :: AssetType -> Double -> Double -> Int -> Double
healthAtOffset assetType intensityVal offset t =
    let r     = effectiveResilience assetType offset
        decay = r ** (fromIntegral t * intensityVal / 300.0)
    in max 0.0 (100.0 * decay)

-- | Compute health including a manual override at a specific root time.
healthWithOverride :: AssetType -> Double -> Int -> Double -> Int -> Double
healthWithOverride assetType initialI rootT newI t =
    let r = resilienceCoefficient assetType
        decay = if t <= rootT 
                then r ** (fromIntegral t * initialI / 300.0)
                else r ** (fromIntegral rootT * initialI / 300.0 + fromIntegral (t - rootT) * newI / 300.0)
    in max 0.0 (100.0 * decay)

-- | Compute health including both:
--   (1) a manual intensity override starting at rootT, and
--   (2) a resilience offset applied from T+0 onward.
healthWithOverrideOffset :: AssetType -> Double -> Double -> Int -> Double -> Int -> Double
healthWithOverrideOffset assetType initialI offset rootT newI t =
    let rEff = effectiveResilience assetType offset
        decay = if t <= rootT
                then rEff ** (fromIntegral t * initialI / 300.0)
                else rEff ** (fromIntegral rootT * initialI / 300.0 + fromIntegral (t - rootT) * newI / 300.0)
    in max 0.0 (100.0 * decay)

-- | Build the 13-point (T+0 to T+12) trajectory for one asset type.
trajectoryFor :: AssetType -> Double -> [Double]
trajectoryFor assetType intensityVal =
    map (healthAt assetType intensityVal) [0..12]

-- | Offset-aware trajectory for one asset type.
trajectoryForOffset :: AssetType -> Double -> Double -> [Double]
trajectoryForOffset assetType intensityVal offset =
    map (healthAtOffset assetType intensityVal offset) [0..12]

-- | Build the 13-point trajectory including an override from rootT.
trajectoryWithOverride :: AssetType -> Double -> Int -> Double -> [Double]
trajectoryWithOverride assetType initialI rootT newI =
    map (healthWithOverride assetType initialI rootT newI) [0..12]

-- | Build the 13-point (T+0 to T+12) trajectory with intensity override + resilience offset.
trajectoryWithOverrideOffset :: AssetType -> Double -> Double -> Int -> Double -> [Double]
trajectoryWithOverrideOffset assetType initialI offset rootT newI =
    map (healthWithOverrideOffset assetType initialI offset rootT newI) [0..12]

-- | Interdependent decay models for Communication
communicationTrajectory :: Double -> Double -> [Double] -> [Double]
communicationTrajectory intensityVal commOffset pPoints =
    let r = effectiveResilience Communication commOffset
        step prevHealth pHealth =
            let effectiveI = if pHealth < 30.0 then intensityVal * 3.0 else intensityVal
                decayFactor = r ** (effectiveI / 300.0)
            in prevHealth * decayFactor
    in scanl step 100.0 (tail pPoints)

communicationTrajectoryWithOverride :: Double -> Int -> Double -> Double -> [Double] -> [Double]
communicationTrajectoryWithOverride initialI rootT newI commOffset pPoints =
    let r = effectiveResilience Communication commOffset
        step (t, prevHealth) pHealth =
            let currentI = if t > rootT then newI else initialI
                effectiveI = if pHealth < 30.0 then currentI * 3.0 else currentI
                decayFactor = r ** (effectiveI / 300.0)
            in (t + 1, prevHealth * decayFactor)
    in map snd $ scanl step (1, 100.0) (tail pPoints)

-- | Recursive simulation for N hours (kept for the existing /simulate endpoint)
tick :: Scenario -> Scenario
tick sc =
    let intensityVal  = parseIntensity (intensity sc)
        nextHour      = hour sc + 1
        updateAsset a =
            let r        = resilienceCoefficient (kind a)
                pHealth  = case filter (\as -> kind as == PowerGrid) (assets sc) of
                             (p:_) -> health p
                             _     -> 100.0
                effectiveI = if kind a == Communication && pHealth < 30.0 
                             then intensityVal * 3.0 
                             else intensityVal
                newH     = health a * (r ** (effectiveI / 300.0))
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