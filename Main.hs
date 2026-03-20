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
import Data.List (nub)

-- Define the Servant API
type API = "simulate" :> Capture "district" String :> Get '[JSON] Scenario
      :<|> "districts" :> Get '[JSON] [String]

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

-- Handler
simulateHandler :: [Scenario] -> String -> Handler Scenario
simulateHandler scenarios district = 
    case filter (\s -> map toLower (districtName s) == map toLower district) scenarios of
        [] -> throwError err404 { errBody = "District not found" }
        (s:_) -> 
            let finalScenario = simulate 12 s
            in return $ finalScenario { narrative = generateNarrative finalScenario }

districtsHandler :: [Scenario] -> Handler [String]
districtsHandler scenarios = return $ nub $ map districtName scenarios

-- Application
app :: [Scenario] -> Application
app scenarios = serve api (simulateHandler scenarios :<|> districtsHandler scenarios)

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