import { useState, useEffect } from 'react';

export interface Asset {
  kind: string;
  health: number;
}

export interface Scenario {
  districtName: string;
  event: string;
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
  trDistrict: string;
  trThreat: string;
  trIntensity: string;
  trEvent: string;
  trTrajectory: TrajectoryPoint[];
  trOverrideTrajectory?: TrajectoryPoint[];
}

export type AssetKey = 'Hospital' | 'PowerGrid' | 'TransitHub' | 'Residential' | 'Communication';

export interface TrajectoryQueryParams {
  // Intensity override is only meaningful when both overrideOrigin and overrideIntensity are present.
  overrideOrigin?: number;
  overrideIntensity?: number;
  resilienceOverrides?: Partial<Record<AssetKey, number>>;
}

function buildTrajectoryUrl(district: string, params: TrajectoryQueryParams) {
  const url = new URL(`http://localhost:8080/trajectory/${encodeURIComponent(district)}`);

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

  return url.toString();
}

export function useSimulation(district: string) {
  const [data, setData] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!district) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`http://localhost:8080/simulate/${encodeURIComponent(district)}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("District Not Found");
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
  }, [district]);

  return { data, loading, error };
}

export function useTrajectory(
  district: string,
  params: TrajectoryQueryParams
) {
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);

  // Serialise offsets so the effect dependency comparison works correctly.
  // (We intentionally include this key instead of the full object to avoid unnecessary rerenders.)
  const offsetsKey = params.resilienceOverrides ? JSON.stringify(params.resilienceOverrides) : '';

  useEffect(() => {
    if (!district) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setLoadingTrajectory(true);

    // Keep the previous trajectory while fetching to avoid visible "reset jumps".
    const url = buildTrajectoryUrl(district, params);
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
  }, [district, params.overrideOrigin, params.overrideIntensity, offsetsKey]);

  return { trajectory, loadingTrajectory };
}

export function useDistricts() {
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/districts')
      .then(res => res.json())
      .then(json => {
        setDistricts(json);
        setLoadingDistricts(false);
      })
      .catch((err) => {
        console.error("Failed to fetch districts", err);
        setLoadingDistricts(false);
      });
  }, []);

  return { districts, loadingDistricts };
}
