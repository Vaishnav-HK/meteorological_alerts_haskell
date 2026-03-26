{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Types
import Classifier
import Parser
import Servant
import Network.Wai.Handler.Warp
import Network.Wai.Middleware.Cors
import Network.Wai (Middleware)
import Data.List (zipWith6)
import Data.Char (toLower)

-- Define the Servant API
type API = "simulate"   :> Capture "hazard" String :> QueryParam "historicalIntensity" String :> Get '[JSON] Scenario
      :<|> "trajectory" :> Capture "hazard" String 
                        :> QueryParam "historicalIntensity" String
                        :> QueryParam "overrideOrigin"    Int 
                        :> QueryParam "overrideIntensity" Double 
                        :> QueryParam "hoOffset"          Double
                        :> QueryParam "pgOffset"          Double
                        :> QueryParam "thOffset"          Double
                        :> QueryParam "rOffset"           Double
                        :> QueryParam "cOffset"           Double
                        :> Get '[JSON] TrajectoryResponse

api :: Proxy API
api = Proxy

parseHazard :: String -> Maybe Hazard
parseHazard s = case map toLower s of
    "rainfall" -> Just Rainfall
    "heatwave" -> Just Heatwave
    "cyclone"  -> Just Cyclone
    _          -> Nothing

-- | Build the full 13-point TrajectoryResponse for a matched Scenario
buildTrajectory :: Scenario -> Maybe Int -> Maybe Double -> [Double] -> TrajectoryResponse
buildTrajectory sc mOrigin mIntensity offsets =
    let hz            = hazard sc
        intensities   = parseSeries (intensity sc)
        [hOff, pOff, tOff, rOff, cOff] = take 5 (offsets ++ repeat 0.0)
        hasOffset     = any (/= 0.0) offsets
        -- Baseline (ghost) trajectories - always from original CSV or event series
        hPoints       = trajectoryFor hz Hospital    intensities
        pPoints       = trajectoryFor hz PowerGrid   intensities
        tPoints       = trajectoryFor hz TransitHub  intensities
        rPoints       = trajectoryFor hz Residential intensities
        cPoints       = communicationTrajectory hz intensities 0.0 pPoints
        mkPoint i h p t r c = TrajectoryPoint
            { tpHour          = i
            , tpHospital      = h
            , tpPowerGrid     = p
            , tpTransitHub    = t
            , tpResidential   = r
            , tpCommunication = c
            }
        trajectory = zipWith6 mkPoint [0..12] hPoints pPoints tPoints rPoints cPoints
        
        -- Override trajectories: intensity override (optionally combined with resilience offsets)
        mOverrideTrajectory = case (mOrigin, mIntensity) of
            -- Manual intensity override: apply intensity change starting at rootT
            (Just oTime, Just oInt) ->
                let hO = trajectoryWithOverrideOffset hz Hospital    intensities hOff oTime oInt
                    pO = trajectoryWithOverrideOffset hz PowerGrid   intensities pOff oTime oInt
                    tO = trajectoryWithOverrideOffset hz TransitHub  intensities tOff oTime oInt
                    rO = trajectoryWithOverrideOffset hz Residential intensities rOff oTime oInt
                    cO = communicationTrajectoryWithOverride hz intensities oTime oInt cOff pO
                in Just (zipWith6 mkPoint [0..12] hO pO tO rO cO)
            _ ->
                if hasOffset
                then
                    let hO = trajectoryForOffset hz Hospital    intensities hOff
                        pO = trajectoryForOffset hz PowerGrid   intensities pOff
                        tO = trajectoryForOffset hz TransitHub  intensities tOff
                        rO = trajectoryForOffset hz Residential intensities rOff
                        cO = communicationTrajectory hz intensities cOff pO
                    in Just (zipWith6 mkPoint [0..12] hO pO tO rO cO)
                else
                    Nothing
    in TrajectoryResponse
        { trHazard     = hz
        , trThreat     = threat sc
        , trIntensity  = intensity sc
        , trTrajectory = trajectory
        , trOverrideTrajectory = mOverrideTrajectory
        }

-- Handlers
simulateHandler :: String -> Maybe String -> Handler Scenario
simulateHandler hazardStr mHistorical =
    case parseHazard hazardStr of
      Nothing -> throwError err404 { errBody = "Hazard not found" }
      Just hz ->
        let baseSeries = maybe "" id mHistorical
            sc0 = scenarioForHazard hz baseSeries
            finalScenario = simulate 12 sc0
        in return $ finalScenario { narrative = generateNarrative finalScenario }

trajectoryHandler :: String
  -> Maybe String
  -> Maybe Int -> Maybe Double
  -> Maybe Double -> Maybe Double -> Maybe Double -> Maybe Double -> Maybe Double
  -> Handler TrajectoryResponse
trajectoryHandler hazardStr mHistorical mOrigin mIntensity mHo mPg mTh mR mC =
    case parseHazard hazardStr of
      Nothing -> throwError err404 { errBody = "Hazard not found" }
      Just hz ->
        let baseSeries = maybe "" id mHistorical
            sc0 = scenarioForHazard hz baseSeries
        in return $ buildTrajectory sc0 mOrigin mIntensity
            [ maybe 0.0 id mHo
            , maybe 0.0 id mPg
            , maybe 0.0 id mTh
            , maybe 0.0 id mR
            , maybe 0.0 id mC
            ]

-- Application
app :: Application
app = serve api (simulateHandler :<|> trajectoryHandler)

-- CORS Middleware
corsPolicy :: Middleware
corsPolicy = cors (const $ Just simpleCorsResourcePolicy)

main :: IO ()
main = do
    putStrLn "Starting Servant API on port 8080..."
    run 8080 (corsPolicy app)