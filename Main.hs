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
                        :> QueryParam "overrideOrigin" Int 
                        :> QueryParam "overrideIntensity" Double 
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
buildTrajectory :: Scenario -> Maybe Int -> Maybe Double -> TrajectoryResponse
buildTrajectory sc mOrigin mIntensity =
    let intensityVal  = parseIntensity (intensity sc)
        hPoints       = trajectoryFor Hospital    intensityVal
        pPoints       = trajectoryFor PowerGrid   intensityVal
        tPoints       = trajectoryFor TransitHub  intensityVal
        rPoints       = trajectoryFor Residential intensityVal
        cPoints       = communicationTrajectory intensityVal pPoints
        mkPoint i h p t r c = TrajectoryPoint
            { tpHour          = i
            , tpHospital      = h
            , tpPowerGrid     = p
            , tpTransitHub    = t
            , tpResidential   = r
            , tpCommunication = c
            }
        trajectory = zipWith6 mkPoint [0..12] hPoints pPoints tPoints rPoints cPoints
        
        mOverrideTrajectory = case (mOrigin, mIntensity) of
            (Just oTime, Just oInt) -> 
                let hO = trajectoryWithOverride Hospital intensityVal oTime oInt
                    pO = trajectoryWithOverride PowerGrid intensityVal oTime oInt
                    tO = trajectoryWithOverride TransitHub intensityVal oTime oInt
                    rO = trajectoryWithOverride Residential intensityVal oTime oInt
                    cO = communicationTrajectoryWithOverride intensityVal oTime oInt pO
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

trajectoryHandler :: [Scenario] -> String -> Maybe Int -> Maybe Double -> Handler TrajectoryResponse
trajectoryHandler scenarios district mOrigin mIntensity =
    case filter (\s -> map toLower (districtName s) == map toLower district) scenarios of
        [] -> throwError err404 { errBody = "District not found" }
        (s:_) -> return $ buildTrajectory s mOrigin mIntensity

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