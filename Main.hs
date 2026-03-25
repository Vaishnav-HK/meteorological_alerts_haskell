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
import Data.List (nub, zipWith5)

-- Define the Servant API
type API = "simulate"   :> Capture "district" String :> Get '[JSON] Scenario
      :<|> "trajectory" :> Capture "district" String :> Get '[JSON] TrajectoryResponse
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
buildTrajectory :: Scenario -> TrajectoryResponse
buildTrajectory sc =
    let intensityVal  = parseIntensity (intensity sc)
        hPoints       = trajectoryFor Hospital    intensityVal
        pPoints       = trajectoryFor PowerGrid   intensityVal
        tPoints       = trajectoryFor TransitHub  intensityVal
        rPoints       = trajectoryFor Residential intensityVal
        mkPoint i h p t r = TrajectoryPoint
            { tpHour        = i
            , tpHospital    = h
            , tpPowerGrid   = p
            , tpTransitHub  = t
            , tpResidential = r
            }
        trajectory = zipWith5 mkPoint [0..12] hPoints pPoints tPoints rPoints
    in TrajectoryResponse
        { trDistrict   = districtName sc
        , trThreat     = threat sc
        , trIntensity  = intensity sc
        , trEvent      = event sc
        , trTrajectory = trajectory
        }

-- Handlers
simulateHandler :: [Scenario] -> String -> Handler Scenario
simulateHandler scenarios district =
    case filter (\s -> map toLower (districtName s) == map toLower district) scenarios of
        [] -> throwError err404 { errBody = "District not found" }
        (s:_) ->
            let finalScenario = simulate 12 s
            in return $ finalScenario { narrative = generateNarrative finalScenario }

trajectoryHandler :: [Scenario] -> String -> Handler TrajectoryResponse
trajectoryHandler scenarios district =
    case filter (\s -> map toLower (districtName s) == map toLower district) scenarios of
        [] -> throwError err404 { errBody = "District not found" }
        (s:_) -> return $ buildTrajectory s

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