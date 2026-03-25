import React, { useState, useEffect } from 'react';
import { useSimulation, useDistricts, useTrajectory, type Scenario, type TrajectoryPoint } from './useSimulation';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ShieldAlert, Play, Clock, ArrowRight, ChevronDown, Activity, Info, CheckCircle2, Loader2 } from 'lucide-react';
import LogicModal, { type FeedItem } from './LogicInspector';

// ── Asset colour constants ────────────────────────────────────────────────────
const ASSET_COLORS = {
  Hospital: '#10b981',    // emerald-500
  PowerGrid: '#1e293b',   // slate-800
  TransitHub: '#f59e0b',  // amber-500
  Residential: '#94a3b8', // slate-400
  Communication: '#8B5CF6'// vibrant purple
} as const;

// ── Empty state helpers ───────────────────────────────────────────────────────
const emptyChartData = Array.from({ length: 13 }, (_, i) => ({
  hour: `${i}h`,
  Hospital: 100, PowerGrid: 100, TransitHub: 100, Residential: 100, Average: 100,
}));

const emptyAssets = [
  { kind: 'PowerGrid',   health: 100 },
  { kind: 'TransitHub',  health: 100 },
  { kind: 'Hospital',    health: 100 },
  { kind: 'Residential', health: 100 },
];

// ── Build chart data from the 13-point trajectory (divergent decay) ───────────
function buildChartData(points: TrajectoryPoint[], overridePoints?: TrajectoryPoint[]) {
  return points.map((p, i) => {
    const op = overridePoints?.[i];
    return {
      hour:        `${p.tpHour}h`,
      Hospital:    +p.tpHospital.toFixed(2),
      PowerGrid:   +p.tpPowerGrid.toFixed(2),
      TransitHub:  +p.tpTransitHub.toFixed(2),
      Residential: +p.tpResidential.toFixed(2),
      Communication: +p.tpCommunication.toFixed(2),
      Average:     +((p.tpHospital + p.tpPowerGrid + p.tpTransitHub + p.tpResidential + p.tpCommunication) / 5).toFixed(2),
      OHospital:   op ? +op.tpHospital.toFixed(2) : null,
      OPowerGrid:  op ? +op.tpPowerGrid.toFixed(2) : null,
      OTransitHub: op ? +op.tpTransitHub.toFixed(2) : null,
      OResidential: op ? +op.tpResidential.toFixed(2) : null,
      OCommunication: op ? +op.tpCommunication.toFixed(2) : null,
    };
  });
}

// ── Get per-asset health at a given hour from the trajectory ──────────────────
function getAssetHealthAt(points: TrajectoryPoint[], kind: string, hourIndex: number): number {
  const clamp = Math.min(Math.max(hourIndex, 0), 12);
  const pt = points[clamp];
  if (!pt) return 100;
  if (kind === 'Hospital')      return pt.tpHospital;
  if (kind === 'PowerGrid')     return pt.tpPowerGrid;
  if (kind === 'TransitHub')    return pt.tpTransitHub;
  if (kind === 'Residential')   return pt.tpResidential;
  if (kind === 'Communication') return pt.tpCommunication;
  return 100;
}

// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [activeDistrict, setActiveDistrict] = useState('');
  const [activeHour, setActiveHour] = useState(0);
  const [openModal, setOpenModal]   = useState<'0h' | '4h' | '8h' | '12h' | null>(null); 
  const [protocolState, setProtocolState] = useState<'idle' | 'dispatching' | 'sent'>('idle');
  const [overrideActive, setOverrideActive] = useState(false);
  const [overrideIntensity, setOverrideIntensity] = useState(150);
  const [debouncedIntensity, setDebouncedIntensity] = useState(150);
  const [overrideOrigin, setOverrideOrigin] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedIntensity(overrideIntensity);
    }, 100);
    return () => clearTimeout(handler);
  }, [overrideIntensity]);

  const { data, loading, error } = useSimulation(activeDistrict);
  const { trajectory }           = useTrajectory(
    activeDistrict,
    overrideActive ? overrideOrigin : undefined,
    overrideActive ? debouncedIntensity : undefined
  );
  const { districts }            = useDistricts();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setActiveDistrict(val);
    setActiveHour(0);
    setProtocolState('idle');
    setOverrideActive(false);
  };

  const handlePlaySimulation = () => {
    if(!activeDistrict) return;
    setActiveHour(0);
    let hour = 0;
    const interval = setInterval(() => {
      hour += 1;
      setActiveHour(hour);
      if (hour >= 12) clearInterval(interval);
    }, 200);
  };

  const handleExecuteProtocol = () => {
    setProtocolState('dispatching');
    setTimeout(() => {
      setProtocolState('sent');
    }, 2000);
  };

  const getHeroGlow = (threat?: string) => {
    switch (threat) {
      case 'Red':    return 'bg-apple-red/5 border-apple-red/20';
      case 'Orange': return 'bg-apple-orange/5 border-apple-orange/20';
      case 'Yellow': return 'bg-apple-yellow/5 border-apple-yellow/20';
      case 'Green':  return 'bg-apple-green/5 border-apple-green/20';
      default:       return 'bg-gray-50 border-gray-200';
    }
  };

  const getThreatColor = (threat?: string) => {
    switch (threat) {
      case 'Red':    return 'border-apple-red shadow-apple-red/20 text-apple-red';
      case 'Orange': return 'border-apple-orange shadow-apple-orange/20 text-apple-orange';
      case 'Yellow': return 'border-apple-yellow shadow-apple-yellow/20 text-apple-yellow';
      case 'Green':  return 'border-apple-green shadow-apple-green/20 text-apple-green';
      default:       return 'border-gray-200 text-gray-400';
    }
  };

  const getDecayTint = (threat?: string) => {
    if (activeHour <= 6) return 'bg-transparent';
    switch (threat) {
      case 'Red':    return 'bg-apple-red/10 rounded-xl scale-[1.02] shadow-sm -translate-y-1';
      case 'Orange': return 'bg-apple-orange/10 rounded-xl scale-[1.02] shadow-sm -translate-y-1';
      case 'Yellow': return 'bg-apple-yellow/10 rounded-xl scale-[1.02] shadow-sm -translate-y-1';
      default:       return 'bg-transparent';
    }
  };

  const getSoftBarColor = (health: number) => {
    if (health < 40) return 'bg-rose-400';
    if (health < 75) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  const getDeskriptiveTag = (health: number) => {
    if (health < 40) return '[High Failure Risk]';
    if (health < 75) return '[Structural Stress]';
    return '[Nominal Capacity]';
  };

  // Resolve current displayed health for an asset at the active hour
  // Uses trajectory data if available (divergent decay), otherwise falls back to linear interpolation
  const getDisplayHealth = (assetKind: string, finalHealth: number): number => {
    if (trajectory?.trOverrideTrajectory?.length && activeHour >= overrideOrigin) {
      return getAssetHealthAt(trajectory.trOverrideTrajectory, assetKind, activeHour);
    }
    if (trajectory?.trTrajectory?.length) {
      return getAssetHealthAt(trajectory.trTrajectory, assetKind, activeHour);
    }
    // Fallback: linear interpolation from final health
    return 100 - (activeHour * ((100 - finalHealth) / 12));
  };

  const calculateGlobalScore = (scenario?: Scenario): string => {
    if (!scenario || !scenario.assets.length) return '100';
    const total = scenario.assets.reduce((acc, a) => acc + getDisplayHealth(a.kind, a.health), 0);
    return (total / scenario.assets.length).toFixed(1);
  };

  const getTooltipText = (scenario?: Scenario) => {
    if (!scenario || !scenario.assets.length) return "Awaiting simulation data.";
    const getH = (k: string) => getDisplayHealth(k, scenario.assets.find(a => a.kind === k)?.health || 100).toFixed(0);
    return `Calculated average of current projected health across all mapped assets (H=${getH('Hospital')}%, P=${getH('PowerGrid')}%, T=${getH('TransitHub')}%, R=${getH('Residential')}%).`;
  };

  const isBlank  = !activeDistrict || !data;
  const chartData = (trajectory?.trTrajectory?.length)
    ? buildChartData(trajectory.trTrajectory, trajectory.trOverrideTrajectory)
    : isBlank ? emptyChartData : emptyChartData;

  const globalScore   = isBlank ? "--" : calculateGlobalScore(data!);
  const displayAssets = isBlank ? emptyAssets : data!.assets;

  return (
    <>
    <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-8">
      
      {/* Centered Top Search Dropdown */}
      <header className="flex flex-col items-center justify-center gap-6 mt-4">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">DRR Framework</h1>
          <p className="text-gray-500 text-sm mt-1">Logic-Based Urban Resilience Assessment</p>
        </div>
        
        <div className="relative w-full max-w-lg mb-4 group cursor-pointer">
          <select 
            className="w-full appearance-none pl-6 pr-12 py-3.5 rounded-xl bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-black/5 transition-all cursor-pointer"
            value={activeDistrict}
            onChange={handleSelectChange}
            disabled={loading}
          >
            <option value="" disabled>Select District for Impact Projection...</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors" />
        </div>
      </header>

      {/* Main Content Area */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 text-apple-red">
          <ShieldAlert className="w-12 h-12" />
          <div>
            <h2 className="text-xl font-semibold">System Alert: {error}</h2>
            <p className="text-sm opacity-80 mt-1">Unable to connect to Haskell Engine. Please ensure the backend is running.</p>
          </div>
        </motion.div>
      )}

      {/* Skeleton Overlay Lock */}
      <div className="relative">
        <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Hero & Scoring Column (Left) */}
          <div className="flex flex-col gap-6 col-span-1 border border-white/20 bg-white/70 backdrop-blur-md rounded-3xl shadow-sm text-center relative overflow-hidden">
            
            <div className={`p-8 rounded-t-3xl border-b backdrop-blur-md transition-colors ${getHeroGlow(data?.threat)}`}>
              <h2 className={`text-2xl font-medium tracking-tight text-gray-900 leading-tight ${isBlank ? 'opacity-30 blur-sm' : ''}`}>Current Conditions<br/>in {data?.districtName || 'District'}</h2>
              <div className={`mt-3 inline-flex flex-col gap-1 items-center justify-center p-3 bg-white/60 rounded-xl shadow-sm border border-white/50 w-full text-sm ${isBlank ? 'opacity-30 blur-sm' : ''}`}>
                <span className="font-semibold text-gray-800">IMD Alert: {data?.threat}</span>
                <span className="text-gray-600">Intensity: {data?.intensity} {data?.event === 'Rainfall' ? 'mm' : data?.event === 'WindSpeed' ? 'km/h' : ''}</span>
              </div>
            </div>

            <div className={`px-8 pb-4 transition-all duration-500 ${isBlank ? 'opacity-30 blur-sm delay-0' : ''}`}>
              <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 font-medium uppercase tracking-wider mb-2 group relative w-max mx-auto cursor-help">
                Resilience Index
                <Info className="w-3.5 h-3.5 text-gray-400" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2.5 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                  {getTooltipText(data!)}
                </div>
              </div>
              <div className="text-6xl font-semibold tracking-tighter text-gray-900">{globalScore}<span className="text-2xl text-gray-400 font-normal">%</span></div>
            </div>

            {/* Physical Situation Report */}
            <div className={`px-6 pb-6 text-left transition-all duration-500 origin-top ${isBlank ? 'opacity-30 blur-sm delay-0' : ''}`}>
              <div className={`p-4 transition-all duration-700 ease-in-out ${getDecayTint(data?.threat)}`}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Situation Report</div>
                <p className="text-[14px] leading-relaxed text-gray-800 font-medium h-24 overflow-hidden">
                  {data?.narrative || 'Awaiting structural assessment and atmospheric data cross-correlation from the Haskell framework logic.'}
                </p>
              </div>
            </div>

            <div className={`mt-auto p-6 rounded-b-3xl border-t shadow-inner text-left transition-colors duration-500 ${isBlank ? 'bg-gray-50 border-gray-100' : 'bg-white/80'} ${getThreatColor(data?.threat)}`}>
              <div className={`flex items-center gap-2 mb-2 ${isBlank ? 'opacity-30' : ''}`}>
                <ShieldAlert className="w-5 h-5" />
                <span className="font-semibold text-sm uppercase tracking-wider">Tactical Protocol</span>
              </div>
              <p className={`text-sm leading-relaxed font-medium text-gray-800 mb-4 h-16 ${isBlank ? 'opacity-30 blur-sm' : ''}`}>
                 {isBlank ? 'Awaiting Protocol Matrix' : 
                   Number(globalScore) < 35 ? "CRITICAL: Immediate Evacuation & Emergency Power Deployment." :
                   Number(globalScore) < 65 ? "WARNING: Partial Transit Shutdown & Grid Load Shedding." :
                   Number(globalScore) < 85 ? "ADVISORY: Monitor Localized Flooding/Infrastructure Stress." :
                   "STABLE: Standard Monitoring Protocols."}
              </p>
              
              <button 
                disabled={isBlank || protocolState === 'sent'} 
                onClick={handleExecuteProtocol}
                className={`w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-xl text-sm transition-all duration-300 ${
                  protocolState === 'sent'        ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg' : 
                  protocolState === 'dispatching' ? 'bg-gray-800 text-gray-200' :
                  isBlank                         ? 'bg-gray-300 text-white cursor-not-allowed' :
                  'bg-gray-900 text-white hover:scale-[1.02] active:scale-95 shadow-md'
                }`}
              >
                {protocolState === 'idle'        && <>Execute Protocol <ArrowRight className="w-4 h-4"/></>}
                {protocolState === 'dispatching' && <><Loader2 className="w-4 h-4 animate-spin"/> DISPATCHING...</>}
                {protocolState === 'sent'        && <><CheckCircle2 className="w-4 h-4"/> PROTOCOL SENT</>}
              </button>
            </div>
          </div>

          {/* Infrastructure Decay Pulse Area (Middle) */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 relative">
            <div className={`bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white/20 transition-all duration-500 ${isBlank ? 'opacity-40 blur-sm pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Infrastructure Impact</h3>
                <button onClick={handlePlaySimulation} disabled={isBlank} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-xs font-medium transition-colors">
                  <Play className="w-3.5 h-3.5" /> Play Simulation
                </button>
              </div>
              <div className="flex flex-col gap-6">
                {displayAssets.map((asset) => {
                  const currentH = getDisplayHealth(asset.kind, asset.health);
                  const assetColor = ASSET_COLORS[asset.kind as keyof typeof ASSET_COLORS];
                  return (
                    <div key={asset.kind} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[15px] font-medium text-gray-800 gap-4">
                        <span className="shrink-0 flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: assetColor ?? '#94a3b8' }}
                          />
                          {asset.kind}
                        </span>
                        <div className="flex items-center justify-end gap-3 flex-1 text-right">
                          <span className="text-gray-500 text-xs font-normal whitespace-nowrap">{getDeskriptiveTag(currentH)}</span>
                          <span className="w-12 text-right shrink-0">{currentH.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-4 w-full bg-slate-100 shadow-inner rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: `${currentH}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                          className={`h-full rounded-full shadow-sm ${isBlank ? 'bg-gray-300' : getSoftBarColor(currentH)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Degradation Trajectory & Scrubber */}
            <div className={`bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white/20 h-[380px] flex flex-col relative transition-all duration-500 ${isBlank ? 'opacity-40 blur-[3px] pointer-events-none' : ''}`}>
              <h3 className="text-lg font-medium mb-4 text-gray-900">Degradation Trajectory &amp; Scrubber</h3>
              
              <div className="flex-1 -ml-4 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} domain={[0, 100]} dx={-10} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.85)' }}
                      labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}
                    />
                    {!isBlank && <ReferenceLine x={`${activeHour}h`} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" />}

                    {/* Ghost/Original Lines -> dashed and faded if override is active */}
                    <Line type="monotone" dataKey="Hospital"    stroke={ASSET_COLORS.Hospital}    strokeWidth={overrideActive ? 2 : 2.5} dot={false} strokeDasharray={overrideActive ? "5 5" : ""} strokeOpacity={isBlank ? 0.3 : overrideActive ? 0.3 : 0.9} strokeLinecap="round" />
                    <Line type="monotone" dataKey="Residential" stroke={ASSET_COLORS.Residential} strokeWidth={overrideActive ? 2 : 2}   dot={false} strokeDasharray={overrideActive ? "5 5" : ""} strokeOpacity={isBlank ? 0.3 : overrideActive ? 0.3 : 0.85} strokeLinecap="round" />
                    <Line type="monotone" dataKey="TransitHub"  stroke={ASSET_COLORS.TransitHub}  strokeWidth={overrideActive ? 2 : 2}   dot={false} strokeDasharray={overrideActive ? "5 5" : ""} strokeOpacity={isBlank ? 0.3 : overrideActive ? 0.3 : 0.85} strokeLinecap="round" />
                    <Line type="monotone" dataKey="PowerGrid"   stroke={ASSET_COLORS.PowerGrid}   strokeWidth={overrideActive ? 2 : 2.5} dot={false} strokeDasharray={overrideActive ? "5 5" : ""} strokeOpacity={isBlank ? 0.3 : overrideActive ? 0.3 : 0.9} strokeLinecap="round" />
                    <Line type="monotone" dataKey="Communication" stroke={ASSET_COLORS.Communication} strokeWidth={overrideActive ? 2 : 2.5} dot={false} strokeDasharray={overrideActive ? "5 5" : ""} strokeOpacity={isBlank ? 0.3 : overrideActive ? 0.3 : 0.9} strokeLinecap="round" />

                    {/* Bold Solid Override Lines */}
                    {(overrideActive && trajectory?.trOverrideTrajectory) && (
                      <>
                        <Line type="monotone" dataKey="OHospital"    stroke={ASSET_COLORS.Hospital}    strokeWidth={3} dot={false} strokeLinecap="round" />
                        <Line type="monotone" dataKey="OResidential" stroke={ASSET_COLORS.Residential} strokeWidth={3} dot={false} strokeLinecap="round" />
                        <Line type="monotone" dataKey="OTransitHub"  stroke={ASSET_COLORS.TransitHub}  strokeWidth={3} dot={false} strokeLinecap="round" />
                        <Line type="monotone" dataKey="OPowerGrid"   stroke={ASSET_COLORS.PowerGrid}   strokeWidth={3} dot={false} strokeLinecap="round" />
                        <Line type="monotone" dataKey="OCommunication" stroke={ASSET_COLORS.Communication} strokeWidth={3} dot={false} strokeLinecap="round" />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Slider / Timeline Controls */}
              <div className="relative px-4 pb-2 z-20 mt-2">
                
                {/* Time Scrubber */}
                <div className="flex justify-between items-center text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">
                  <span>0h</span>
                  <motion.span 
                    animate={{ scale: activeHour > 0 ? 1 : 0.95 }}
                    className={`px-3 py-1 rounded-md shadow-sm border block transition-colors ${overrideActive ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-200 text-gray-700'}`}
                  >
                    {overrideActive ? `NEW ORIGIN: T+${activeHour}h` : `T + ${activeHour}h`}
                  </motion.span>
                  <span>12h</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="12" step="1" 
                  value={activeHour}
                  onChange={(e) => setActiveHour(Number(e.target.value))}
                  disabled={isBlank}
                  className={`w-full appearance-none h-1.5 rounded-full outline-none transition-all ${isBlank ? 'bg-gray-200 cursor-not-allowed' : 'bg-slate-200 cursor-pointer'} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-200 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform relative z-10`}
                />

                {/* Horizontal Override Slider */}
                <div className={`mt-6 flex items-center justify-between gap-4 transition-opacity duration-300 ${isBlank ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap w-32">
                    Forecast Intensity
                  </span>
                  
                  <div className="flex-1 relative flex items-center">
                    <input 
                      type="range"
                      min="50" max="350" step="1"
                      value={overrideActive ? overrideIntensity : (trajectory ? parseInt(trajectory.trIntensity) || 150 : 150)}
                      onChange={(e) => {
                        if (!overrideActive || activeHour !== overrideOrigin) {
                          setOverrideOrigin(activeHour);
                        }
                        setOverrideActive(true);
                        setOverrideIntensity(Number(e.target.value));
                      }}
                      disabled={isBlank}
                      className="w-full appearance-none h-2.5 rounded-full outline-none bg-white/60 backdrop-blur-md shadow-inner transition-all border border-gray-200/50 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-100 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform relative z-10"
                    />
                  </div>

                  <div className="w-16 text-right flex flex-col items-end">
                    <span className="text-[12px] font-bold text-gray-800 bg-white/80 backdrop-blur-md shadow-sm border border-gray-200/50 px-2.5 py-1 rounded-lg">
                      {overrideActive ? overrideIntensity : (trajectory ? parseInt(trajectory.trIntensity) || 150 : 150)} mm
                    </span>
                    <AnimatePresence>
                      {overrideActive && (
                        <motion.button 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          exit={{ opacity: 0, height: 0 }}
                          onClick={() => setOverrideActive(false)} 
                          className="mt-1.5 text-[9px] uppercase tracking-wider text-apple-red font-bold hover:underline"
                        >
                          Reset
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* Custom Legend — fanned out order, top to bottom: Hospital, Residential, TransitHub, PowerGrid, Communication */}
              <div className={`flex justify-end gap-3 mt-4 text-[10px] text-gray-500 font-medium uppercase tracking-wider pr-4 transition-opacity ${isBlank ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS.Hospital }}></div>Hospital</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS.Residential }}></div>Residential</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS.TransitHub }}></div>Transit</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS.PowerGrid }}></div>Power</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS.Communication }}></div>Comm</div>
              </div>

            </div>

            {isBlank && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 w-full max-w-lg mx-auto">
                 <div className="bg-white/80 backdrop-blur-xl border border-white px-8 py-5 rounded-2xl shadow-xl text-center flex flex-col items-center">
                    <Activity className="w-8 h-8 text-gray-400 mb-3" />
                    <span className="font-semibold text-gray-900">Awaiting Designation</span>
                    <p className="text-gray-500 text-sm mt-1 max-w-[260px]">Please select a district to view current status and 12-hour projection.</p>
                 </div>
               </div>
            )}
            
          </div>

          {/* Event Timeline (Right) */}
          <div className={`col-span-1 bg-white/70 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-sm flex flex-col transition-all duration-500 ${isBlank ? 'opacity-40 blur-sm pointer-events-none' : ''}`}>
             <div className="flex items-center gap-2 mb-8 text-gray-900">
               <Clock className="w-5 h-5" />
               <h3 className="text-lg font-medium">Live Feed</h3>
             </div>

             <div className="relative border-l border-gray-200 ml-3 flex flex-col gap-8 flex-1">

                {/* 0h entry — always visible once district is chosen */}
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="relative pl-6">
                    <div className={`absolute w-3 h-3 bg-white border-2 rounded-full -left-[6.5px] top-1.5 ${(!isBlank && data?.threat === 'Red') ? 'border-apple-red' : (!isBlank && data?.threat === 'Orange') ? 'border-apple-orange' : 'border-gray-300'}`}></div>
                    <div className="text-xs font-semibold text-gray-400 mb-1">0h - T+0.00</div>
                    <div className="text-[15px] font-medium text-gray-800 leading-snug">
                      {isBlank ? 'Awaiting Data...' : `Alert Active. IMD registers highly anomalous ${data!.event.toLowerCase()} activity over ${data!.districtName}.`}
                    </div>
                    {!isBlank && (
                      <button onClick={() => setOpenModal('0h')} className="mt-2 text-[10px] uppercase tracking-widest font-semibold text-[#6a4b9a] hover:text-[#8a6ab5] flex items-center gap-1 transition-colors">
                        <span>⌥</span> View Haskell Logic
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* 4h entry */}
                <AnimatePresence>
                  {(!isBlank && activeHour >= 4) && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-white border-2 border-amber-500 rounded-full -left-[6.5px] top-1.5"></div>
                    <div className="text-xs font-semibold text-gray-400 mb-1">4h - T+4.00</div>
                    <div className="text-[15px] font-medium text-gray-800 leading-snug">
                      Divergent decay curves emerging. Power Grid health critically separating from Hospital resilience.
                    </div>
                    <button onClick={() => setOpenModal('4h')} className="mt-2 text-[10px] uppercase tracking-widest font-semibold text-[#6a4b9a] hover:text-[#8a6ab5] flex items-center gap-1 transition-colors">
                      <span>⌥</span> View Haskell Logic
                    </button>
                  </motion.div>
                  )}
                </AnimatePresence>

                {/* 8h entry */}
                <AnimatePresence>
                  {(!isBlank && activeHour >= 8) && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-white border-2 border-purple-500 rounded-full -left-[6.5px] top-1.5"></div>
                    <div className="text-xs font-semibold text-gray-400 mb-1">8h - T+8.00</div>
                    <div className="text-[15px] font-medium text-gray-800 leading-snug">
                       Communication node stress detected. Switching to backup satellite link as terrestrial fiber enters critical saturation.
                    </div>
                    <button onClick={() => setOpenModal('8h')} className="mt-2 text-[10px] uppercase tracking-widest font-semibold text-[#6a4b9a] hover:text-[#8a6ab5] flex items-center gap-1 transition-colors">
                      <span>⌥</span> View Haskell Logic
                    </button>
                  </motion.div>
                  )}
                </AnimatePresence>

                {/* 12h entry */}
                <AnimatePresence>
                  {(!isBlank && activeHour >= 12) && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-white border-2 border-gray-400 rounded-full -left-[6.5px] top-1.5"></div>
                    <div className="text-xs font-semibold text-gray-400 mb-1">12h - T+12.00</div>
                    <div className="text-[15px] font-medium text-gray-800 leading-snug">
                      Simulation Complete. Systemic Capacity depleted to {globalScore}%.
                    </div>
                    <button onClick={() => setOpenModal('12h')} className="mt-2 text-[10px] uppercase tracking-widest font-semibold text-[#6a4b9a] hover:text-[#8a6ab5] flex items-center gap-1 transition-colors">
                      <span>⌥</span> View Haskell Logic
                    </button>
                  </motion.div>
                  )}
                </AnimatePresence>

             </div>

             <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-3">
                <div className="relative flex h-3 w-3">
                  {(!isBlank && activeHour < 12) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isBlank || activeHour === 12 ? 'bg-gray-300' : 'bg-emerald-500'}`}></span>
                </div>
                <span className="text-xs font-medium text-gray-500">{isBlank ? 'Stream Idle' : activeHour === 12 ? 'Stream Offline' : 'Engine Stream Active'}</span>
             </div>
          </div>

        </motion.div>
        </AnimatePresence>
      </div>

    </div>

      {/* Logic Trace Modal */}
      <AnimatePresence>
        {openModal !== null && data && (
          <LogicModal
            item={openModal!}
            threat={data!.threat}
            event={data!.event}
            overrideData={overrideActive ? { intensity: overrideIntensity, origin: overrideOrigin } : undefined}
            onClose={() => setOpenModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
