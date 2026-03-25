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
}

export interface TrajectoryResponse {
  trDistrict: string;
  trThreat: string;
  trIntensity: string;
  trEvent: string;
  trTrajectory: TrajectoryPoint[];
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

export function useTrajectory(district: string) {
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);

  useEffect(() => {
    if (!district) {
      setTrajectory(null);
      return;
    }

    let isMounted = true;
    setLoadingTrajectory(true);
    setTrajectory(null);

    fetch(`http://localhost:8080/trajectory/${encodeURIComponent(district)}`)
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
  }, [district]);

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
