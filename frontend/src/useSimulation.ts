import { useState, useEffect } from 'react';

export interface Asset {
  kind: string;
  health: number;
}

export interface Scenario {
  hazard: string;
  intensity: string;
  narrative: string;
  assets: Asset[];
  threat: string;
  hour: number;
}

export interface TrajectoryPoint {
  tpHour: number;
  tpHospital: number;
  tpPowerGrid: number;
  tpTransitHub: number;
  tpResidential: number;
  tpCommunication: number;
}

export interface TrajectoryResponse {
  trHazard: string;
  trThreat: string;
  trIntensity: string;
  trTrajectory: TrajectoryPoint[];
  trOverrideTrajectory?: TrajectoryPoint[];
}

export type AssetKey = 'Hospital' | 'PowerGrid' | 'TransitHub' | 'Residential' | 'Communication';

export interface TrajectoryQueryParams {
  // Intensity override is only meaningful when both overrideOrigin and overrideIntensity are present.
  overrideOrigin?: number;
  overrideIntensity?: number;
  resilienceOverrides?: Partial<Record<AssetKey, number>>;
  historicalSeries?: number[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function buildTrajectoryUrl(hazard: string, params: TrajectoryQueryParams) {
  const url = new URL(`${API_BASE_URL}/trajectory/${encodeURIComponent(hazard)}`);

  if (params.overrideOrigin !== undefined && params.overrideIntensity !== undefined) {
    url.searchParams.append('overrideOrigin', params.overrideOrigin.toString());
    url.searchParams.append('overrideIntensity', params.overrideIntensity.toString());
  }

  if (params.resilienceOverrides) {
    const paramMap: Record<AssetKey, string> = {
      Hospital: 'hoOffset',
      PowerGrid: 'pgOffset',
      TransitHub: 'thOffset',
      Residential: 'rOffset',
      Communication: 'cOffset',
    };

    (Object.entries(params.resilienceOverrides) as Array<[AssetKey, number]>).forEach(([asset, val]) => {
      if (val !== 0 && paramMap[asset]) url.searchParams.append(paramMap[asset], val.toString());
    });
  }

  if (params.historicalSeries !== undefined && params.historicalSeries.length > 0) {
    url.searchParams.append('historicalIntensity', JSON.stringify(params.historicalSeries));
  }

  return url.toString();
}

export function useSimulation(hazard: string, historicalSeries?: number[]) {
  const [data, setData] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hazard) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    setLoading(true);
    setError(null);

    const url = new URL(`${API_BASE_URL}/simulate/${encodeURIComponent(hazard)}`);
    if (historicalSeries !== undefined && historicalSeries.length > 0) {
      url.searchParams.append('historicalIntensity', JSON.stringify(historicalSeries));
    }

    fetch(url.toString())
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Hazard Not Found");
          throw new Error("API Error");
        }
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message === "Failed to fetch" ? "System Offline" : err.message);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hazard, historicalSeries ? JSON.stringify(historicalSeries) : '']);

  return { data, loading, error };
}

export function useTrajectory(
  hazard: string,
  params: TrajectoryQueryParams
) {
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);

  // Serialise offsets so the effect dependency comparison works correctly.
  // (We intentionally include this key instead of the full object to avoid unnecessary rerenders.)
  const offsetsKey = params.resilienceOverrides ? JSON.stringify(params.resilienceOverrides) : '';
  const hsKey = params.historicalSeries ? JSON.stringify(params.historicalSeries) : '';

  useEffect(() => {
    if (!hazard) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setLoadingTrajectory(true);

    // Keep the previous trajectory while fetching to avoid visible "reset jumps".
    const url = buildTrajectoryUrl(hazard, params);
    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error("Trajectory fetch failed");
        return res.json();
      })
      .then(json => {
        if (isMounted) {
          setTrajectory(json);
          setLoadingTrajectory(false);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // Ignore aborted requests when params change quickly.
        if (err?.name === 'AbortError') return;
        setLoadingTrajectory(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hazard, params.overrideOrigin, params.overrideIntensity, hsKey, offsetsKey]);

  return { trajectory, loadingTrajectory };
}

// District-based data has been removed; hazard selection is handled in the UI.
