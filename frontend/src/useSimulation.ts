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

export function useSimulation(district: string) {
  const [data, setData] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!district) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    setLoading(true);
    setError(null);
    setData(null);

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
  overrideOrigin?: number,
  overrideIntensity?: number,
  resilienceOffsets?: Record<string, number>
) {
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);

  // Serialise offsets so the effect dependency comparison works correctly
  const offsetsKey = resilienceOffsets ? JSON.stringify(resilienceOffsets) : '';

  useEffect(() => {
    if (!district) {
      setTrajectory(null);
      return;
    }

    let isMounted = true;
    setLoadingTrajectory(true);
    setTrajectory(null);

    const url = new URL(`http://localhost:8080/trajectory/${encodeURIComponent(district)}`);
    if (overrideOrigin !== undefined && overrideIntensity !== undefined) {
      url.searchParams.append('overrideOrigin', overrideOrigin.toString());
      url.searchParams.append('overrideIntensity', overrideIntensity.toString());
    }
    if (resilienceOffsets) {
      const paramMap: Record<string, string> = {
        Hospital: 'hoOffset', PowerGrid: 'pgOffset',
        TransitHub: 'thOffset', Residential: 'rOffset', Communication: 'cOffset'
      };
      Object.entries(resilienceOffsets).forEach(([asset, val]) => {
        if (val !== 0 && paramMap[asset]) {
          url.searchParams.append(paramMap[asset], val.toString());
        }
      });
    }

    fetch(url.toString())
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
      .catch(() => {
        if (isMounted) setLoadingTrajectory(false);
      });

    return () => { isMounted = false; };
  }, [district, overrideOrigin, overrideIntensity, offsetsKey]);

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
