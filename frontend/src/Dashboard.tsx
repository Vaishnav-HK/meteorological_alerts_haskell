import React, { useState } from 'react';
import { useSimulation, useDistricts, type Scenario } from './useSimulation';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { ShieldAlert, Play, Clock, ArrowRight, ChevronDown, Activity, Info, CheckCircle2, Loader2 } from 'lucide-react';
import LogicModal, { type FeedItem } from './LogicInspector';

const emptyChartData = Array.from({ length: 13 }, (_, i) => ({ hour: `${i}h`, Average: 100 }));
const emptyAssets = [
  { kind: 'PowerGrid', health: 100 },
  { kind: 'TransitHub', health: 100 },
  { kind: 'Hospital', health: 100 },
  { kind: 'Residential', health: 100 }
];

const Dashboard = () => {
  const [activeDistrict, setActiveDistrict] = useState('');
  const [activeHour, setActiveHour] = useState(0);
  const [openModal, setOpenModal] = useState<FeedItem | null>(null); 
  const [protocolState, setProtocolState] = useState<'idle' | 'dispatching' | 'sent'>('idle');
  const { data, loading, error } = useSimulation(activeDistrict);
  const { districts } = useDistricts();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setActiveDistrict(val);
    setActiveHour(0);
    setProtocolState('idle');
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
      case 'Red': return 'bg-apple-red/5 border-apple-red/20';
      case 'Orange': return 'bg-apple-orange/5 border-apple-orange/20';
      case 'Yellow': return 'bg-apple-yellow/5 border-apple-yellow/20';
      case 'Green': return 'bg-apple-green/5 border-apple-green/20';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getThreatColor = (threat?: string) => {
    switch (threat) {
      case 'Red': return 'border-apple-red shadow-apple-red/20 text-apple-red';
      case 'Orange': return 'border-apple-orange shadow-apple-orange/20 text-apple-orange';
      case 'Yellow': return 'border-apple-yellow shadow-apple-yellow/20 text-apple-yellow';
      case 'Green': return 'border-apple-green shadow-apple-green/20 text-apple-green';
      default: return 'border-gray-200 text-gray-400';
    }
  };

  const getDecayTint = (threat?: string) => {
    if (activeHour <= 6) return 'bg-transparent';
    switch (threat) {
      case 'Red': return 'bg-apple-red/10 rounded-xl scale-[1.02] shadow-sm -translate-y-1';
      case 'Orange': return 'bg-apple-orange/10 rounded-xl scale-[1.02] shadow-sm -translate-y-1';
      case 'Yellow': return 'bg-apple-yellow/10 rounded-xl scale-[1.02] shadow-sm -translate-y-1';
      default: return 'bg-transparent';
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

  const getSimulatedHealth = (finalHealth: number) => {
    return 100 - (activeHour * ((100 - finalHealth) / 12));
  };

  const calculateGlobalScore = (scenario?: Scenario) => {
    if (!scenario || !scenario.assets.length) return 100;
    const total = scenario.assets.reduce((acc, a) => acc + getSimulatedHealth(a.health), 0);
    return (total / scenario.assets.length).toFixed(1);
  };

  const getTooltipText = (scenario?: Scenario) => {
    if (!scenario || !scenario.assets.length) return "Awaiting simulation data.";
    const getH = (k: string) => getSimulatedHealth(scenario.assets.find(a => a.kind === k)?.health || 100).toFixed(0);
    return `Calculated average of current 12-hour projected health across all mapped assets (H=${getH('Hospital')}%, P=${getH('PowerGrid')}%, T=${getH('TransitHub')}%, R=${getH('Residential')}%).`;
  };

  const generateChartData = (scenario?: Scenario) => {
    if (!scenario) return emptyChartData;
    return Array.from({ length: 13 }, (_, hour) => {
      const point: any = { hour: `${hour}h` };
      let totalHealth = 0;
      scenario.assets.forEach(asset => {
        const initial = 100;
        const currentParams = initial - ((initial - asset.health) * (hour / 12));
        point[asset.kind] = Math.max(0, currentParams);
        totalHealth += point[asset.kind];
      });
      point['Average'] = totalHealth / scenario.assets.length;
      return point;
    });
  };

  const isBlank = !activeDistrict || !data;
  const chartData = isBlank ? emptyChartData : generateChartData(data!);
  const globalScore = isBlank ? "--" : calculateGlobalScore(data!);
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
                  protocolState === 'sent' ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg' : 
                  protocolState === 'dispatching' ? 'bg-gray-800 text-gray-200' :
                  isBlank ? 'bg-gray-300 text-white cursor-not-allowed' :
                  'bg-gray-900 text-white hover:scale-[1.02] active:scale-95 shadow-md'
                }`}
              >
                {protocolState === 'idle' && <>Execute Protocol <ArrowRight className="w-4 h-4"/></>}
                {protocolState === 'dispatching' && <><Loader2 className="w-4 h-4 animate-spin"/> DISPATCHING...</>}
                {protocolState === 'sent' && <><CheckCircle2 className="w-4 h-4"/> PROTOCOL SENT</>}
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
                  const currentH = getSimulatedHealth(asset.health);
                  return (
                    <div key={asset.kind} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[15px] font-medium text-gray-800 gap-4">
                        <span className="shrink-0">{asset.kind}</span>
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
                  )
                })}
              </div>
            </div>

            <div className={`bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white/20 h-[380px] flex flex-col transition-all duration-500 ${isBlank ? 'opacity-40 blur-[3px] pointer-events-none' : ''}`}>
              <h3 className="text-lg font-medium mb-4 text-gray-900">Degradation Trajectory & Scrubber</h3>
              
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
                    <Line type="monotone" dataKey="Average" stroke={isBlank ? "#cbd5e1" : "#0f172a"} strokeWidth={3} dot={false} strokeLinecap="round" />
                    {!isBlank && data?.assets.some(a => a.kind === 'Hospital') && <Line type="monotone" dataKey="Hospital" stroke="#84cc16" strokeWidth={2} strokeOpacity={0.7} dot={false} />}
                    {!isBlank && data?.assets.some(a => a.kind === 'PowerGrid') && <Line type="monotone" dataKey="PowerGrid" stroke="#64748b" strokeWidth={2} strokeOpacity={0.7} dot={false} />}
                    {!isBlank && data?.assets.some(a => a.kind === 'TransitHub') && <Line type="monotone" dataKey="TransitHub" stroke="#f59e0b" strokeWidth={2} strokeOpacity={0.7} dot={false} />}
                    {!isBlank && data?.assets.some(a => a.kind === 'Residential') && <Line type="monotone" dataKey="Residential" stroke="#d1d5db" strokeWidth={2} strokeOpacity={0.7} dot={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Slider */}
              <div className="relative px-4 pb-2">
                <div className="flex justify-between items-center text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">
                  <span>0h</span>
                  <motion.span 
                    animate={{ scale: activeHour > 0 ? 1 : 0.95 }}
                    className="text-gray-700 bg-white px-3 py-1 rounded-md shadow-sm border border-gray-200 block"
                  >
                    T + {activeHour}h
                  </motion.span>
                  <span>12h</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="12" step="1" 
                  value={activeHour}
                  onChange={(e) => setActiveHour(Number(e.target.value))}
                  disabled={isBlank}
                  className={`w-full appearance-none h-1.5 rounded-full outline-none transition-all ${isBlank ? 'bg-gray-200 cursor-not-allowed' : 'bg-slate-200 cursor-pointer'} [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-200 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform`}
                />
              </div>

              {/* Custom Legend */}
              <div className={`flex justify-end gap-3 mt-4 text-[10px] text-gray-500 font-medium uppercase tracking-wider pr-4 transition-opacity ${isBlank ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#84cc16]"></div>Hospital</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#64748b]"></div>Power</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>Transit</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#d1d5db]"></div>Residential</div>
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
                      Sector analysis indicates severe stress geometry loading up on structural and power grids.
                    </div>
                    <button onClick={() => setOpenModal('4h')} className="mt-2 text-[10px] uppercase tracking-widest font-semibold text-[#6a4b9a] hover:text-[#8a6ab5] flex items-center gap-1 transition-colors">
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
            onClose={() => setOpenModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
