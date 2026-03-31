{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE DeriveGeneric #-}

module Types where

import GHC.Generics (Generic)
import Data.Aeson.TH (deriveJSON, defaultOptions)

-- | The four IMD color codes
data Severity = Green | Yellow | Orange | Red
    deriving (Show, Eq, Ord, Enum, Bounded, Generic)

-- | Hazard types selected by the user.
data Hazard = Rainfall | Heatwave | Cyclone
  deriving (Show, Eq, Ord, Enum, Bounded, Generic)

-- | Infrastructure categories
data AssetType
    = Hospital
    | PowerGrid
    | TransitHub
    | Residential
    | Communication
    deriving (Show, Eq, Generic)

-- | An Asset has a type and a current health percentage
data Asset = Asset {
    kind   :: AssetType,
    health :: Double
} deriving (Show, Eq, Generic)

data Scenario = Scenario {
    intensity    :: String,
    hazard       :: Hazard,
    narrative    :: String,
    assets       :: [Asset],
    threat       :: Severity,
    hour         :: Int
} deriving (Show, Eq, Generic)

-- | A single time-step point in the degradation trajectory
data TrajectoryPoint = TrajectoryPoint
    { tpHour        :: Int
    , tpHospital    :: Double
    , tpPowerGrid   :: Double
    , tpTransitHub  :: Double
    , tpResidential :: Double
    , tpCommunication :: Double
    } deriving (Show, Eq, Generic)

-- | The full 13-point trajectory response for all four assets
data TrajectoryResponse = TrajectoryResponse {
    trHazard     :: Hazard,
    trThreat     :: Severity,
    trIntensity  :: String,
    trTrajectory :: [TrajectoryPoint],
    trOverrideTrajectory :: Maybe [TrajectoryPoint]
} deriving (Show, Eq, Generic)

-- This "Glue" automatically creates ToJSON and FromJSON instances
$(deriveJSON defaultOptions ''Severity)
$(deriveJSON defaultOptions ''Hazard)
$(deriveJSON defaultOptions ''AssetType)
$(deriveJSON defaultOptions ''Asset)
$(deriveJSON defaultOptions ''Scenario)
$(deriveJSON defaultOptions ''TrajectoryPoint)
$(deriveJSON defaultOptions ''TrajectoryResponse)