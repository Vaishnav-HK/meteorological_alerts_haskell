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
    ]

-- | Transform a raw IMD Archive Row into a Simulation Scenario
-- Expected Format: [DistrictName, WeatherType, Value, SeverityString]
fromIMDRow :: [String] -> Maybe Scenario
fromIMDRow (name:evt:val:sevStr:[]) = Just $ Scenario
    { districtName = name
    , event = evt
    , intensity = val
    , narrative = ""
    , assets = defaultAssets
    , threat = parseSeverity sevStr
    , hour = 0
    }
fromIMDRow _ = Nothing