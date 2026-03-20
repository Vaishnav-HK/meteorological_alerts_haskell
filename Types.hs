{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE DeriveGeneric #-}

module Types where

import GHC.Generics (Generic)
import Data.Aeson.TH (deriveJSON, defaultOptions)

-- | The four IMD color codes
data Severity = Green | Yellow | Orange | Red
    deriving (Show, Eq, Ord, Enum, Bounded, Generic)

-- | Infrastructure categories
data AssetType = Hospital | PowerGrid | TransitHub | Residential
    deriving (Show, Eq, Generic)

-- | An Asset has a type and a current health percentage
data Asset = Asset {
    kind   :: AssetType,
    health :: Double
} deriving (Show, Eq, Generic)

data Scenario = Scenario {
    districtName :: String,
    event        :: String,
    intensity    :: String,
    narrative    :: String,
    assets       :: [Asset],
    threat       :: Severity,
    hour         :: Int
} deriving (Show, Eq, Generic)

-- This "Glue" automatically creates ToJSON and FromJSON instances
$(deriveJSON defaultOptions ''Severity)
$(deriveJSON defaultOptions ''AssetType)
$(deriveJSON defaultOptions ''Asset)
$(deriveJSON defaultOptions ''Scenario)