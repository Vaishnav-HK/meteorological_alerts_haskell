import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';

// ── Haskell SVG logo ──────────────────────────────────────────────────────────
const HaskellLogo = () => (
  <svg width="16" height="16" viewBox="0 0 256 256" fill="none">
    <path d="M0 256L64 128L0 0H48L112 128L48 256H0Z" fill="#8a6ab5"/>
    <path d="M72 256L136 128L72 0H120L248 256H200L164 192H116L100 256H72ZM128 160H188L156 96L128 160Z" fill="#6a4b9a"/>
  </svg>
);

// ── Snippet definitions ───────────────────────────────────────────────────────
interface SnippetLine { code: string; hot?: boolean }
interface Snippet { label: string; lines: SnippetLine[] }

export type FeedItem = '0h' | '4h' | '8h' | '12h';

type OverrideDataForTrace = {
  intensity: number;
  origin: number;
  hasNegativeOffset?: boolean;
  hasResilienceOffsets: boolean;
  hasIntensityOverride: boolean;
};

function getSnippet(
  item: FeedItem,
  _threat?: string,
  hazard?: string,
  overrideData?: OverrideDataForTrace
): Snippet {
  if (item === '0h') {
    return {
      label: 'Initial Alert — generateNarrative',
      lines: [
        { code: 'generateNarrative :: Scenario -> String' },
        { code: 'generateNarrative sc = case (hazard sc, threat sc) of' },
        { code: `    ("${hazard ?? 'Rainfall'}", Red) -> "Critical ${hazard ?? 'rainfall'} is overwhelming " ++ ...`, hot: true },
        { code: '    ("Cyclone", _)    -> "High-velocity cyclonic winds are actively ..." ' },
        { code: '    _                 -> "Localized " ++ hazard sc ++ " events observed."' },
      ]
    };
  }

  if (item === '4h') {
    const hasIntensityOverride = !!overrideData?.hasIntensityOverride;
    const hasResilienceOffsets = !!overrideData?.hasResilienceOffsets;
    return {
      label: hasIntensityOverride
        ? '4h Resilience — healthWithOverride'
        : hasResilienceOffsets
          ? '4h Resilience — healthAtOffset'
          : '4h Resilience — resilienceCoefficient',
      lines: hasIntensityOverride ? [
        { code: 'healthWithOverride :: AssetType -> Double -> Int -> Double -> Int -> Double' },
        { code: 'healthWithOverride asset initialI rootT newI t =' },
        { code: '    let r = resilienceCoefficient asset' },
        { code: '        decay = if t <= rootT' },
        { code: '                then r ** (fromIntegral t * initialI / 300.0)' },
        { code: '                else r ** (fromIntegral rootT * initialI / 300.0' },
        { code: `                           + fromIntegral (t - rootT) * ${overrideData.intensity} / 300.0)`, hot: true },
        { code: '    in max 0.0 (100.0 * decay)' },
      ] : [
        ...(hasResilienceOffsets
          ? [
              { code: 'healthAtOffset :: AssetType -> Double -> Double -> Int -> Double' },
              { code: 'healthAtOffset assetType intensityVal offset t =' },
              { code: '    let rEff = effectiveResilience assetType offset' },
              { code: '        decay = rEff ** (fromIntegral t * intensityVal / 300.0)', hot: true },
              { code: '    in max 0.0 (100.0 * decay)' },
            ]
          : [
              { code: 'resilienceCoefficient :: AssetType -> Double' },
              { code: 'resilienceCoefficient Hospital    = 0.98' },
              { code: 'resilienceCoefficient Residential = 0.85' },
              { code: 'resilienceCoefficient TransitHub  = 0.75' },
              { code: 'resilienceCoefficient PowerGrid   = 0.65', hot: true },
              { code: '' },
              { code: '-- Recursive Health Step:' },
              { code: 'Health(t) = Health(t-1) * (R ^ (Intensity / 300))', hot: true },
            ]),
      ]
    };
  }

  if (item === '8h') {
    return {
      label: '8h Dependency — Interdependent Decay',
      lines: [
        { code: 'communicationTrajectory :: Double -> [Double] -> [Double]' },
        { code: 'communicationTrajectory intensityVal pPoints =' },
        { code: '    let r = resilienceCoefficient Communication' },
        { code: '        step prevHealth pHealth =' },
        { code: '            let effectiveI = if pHealth < 30.0 then intensityVal * 3.0 else intensityVal', hot: true },
        { code: '                decayFactor = r ** (effectiveI / 300.0)' },
        { code: '            in prevHealth * decayFactor' },
        { code: '    in scanl step 100.0 (tail pPoints)' },
      ]
    };
  }

  // 12h
  const hasIntensityOverride = !!overrideData?.hasIntensityOverride;
  const hasResilienceOffsets = !!overrideData?.hasResilienceOffsets;
  return {
    label: (hasIntensityOverride || hasResilienceOffsets)
      ? '12h Convergence — Override Branching'
      : '12h Convergence — Trajectory Build',
    lines: hasIntensityOverride ? [
      { code: 'mOverrideTrajectory = case (mOrigin, mIntensity) of' },
      { code: `    (Just oTime, Just ${overrideData.intensity}) -> `, hot: true },
      { code: '        let hO = trajectoryWithOverride Hospital intensityVal oTime oInt' },
      { code: '            pO = trajectoryWithOverride PowerGrid intensityVal oTime oInt' },
      { code: '            ... ' },
      { code: '        in Just (zipWith5 mkPoint [0..12] hO pO tO rO)', hot: true },
    ] : hasResilienceOffsets ? [
      { code: '... offset-based branch uses trajectoryForOffset ...', hot: true },
      { code: 'trajectoryForOffset assetType intensityVal offset =' },
      { code: '    map (healthAtOffset assetType intensityVal offset) [0..12]' },
    ] : [
      { code: 'buildTrajectory :: Scenario -> TrajectoryResponse' },
      { code: 'buildTrajectory sc =' },
      { code: '    let intensityVal = parseIntensity (intensity sc)' },
      { code: '        pPoints      = trajectoryFor PowerGrid intensityVal', hot: true },
      { code: '        trajectory   = zipWith5 mkPoint [0..12] hPoints pPoints ...', hot: true },
      { code: '    in TrajectoryResponse { trTrajectory = trajectory, ... }' },
    ]
  };
}

// ── Minimal syntax highlighter ────────────────────────────────────────────────
function syntaxHighlight(code: string): React.ReactNode {
  if (!code) return <span>&nbsp;</span>;
  const tokens = code.split(/(\s+|--[^\n]*|"[^"]*"|::|->|=|\||[A-Z][a-zA-Z0-9]*|\d+\.\d+|\d+|[a-z][a-zA-Z0-9]*|[()[\]{},+\-*/\\<>!&|]+)/g);
  return (
    <>
      {tokens.map((tok, i) => {
        if (!tok) return null;
        if (tok.startsWith('--')) return <span key={i} className="text-[#8b949e]">{tok}</span>;
        if (tok.startsWith('"'))  return <span key={i} className="text-[#a5d6ff]">{tok}</span>;
        if (/^[A-Z]/.test(tok))  return <span key={i} className="text-[#ff7b72]">{tok}</span>;
        if (/^(::|->|=|\||where|let|in|do|if|then|else|case|of|map|return)$/.test(tok))
                                  return <span key={i} className="text-[#d2a8ff]">{tok}</span>;
        if (/^\d/.test(tok))     return <span key={i} className="text-[#79c0ff]">{tok}</span>;
        return <span key={i} className="text-[#c9d1d9]">{tok}</span>;
      })}
    </>
  );
}

// ── Modal component ───────────────────────────────────────────────────────────
interface LogicModalProps {
  item: FeedItem;
  threat?: string;
  hazard?: string;
  overrideData?: OverrideDataForTrace;
  isHistoricalMode?: boolean;
  historicalSeries?: number[];
  onClose: () => void;
}

export const LogicModal: React.FC<LogicModalProps> = ({ item, threat, hazard, overrideData, isHistoricalMode, historicalSeries, onClose }) => {
  const snippet = getSnippet(item, threat, hazard, overrideData);
  const weightedAsset =
    hazard === 'Cyclone'
      ? 'Communication'
      : hazard === 'Heatwave'
        ? 'PowerGrid'
        : 'All Assets';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
      >
        {/* Modal panel — stop propagation so click inside doesn't close */}
        <motion.div
          key="modal"
          initial={{ scale: 0.9, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-[#30363d] bg-[#0d1117]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#161b22] border-b border-[#30363d]">
            <div className="flex items-center gap-2.5">
              <HaskellLogo />
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="text-[12px] text-[#8b949e] font-medium">
                Classifier.hs — {snippet.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#1a7f37]/20 border border-[#2ea043]/40 text-[#3fb950] px-2 py-0.5 rounded-full text-[11px] font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Logic Verified
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#c9d1d9] hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hazard-specific stress banner */}
          {hazard && (
            <div className="px-5 py-3 bg-[#1f2937] border-b border-[#30363d] flex items-center gap-3 border-l-4 border-l-indigo-500">
              <div className="p-1.5 rounded-full bg-indigo-500/20 text-indigo-300 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" />
                </svg>
              </div>
              <p className="text-[#c9d1d9] text-[13px] leading-relaxed font-medium">
                <strong className="text-indigo-300 block mb-0.5 mt-0.5">Hazard-Specific Stress:</strong>
                Hazard-Specific Stress: <span className="text-indigo-300 font-bold">{hazard}</span> weighting applied to{' '}
                <span className="text-indigo-300 font-bold">{weightedAsset}</span> decay model.
              </p>
            </div>
          )}

          {/* Data Source Archive Banner */}
          {isHistoricalMode && (
            <div className="px-5 py-3 bg-[#1f2937] border-b border-[#30363d] flex items-center gap-3 border-l-4 border-l-cyan-500">
              <div className="p-1.5 rounded-full bg-cyan-500/20 text-cyan-300 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="M9 18v-6"/></svg>
              </div>
              <div className="text-[#c9d1d9] text-[13px] leading-relaxed font-medium">
                <strong className="text-cyan-300 block mb-0.5 mt-0.5">MODE: Historical Archive. Data Source: imdlib.</strong>
                {historicalSeries && historicalSeries.length > 0 ? (
                  <>
                    <span className="text-gray-400 text-xs font-mono block my-1 bg-black/30 p-1.5 rounded">Sequence: [{historicalSeries.join(', ')}]</span>
                    T+{historicalSeries.indexOf(Math.max(...historicalSeries))} Intensity Spike detected ({Math.max(...historicalSeries)} {hazard === 'Rainfall' ? 'mm' : hazard==='Heatwave'?'°C':'km/h'}/hr). Evaluating surge-load on {weightedAsset}.
                  </>
                ) : (
                  <>Validating model against observed historical intensity.</>
                )}
              </div>
            </div>
          )}

          {/* Override Alert Banner */}
          {overrideData && (
            <div className="px-5 py-3 bg-[#1f2937] border-b border-[#30363d] flex items-center gap-3 border-l-4 border-l-amber-500">
              <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-500 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p className="text-[#c9d1d9] text-[13px] leading-relaxed font-medium">
                <strong className="text-white block mb-0.5 mt-0.5">Manual Override Detected:</strong>
                {overrideData.hasIntensityOverride ? (
                  <>
                    Recalculating future impact from <span className="text-amber-400 font-bold">T+{overrideData.origin}</span> using <span className="text-amber-400 font-bold">{overrideData.intensity}mm</span>.
                  </>
                ) : (
                  <>
                    Applying resilience offsets across all future steps (including T+0).
                  </>
                )}
              </p>
            </div>
          )}
          {/* Vulnerability Injection Alert */}
          {overrideData?.hasNegativeOffset && (
            <div className="px-5 py-3 bg-[#1f2937] border-b border-[#30363d] flex items-center gap-3 border-l-4 border-l-rose-500">
              <div className="p-1.5 rounded-full bg-rose-500/20 text-rose-400 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <p className="text-[#c9d1d9] text-[13px] leading-relaxed font-medium">
                <strong className="text-rose-300 block mb-0.5 mt-0.5">Vulnerability Injection:</strong>
                Asset resilience reduced due to simulated maintenance deficit. Accelerating failure vectors.
              </p>
            </div>
          )}

          {/* Code block */}
          <div className="p-5 overflow-x-auto">
            <pre style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[13px] leading-7 m-0">
              {snippet.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-4 px-3 rounded transition-colors ${
                    line.hot
                      ? 'bg-[#1a7f37]/25 border-l-2 border-[#3fb950] shadow-[0_0_12px_rgba(63,185,80,0.08)]'
                      : ''
                  }`}
                >
                  <span className="select-none w-5 shrink-0 text-right text-[#484f58]">{idx + 1}</span>
                  <span className={line.hot ? 'text-[#3fb950]' : ''}>
                    {syntaxHighlight(line.code)}
                  </span>
                </div>
              ))}
            </pre>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#161b22] border-t border-[#30363d]">
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] text-[#484f58]">
              GHC 9.6 · servant-server · aeson
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white/5 text-[#8b949e] hover:bg-white/10 text-[12px] font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LogicModal;
