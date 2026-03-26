module Parser where

import Types
import Data.Char (toLower)

-- | Normalizes IMD Archive strings to Type-Safe Severity
parseSeverity :: String -> Severity
parseSeverity s = case map toLower s of
    "red"    -> Red
    "orange" -> Orange
    "yellow" -> Yellow
    _        -> Green

-- | Default Infrastructure for an average IMD District
defaultAssets :: [Asset]
defaultAssets = 
    [ Asset Hospital 100.0
    , Asset PowerGrid 100.0
    , Asset TransitHub 100.0
    , Asset Residential 100.0
    , Asset Communication 100.0
    ]

-- | Default threat severity derived from hazard selection.
threatForHazard :: Hazard -> Severity
threatForHazard Rainfall  = Orange
threatForHazard Heatwave  = Red
threatForHazard Cyclone   = Red

-- | Create an initial Scenario from a hazard selection + base intensity.
-- This replaces district/CSV initialization for the capstone hazard toggle.
scenarioForHazard :: Hazard -> String -> Scenario
scenarioForHazard hz baseSeries =
  Scenario
    { intensity = if null baseSeries then "150.0" else baseSeries
    , hazard = hz
    , narrative = ""
    , assets = defaultAssets
    , threat = threatForHazard hz
    , hour = 0
    }