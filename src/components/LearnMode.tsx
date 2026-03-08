import { useState, useRef, useCallback } from "react";
import TreeCanvas from "./TreeCanvas";
import {
  AVLNode, LogEntry, avlInsert, resetStates, treeHeight, countNodes,
  cloneTree, rawInsert, markUnbalanced, markNewPurple,
} from "@/lib/avl";

interface StepLogEntry {
  type: string;
  message: string;
}

interface PendingInsert {
  v: number;
  res: { node: AVLNode; rot: string };
  rn: string | null;
  unbalRoot: AVLNode | null;
  log: LogEntry[];
}

const PRESETS: { label: string; vals: number[] }[] = [
  { label: "LL → Right Rot", vals: [10, 20, 30] },
  { label: "RR → Left Rot", vals: [30, 20, 10] },
  { label: "LR → L+R Rot", vals: [30, 10, 20] },
  { label: "RL → R+L Rot", vals: [10, 30, 20] },
  { label: "Multi-rotate", vals: [5, 3, 7, 1, 4, 6, 8, 2] },
];

const ROT_NAMES: Record<string, string | null> = {
  LL: "Right Rotation (LL)",
  RR: "Left Rotation (RR)",
  LR: "Left-Right Rotation",
  RL: "Right-Left Rotation",
  none: null,
};

const LEGEND = [
  { label: "Normal", cls: "bg-muted-foreground/30 border-muted-foreground/50" },
  { label: "Just inserted", cls: "bg-purple-500 border-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]" },
  { label: "Unbalanced (BF=±2)", cls: "bg-destructive border-destructive shadow-[0_0_6px_rgba(248,113,113,0.6)]" },
  { label: "Being rotated", cls: "bg-warning border-warning shadow-[0_0_6px_rgba(251,191,36,0.6)]" },
  { label: "Just balanced", cls: "bg-success border-success shadow-[0_0_6px_rgba(74,222,128,0.6)]" },
];

export default function LearnMode() {
  const [root, setRoot] = useState<AVLNode | null>(null);
  const [displayRoot, setDisplayRoot] = useState<AVLNode | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Insert a value or pick a preset to begin.");
  const [stepLog, setStepLog] = useState<StepLogEntry[]>([]);
  const [phase, setPhase] = useState(0); // 0=idle, 1=inserted, 2=unbalanced, 3=rotated
  const [nextBtnLabel, setNextBtnLabel] = useState("Next Step →");
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const pendingRef = useRef<PendingInsert | null>(null);
  const presetQueueRef = useRef<number[]>([]);
  const pendingPresetValRef = useRef<number | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoRef = useRef(false);
  const [isAuto, setIsAuto] = useState(false);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((type: string, message: string) => {
    setStepLog((prev) => [{ type, message }, ...prev].slice(0, 25));
  }, []);

  const beginInsert = useCallback((v: number, currentRoot: AVLNode | null) => {
    setBusy(true);

    // Pre-compute the balanced result
    const log: LogEntry[] = [];
    const savedRoot = cloneTree(currentRoot);
    const res = avlInsert(savedRoot, v, log);
    const rn = ROT_NAMES[res.rot] || null;

    // Build unbalanced display tree (raw BST insert, no balancing)
    const unbalRoot = cloneTree(currentRoot);
    const unbalResult = unbalRoot ? rawInsert(unbalRoot, v) : rawInsert(null, v);
    if (rn) markUnbalanced(unbalResult);
    markNewPurple(unbalResult, v);

    const pending: PendingInsert = { v, res, rn, unbalRoot: unbalResult, log };
    pendingRef.current = pending;

    // Phase 1: Show inserted node
    setPhase(1);
    setDisplayRoot(unbalResult);
    addLog("insert", `Inserting ${v} as a new leaf`);
    setStatus(`Step 1: Node ${v} dropped in as a new leaf (purple). Balance factors now need checking.`);
    setNextBtnLabel(rn ? "Check Balance →" : "Confirm Insert →");
    setNextBtnEnabled(true);

    // If auto mode, schedule next phase
    if (isAutoRef.current) {
      phaseTimeoutRef.current = setTimeout(() => runPhase(2, pending, currentRoot), 900);
    }
  }, [addLog]);

  const runPhase = useCallback((nextPhase: number, pending: PendingInsert, currentRoot: AVLNode | null) => {
    const { v, res, rn, unbalRoot, log } = pending;

    if (nextPhase === 2) {
      if (rn) {
        setPhase(2);
        setDisplayRoot(unbalRoot);
        addLog("bad", `BF violation at a node — ${rn} needed`);
        setStatus(`Step 2: ⚠ BF = ±2 detected (red node). Tree is unbalanced — ${rn} required.`);
        setNextBtnLabel("Apply Rotation →");
        setNextBtnEnabled(true);

        if (isAutoRef.current) {
          phaseTimeoutRef.current = setTimeout(() => runPhase(3, pending, currentRoot), 1300);
        }
      } else {
        // No rotation needed, skip to phase 3
        runPhase(3, pending, currentRoot);
      }
    } else if (nextPhase === 3) {
      setPhase(3);
      const newRoot = res.node;
      setRoot(newRoot);
      setDisplayRoot(newRoot);

      log.forEach((e) => addLog(e.t, e.m));
      if (rn) {
        addLog("ok", `✓ ${rn} applied — tree rebalanced`);
        setStatus(`Step 3: ${rn} applied → tree is balanced again ✓`);
      } else {
        addLog("ok", `✓ Tree stays balanced — no rotation needed`);
        setStatus(`Done: Inserted ${v} — tree was already balanced, no rotation needed.`);
      }
      setNextBtnLabel("Next Step →");
      setNextBtnEnabled(false);

      // After a beat, reset highlights and unlock
      setTimeout(() => {
        setRoot((prev) => {
          if (prev) {
            const c = cloneTree(prev);
            if (c) resetStates(c);
            return c;
          }
          return prev;
        });
        setDisplayRoot((prev) => {
          if (prev) {
            const c = cloneTree(prev);
            if (c) resetStates(c);
            return c;
          }
          return prev;
        });
        setPhase(0);
        setBusy(false);
        pendingRef.current = null;

        // Check preset queue
        if (presetQueueRef.current.length > 0) {
          const next = presetQueueRef.current.shift()!;
          if (isAutoRef.current) {
            autoTimerRef.current = setTimeout(() => {
              // Need to get latest root
              setRoot((latestRoot) => {
                beginInsert(next, latestRoot);
                return latestRoot;
              });
            }, 600);
          } else {
            pendingPresetValRef.current = next;
            setNextBtnLabel(`Insert ${next} →`);
            setNextBtnEnabled(true);
          }
        }
      }, 800);
    }
  }, [addLog, beginInsert]);

  const stepNext = useCallback(() => {
    // If there's a primed preset value waiting
    if (phase === 0 && pendingPresetValRef.current !== null) {
      const v = pendingPresetValRef.current;
      pendingPresetValRef.current = null;
      setNextBtnLabel("Next Step →");
      setNextBtnEnabled(false);
      setRoot((currentRoot) => {
        beginInsert(v, currentRoot);
        return currentRoot;
      });
      return;
    }
    // Advance phase
    if (phase >= 1 && phase < 3 && pendingRef.current) {
      setRoot((currentRoot) => {
        runPhase(phase + 1, pendingRef.current!, currentRoot);
        return currentRoot;
      });
    }
  }, [phase, beginInsert, runPhase]);

  const doInsert = () => {
    if (busy && phase > 0) {
      stepNext();
      return;
    }
    if (busy) return;
    const v = parseInt(inputVal);
    if (isNaN(v) || v < 1 || v > 999) {
      setStatus("Please enter a number between 1–999.");
      return;
    }
    setInputVal("");
    beginInsert(v, root);
  };

  const stopAuto = useCallback(() => {
    isAutoRef.current = false;
    setIsAuto(false);
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (phaseTimeoutRef.current) { clearTimeout(phaseTimeoutRef.current); phaseTimeoutRef.current = null; }
  }, []);

  const toggleAuto = useCallback(() => {
    if (isAutoRef.current) {
      stopAuto();
    } else {
      isAutoRef.current = true;
      setIsAuto(true);
      // If mid-insert, fire next phase
      if (phase >= 1 && phase < 3 && pendingRef.current) {
        setRoot((currentRoot) => {
          phaseTimeoutRef.current = setTimeout(() => runPhase(phase + 1, pendingRef.current!, currentRoot), 900);
          return currentRoot;
        });
      }
      // If idle with primed preset value, fire it
      else if (phase === 0 && pendingPresetValRef.current !== null) {
        const v = pendingPresetValRef.current;
        pendingPresetValRef.current = null;
        setNextBtnLabel("Next Step →");
        setNextBtnEnabled(false);
        setRoot((currentRoot) => {
          autoTimerRef.current = setTimeout(() => beginInsert(v, currentRoot), 400);
          return currentRoot;
        });
      }
    }
  }, [phase, stopAuto, runPhase, beginInsert]);

  const handleReset = useCallback(() => {
    stopAuto();
    if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    setRoot(null);
    setDisplayRoot(null);
    setBusy(false);
    setPhase(0);
    setStepLog([]);
    setStatus("Insert a value or pick a preset to begin.");
    setNextBtnLabel("Next Step →");
    setNextBtnEnabled(false);
    pendingRef.current = null;
    presetQueueRef.current = [];
    pendingPresetValRef.current = null;
  }, [stopAuto]);

  const runPreset = useCallback((vals: number[]) => {
    stopAuto();
    handleReset();
    if (!vals.length) return;
    const [first, ...rest] = vals;
    presetQueueRef.current = rest;
    pendingPresetValRef.current = first;
    setNextBtnLabel(`Insert ${first} →`);
    setNextBtnEnabled(true);
    setStatus(`Preset loaded — ${vals.length} insertions queued. Click Next Step to begin, or Auto to run it all.`);
  }, [stopAuto, handleReset]);

  const h = treeHeight(root);
  const n = countNodes(root);

  const logTypeColor: Record<string, string> = {
    insert: "border-purple-500 text-purple-300",
    bad: "border-destructive text-destructive",
    rotate: "border-warning text-warning",
    ok: "border-success text-success",
  };

  const pillClass = (idx: number) => {
    const base = "px-3 py-1 rounded-[20px] text-[10px] tracking-wider uppercase font-bold font-mono border transition-all duration-300";
    if (idx < phase) return `${base} border-border/50 text-muted-foreground/30 line-through`;
    if (idx === phase) return `${base} border-primary text-primary bg-primary/10`;
    return `${base} border-border text-muted-foreground`;
  };

  // Use displayRoot for rendering (shows intermediate states), fall back to root
  const canvasRoot = displayRoot ?? root;

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main canvas */}
      <div className="lg:col-span-9 flex flex-col gap-5 order-1 lg:order-2">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 items-center">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full border-2 ${item.cls}`} />
              <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="clay-card flex-1 relative overflow-hidden min-h-[420px] flex items-center justify-center bg-card/50">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)",
              backgroundSize: "24px 24px",
            }}
          />
          <TreeCanvas root={canvasRoot} width={700} height={420} />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
        {/* Insert */}
        <div className="clay-card p-5">
          <p className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-3">Insert a Value</p>
          <div className="flex gap-2">
            <input
              type="number"
              className="clay-inset border-none flex-1 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
              placeholder="e.g. 42"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doInsert()}
              min={1}
              max={999}
              disabled={busy && phase === 0}
            />
            <button
              onClick={doInsert}
              disabled={busy && phase === 0}
              className="clay-button px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50 whitespace-nowrap"
            >
              Insert
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[10px] text-muted-foreground self-center">Presets:</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => runPreset(p.vals)}
                disabled={busy}
                className="clay-inset px-3 py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* What's Happening */}
        <div className="clay-card p-5">
          <p className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-3">What's Happening</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            <span className={pillClass(1)}>1 · Insert</span>
            <span className={pillClass(2)}>2 · Check BF</span>
            <span className={pillClass(3)}>3 · Rotate</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed min-h-[42px] font-mono">{status}</p>
        </div>

        {/* Tree Stats */}
        <div className="clay-card p-5">
          <p className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-3">Tree Stats</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="clay-inset p-3 rounded-xl text-center">
              <p className="text-lg font-bold text-primary">{h || "—"}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Height</p>
            </div>
            <div className="clay-inset p-3 rounded-xl text-center">
              <p className="text-lg font-bold text-primary">{n}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Nodes</p>
            </div>
          </div>
        </div>

        {/* Step Log */}
        <div className="clay-card p-5 flex-1 flex flex-col min-h-[140px]">
          <p className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-3">Step Log</p>
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[160px]">
            {stepLog.length === 0 && (
              <p className="text-xs text-muted-foreground">No operations yet.</p>
            )}
            {stepLog.map((entry, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded text-[11px] leading-relaxed border-l-[3px] bg-muted/30 animate-slide-in ${logTypeColor[entry.type] || "border-muted-foreground text-muted-foreground"}`}
              >
                {entry.message}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="clay-card p-5">
          <p className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-3">Controls</p>
          <div className="flex gap-2">
            <button
              onClick={stepNext}
              disabled={!nextBtnEnabled}
              className="clay-button flex-[2] py-3 rounded-xl font-bold text-sm disabled:opacity-30"
            >
              {nextBtnLabel}
            </button>
            <button
              onClick={toggleAuto}
              className={`flex-1 py-3 rounded-xl font-bold text-sm border transition-colors ${
                isAuto
                  ? "border-destructive text-destructive hover:bg-destructive/10"
                  : "border-primary text-primary hover:bg-primary/10"
              }`}
            >
              {isAuto ? "Pause" : "Auto"}
            </button>
          </div>
          <button
            onClick={handleReset}
            className="w-full mt-2 clay-inset py-3 rounded-xl text-sm font-bold text-muted-foreground hover:text-destructive transition-colors"
          >
            ↺ Reset Tree
          </button>
        </div>
      </aside>
    </div>
  );
}
