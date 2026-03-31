module Classifier where

import Types

-- | If a hazard amplifies the decay for a specific asset, return that multiplier.
-- Cyclone amplifies Communication decay to 2.5x; Heatwave amplifies PowerGrid to 2.0x.
hazardMultiplier :: Hazard -> Asset -> Float
hazardMultiplier hz asset =
  case (hz, kind asset) of
    (Cyclone, Communication) -> 2.5
    (Heatwave, PowerGrid)    -> 2.0
    _                         -> 1.0

hazardMultiplierType :: Hazard -> AssetType -> Double
hazardMultiplierType hz at =
  realToFrac (hazardMultiplier hz (Asset at 0.0))

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

-- | Compute health at step t using the divergent-decay model via foldl
healthAt :: Hazard -> AssetType -> [Double] -> Int -> Double
healthAt hz assetType intensities t =
    let r = resilienceCoefficient assetType
        mult = hazardMultiplierType hz assetType
        actualIntensities = take t (intensities ++ repeat (last intensities))
        step health iVal = health * (r ** ((iVal * mult) / 300.0))
    in max 0.0 (foldl step 100.0 actualIntensities)

-- | Offset-aware version of healthAt.
healthAtOffset :: Hazard -> AssetType -> [Double] -> Double -> Int -> Double
healthAtOffset hz assetType intensities offset t =
    let r     = effectiveResilience assetType offset
        mult  = hazardMultiplierType hz assetType
        actualIntensities = take t (intensities ++ repeat (last intensities))
        step health iVal = health * (r ** ((iVal * mult) / 300.0))
    in max 0.0 (foldl step 100.0 actualIntensities)

-- | Compute health including a manual override at a specific root time.
healthWithOverride :: Hazard -> AssetType -> [Double] -> Int -> Double -> Int -> Double
healthWithOverride hz assetType initialIs rootT newI t =
    let r = resilienceCoefficient assetType
        mult = hazardMultiplierType hz assetType
        calcI time = if time >= rootT then newI else (initialIs ++ repeat (last initialIs)) !! time
        actualIntensities = map calcI [0..t-1]
        step health iVal = health * (r ** ((iVal * mult) / 300.0))
    in max 0.0 (foldl step 100.0 actualIntensities)

-- | Compute health including both:
--   (1) a manual intensity override starting at rootT, and
--   (2) a resilience offset applied from T+0 onward.
healthWithOverrideOffset :: Hazard -> AssetType -> [Double] -> Double -> Int -> Double -> Int -> Double
healthWithOverrideOffset hz assetType initialIs offset rootT newI t =
    let rEff = effectiveResilience assetType offset
        mult = hazardMultiplierType hz assetType
        calcI time = if time >= rootT then newI else (initialIs ++ repeat (last initialIs)) !! time
        actualIntensities = map calcI [0..t-1]
        step health iVal = health * (rEff ** ((iVal * mult) / 300.0))
    in max 0.0 (foldl step 100.0 actualIntensities)

-- | Build the 13-point (T+0 to T+12) trajectory for one asset type.
trajectoryFor :: Hazard -> AssetType -> [Double] -> [Double]
trajectoryFor hz assetType intensities =
    map (healthAt hz assetType intensities) [0..12]

-- | Offset-aware trajectory for one asset type.
trajectoryForOffset :: Hazard -> AssetType -> [Double] -> Double -> [Double]
trajectoryForOffset hz assetType intensities offset =
    map (healthAtOffset hz assetType intensities offset) [0..12]

-- | Build the 13-point trajectory including an override from rootT.
trajectoryWithOverride :: Hazard -> AssetType -> [Double] -> Int -> Double -> [Double]
trajectoryWithOverride hz assetType initialIs rootT newI =
    map (healthWithOverride hz assetType initialIs rootT newI) [0..12]

-- | Build the 13-point (T+0 to T+12) trajectory with intensity override + resilience offset.
trajectoryWithOverrideOffset :: Hazard -> AssetType -> [Double] -> Double -> Int -> Double -> [Double]
trajectoryWithOverrideOffset hz assetType initialIs offset rootT newI =
    map (healthWithOverrideOffset hz assetType initialIs offset rootT newI) [0..12]

-- | Interdependent decay models for Communication
communicationTrajectory :: Hazard -> [Double] -> Double -> [Double] -> [Double]
communicationTrajectory hz intensities commOffset pPoints =
    let r = effectiveResilience Communication commOffset
        step (t, prevHealth) pHealth =
            let baseI = (intensities ++ repeat (last intensities)) !! t
                effectiveI = if pHealth < 30.0 then baseI * 3.0 else baseI
                mult = hazardMultiplierType hz Communication
                decayFactor = r ** ((effectiveI * mult) / 300.0)
            in (t + 1, prevHealth * decayFactor)
    in map snd $ scanl step (0, 100.0) (tail pPoints)

communicationTrajectoryWithOverride :: Hazard -> [Double] -> Int -> Double -> Double -> [Double] -> [Double]
communicationTrajectoryWithOverride hz initialIs rootT newI commOffset pPoints =
    let r = effectiveResilience Communication commOffset
        step (t, prevHealth) pHealth =
            let currentI = if t >= rootT then newI else (initialIs ++ repeat (last initialIs)) !! t
                effectiveI = if pHealth < 30.0 then currentI * 3.0 else currentI
                mult = hazardMultiplierType hz Communication
                decayFactor = r ** ((effectiveI * mult) / 300.0)
            in (t + 1, prevHealth * decayFactor)
    in map snd $ scanl step (0, 100.0) (tail pPoints)

-- | Recursive simulation for N hours (kept for the existing /simulate endpoint)
tick :: Scenario -> Scenario
tick sc =
    let intensities = parseSeries (intensity sc)
        iVal = (intensities ++ repeat (last intensities)) !! hour sc
        hz = hazard sc
        nextHour = hour sc + 1
        updateAsset a =
            let r        = resilienceCoefficient (kind a)
                pHealth  = case filter (\as -> kind as == PowerGrid) (assets sc) of
                             (p:_) -> health p
                             _     -> 100.0
                effectiveI = if kind a == Communication && pHealth < 30.0 
                             then iVal * 3.0 
                             else iVal
                mult     = hazardMultiplierType hz (kind a)
                newH     = health a * (r ** ((effectiveI * mult) / 300.0))
            in a { health = max 0.0 newH }
        newAssets = map updateAsset (assets sc)
    in sc { assets = newAssets, hour = nextHour }

parseSeries :: String -> [Double]
parseSeries s = 
    case reads ("[" ++ s ++ "]") of
        [(list, "")] -> if null list then [150.0] else list
        _ -> case reads s of
               [(n, "")] -> [n]
               _ -> [150.0]

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
generateNarrative sc =
  case hazard sc of
    Rainfall ->
      if threat sc == Red
      then "Critical rainfall is overwhelming drainage systems, leading to high-load stress on the Power Grid."
      else "Localized rainfall is driving measurable resilience decay; projected stress is increasing across infrastructure."
    Cyclone ->
      "High-velocity cyclonic winds are destabilizing structural integrity and stressing transit and communication infrastructure."
    Heatwave ->
      "Extreme sustained temperatures are causing thermal fatigue, accelerating resilience loss in power delivery and dependent systems."