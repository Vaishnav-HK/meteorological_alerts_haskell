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
import Data.Csv
import qualified Data.ByteString.Lazy as BL
import qualified Data.Vector as V
import Control.Monad.IO.Class (liftIO)
import Data.Char (toLower)
import Data.List (nub, zipWith5, zipWith6)

-- Define the Servant API
type API = "simulate"   :> Capture "district" String :> Get '[JSON] Scenario
      :<|> "trajectory" :> Capture "district" String 
                        :> QueryParam "overrideOrigin"    Int 
                        :> QueryParam "overrideIntensity" Double 
                        :> QueryParam "hoOffset"          Double
                        :> QueryParam "pgOffset"          Double
                        :> QueryParam "thOffset"          Double
                        :> QueryParam "rOffset"           Double
                        :> QueryParam "cOffset"           Double
                        :> Get '[JSON] TrajectoryResponse
      :<|> "districts"  :> Get '[JSON] [String]

api :: Proxy API
api = Proxy

type IMDRow = (String, String, String, String)

-- Load IMD data
loadIMDData :: FilePath -> IO [Scenario]
loadIMDData path = do
    csvData <- BL.readFile path
    case decode HasHeader csvData of
        Left err -> do
            putStrLn $ "Error parsing CSV: " ++ err
            return []
        Right v -> do
            let rows = V.toList (v :: V.Vector IMDRow)
            let scenarios = [ s | (d,e,v',sev) <- rows, Just s <- [fromIMDRow [d,e,v',sev]] ]
            return scenarios

-- | Build the full 13-point TrajectoryResponse for a matched Scenario
buildTrajectory :: Scenario -> Maybe Int -> Maybe Double -> [Double] -> TrajectoryResponse
buildTrajectory sc mOrigin mIntensity offsets =
    let intensityVal  = parseIntensity (intensity sc)
        [hOff, pOff, tOff, rOff, cOff] = take 5 (offsets ++ repeat 0.0)
        hasOffset     = any (/= 0.0) offsets
        -- Baseline (ghost) trajectories - always from original CSV
        hPoints       = trajectoryFor Hospital    intensityVal
        pPoints       = trajectoryFor PowerGrid   intensityVal
        tPoints       = trajectoryFor TransitHub  intensityVal
        rPoints       = trajectoryFor Residential intensityVal
        cPoints       = communicationTrajectory intensityVal 0.0 pPoints
        mkPoint i h p t r c = TrajectoryPoint
            { tpHour          = i
            , tpHospital      = h
            , tpPowerGrid     = p
            , tpTransitHub    = t
            , tpResidential   = r
            , tpCommunication = c
            }
        trajectory = zipWith6 mkPoint [0..12] hPoints pPoints tPoints rPoints cPoints
        
        -- Override trajectories: intensity override OR resilience offset
        mOverrideTrajectory = case (mOrigin, mIntensity, hasOffset) of
            (Just oTime, Just oInt, _) -> 
                let hO = trajectoryWithOverride Hospital intensityVal oTime oInt
                    pO = trajectoryWithOverride PowerGrid intensityVal oTime oInt
                    tO = trajectoryWithOverride TransitHub intensityVal oTime oInt
                    rO = trajectoryWithOverride Residential intensityVal oTime oInt
                    cO = communicationTrajectoryWithOverride intensityVal oTime oInt cOff pO
                in Just (zipWith6 mkPoint [0..12] hO pO tO rO cO)
            (_, _, True) ->
                let hO = trajectoryForOffset Hospital    intensityVal hOff
                    pO = trajectoryForOffset PowerGrid   intensityVal pOff
                    tO = trajectoryForOffset TransitHub  intensityVal tOff
                    rO = trajectoryForOffset Residential intensityVal rOff
                    cO = communicationTrajectory intensityVal cOff pO
                in Just (zipWith6 mkPoint [0..12] hO pO tO rO cO)
            _ -> Nothing
    in TrajectoryResponse
        { trDistrict   = districtName sc
        , trThreat     = threat sc
        , trIntensity  = intensity sc
        , trEvent      = event sc
        , trTrajectory = trajectory
        , trOverrideTrajectory = mOverrideTrajectory
        }

-- Handlers
simulateHandler :: [Scenario] -> String -> Handler Scenario
simulateHandler scenarios district =
    case filter (\s -> map toLower (districtName s) == map toLower district) scenarios of
        [] -> throwError err404 { errBody = "District not found" }
        (s:_) ->
            let finalScenario = simulate 12 s
            in return $ finalScenario { narrative = generateNarrative finalScenario }

trajectoryHandler :: [Scenario] -> String -> Maybe Int -> Maybe Double -> Maybe Double -> Maybe Double -> Maybe Double -> Maybe Double -> Maybe Double -> Handler TrajectoryResponse
trajectoryHandler scenarios district mOrigin mIntensity mHo mPg mTh mR mC =
    case filter (\s -> map toLower (districtName s) == map toLower district) scenarios of
        [] -> throwError err404 { errBody = "District not found" }
        (s:_) -> return $ buildTrajectory s mOrigin mIntensity
            [ maybe 0.0 id mHo
            , maybe 0.0 id mPg
            , maybe 0.0 id mTh
            , maybe 0.0 id mR
            , maybe 0.0 id mC
            ]

districtsHandler :: [Scenario] -> Handler [String]
districtsHandler scenarios = return $ nub $ map districtName scenarios

-- Application
app :: [Scenario] -> Application
app scenarios = serve api
    (    simulateHandler   scenarios
    :<|> trajectoryHandler scenarios
    :<|> districtsHandler  scenarios
    )

-- CORS Middleware
corsPolicy :: Middleware
corsPolicy = cors (const $ Just simpleCorsResourcePolicy)

main :: IO ()
main = do
    putStrLn "Loading IMD Archive..."
    scenarios <- loadIMDData "imd_archive.csv"
    putStrLn $ "Loaded " ++ show (length scenarios) ++ " scenarios."
    putStrLn "Starting Servant API on port 8080..."
    run 8080 (corsPolicy $ app scenarios)