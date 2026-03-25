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

function getSnippet(item: FeedItem, threat?: string, event?: string, overrideData?: { intensity: number, origin: number }): Snippet {
  if (item === '0h') {
    return {
      label: 'Initial Alert — generateNarrative',
      lines: [
        { code: 'generateNarrative :: Scenario -> String' },
        { code: 'generateNarrative sc = case (event sc, threat sc) of' },
        { code: `    ("${event ?? 'Rainfall'}", Red) -> "Critical ${event ?? 'rainfall'} is overwhelming " ++ ...`, hot: true },
        { code: '    ("Cyclone", _)    -> "High-velocity cyclonic winds are actively ..." ' },
        { code: '    _                 -> "Localized " ++ event sc ++ " events observed."' },
      ]
    };
  }

  if (item === '4h') {
    const isOverride = !!overrideData;
    return {
      label: isOverride ? '4h Resilience — healthWithOverride' : '4h Resilience — resilienceCoefficient',
      lines: isOverride ? [
        { code: 'healthWithOverride :: AssetType -> Double -> Int -> Double -> Int -> Double' },
        { code: 'healthWithOverride asset initialI rootT newI t =' },
        { code: '    let r = resilienceCoefficient asset' },
        { code: '        decay = if t <= rootT' },
        { code: '                then r ** (fromIntegral t * initialI / 300.0)' },
        { code: '                else r ** (fromIntegral rootT * initialI / 300.0' },
        { code: `                           + fromIntegral (t - rootT) * ${overrideData.intensity} / 300.0)`, hot: true },
        { code: '    in max 0.0 (100.0 * decay)' },
      ] : [
        { code: 'resilienceCoefficient :: AssetType -> Double' },
        { code: 'resilienceCoefficient Hospital    = 0.98' },
        { code: 'resilienceCoefficient Residential = 0.85' },
        { code: 'resilienceCoefficient TransitHub  = 0.75' },
        { code: 'resilienceCoefficient PowerGrid   = 0.65', hot: true },
        { code: '' },
        { code: '-- Recursive Health Step:' },
        { code: 'Health(t) = Health(t-1) * (R ^ (Intensity / 300))', hot: true },
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
  const isOverride12 = !!overrideData;
  return {
    label: isOverride12 ? '12h Convergence — Override Branching' : '12h Convergence — Trajectory Build',
    lines: isOverride12 ? [
      { code: 'mOverrideTrajectory = case (mOrigin, mIntensity) of' },
      { code: `    (Just oTime, Just ${overrideData.intensity}) -> `, hot: true },
      { code: '        let hO = trajectoryWithOverride Hospital intensityVal oTime oInt' },
      { code: '            pO = trajectoryWithOverride PowerGrid intensityVal oTime oInt' },
      { code: '            ... ' },
      { code: '        in Just (zipWith5 mkPoint [0..12] hO pO tO rO)', hot: true },
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
        if (/^(::|-\>|=|\||where|let|in|do|if|then|else|case|of|map|return)$/.test(tok))
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
  event?: string;
  overrideData?: { intensity: number, origin: number };
  onClose: () => void;
}

export const LogicModal: React.FC<LogicModalProps> = ({ item, threat, event, overrideData, onClose }) => {
  const snippet = getSnippet(item, threat, event, overrideData);

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

          {/* Override Alert Banner */}
          {overrideData && (
            <div className="px-5 py-3 bg-[#1f2937] border-b border-[#30363d] flex items-center gap-3 border-l-4 border-l-amber-500">
              <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-500 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p className="text-[#c9d1d9] text-[13px] leading-relaxed font-medium">
                <strong className="text-white block mb-0.5 mt-0.5">Branching Logic Active:</strong>
                Recalculating future impact from <span className="text-amber-400 font-bold">T+{overrideData.origin}</span> using <span className="text-amber-400 font-bold">{overrideData.intensity}mm</span>.
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
