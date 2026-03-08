import { useState, useRef, useCallback } from "react";
import TreeCanvas from "./TreeCanvas";
import { AVLNode, LogEntry, avlInsert, resetStates, treeHeight, countNodes } from "@/lib/avl";

interface StepLogEntry {
  type: string;
  message: string;
}

const PRESETS: { label: string; vals: number[] }[] = [
  { label: "LL case", vals: [30, 20, 10] },
  { label: "RR case", vals: [10, 20, 30] },
  { label: "LR case", vals: [30, 10, 20] },
  { label: "RL case", vals: [10, 30, 20] },
  { label: "Full tree", vals: [50, 30, 70, 20, 40, 60, 80, 10, 25] },
];

const ROT_NAMES: Record<string, string | null> = {
  LL: "Right Rotation (LL)",
  RR: "Left Rotation (RR)",
  LR: "Left-Right Rotation",
  RL: "Right-Left Rotation",
  none: null,
};

export default function LearnMode() {
  const [root, setRoot] = useState<AVLNode | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Insert a value to see AVL in action.");
  const [stepLog, setStepLog] = useState<StepLogEntry[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const animateInsert = useCallback((v: number, currentRoot: AVLNode | null) => {
    setBusy(true);
    const log: LogEntry[] = [];
    log.push({ t: "insert", m: `Inserting ${v} into AVL tree` });

    const cloned = currentRoot ? JSON.parse(JSON.stringify(currentRoot)) as AVLNode : null;
    resetStates(cloned);
    const res = avlInsert(cloned, v, log);
    const rn = ROT_NAMES[res.rot];

    if (rn) {
      log.push({ t: "ok", m: `✓ ${rn} applied — tree rebalanced` });
      setStatus(`Inserted ${v} — ${rn} applied to restore balance.`);
    } else {
      log.push({ t: "ok", m: `✓ Tree stays balanced after inserting ${v}` });
      setStatus(`Inserted ${v} — tree is already balanced, no rotation needed.`);
    }

    const newEntries = log.reverse().map((e) => ({ type: e.t, message: e.m }));
    setStepLog((prev) => [...newEntries, ...prev].slice(0, 25));
    setRoot(res.node);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setRoot((prev) => {
        if (prev) {
          const c = JSON.parse(JSON.stringify(prev)) as AVLNode;
          resetStates(c);
          return c;
        }
        return prev;
      });
      setBusy(false);
    }, 1800);

    return res.node;
  }, []);

  const doInsert = () => {
    if (busy) return;
    const v = parseInt(inputVal);
    if (isNaN(v) || v < 1 || v > 999) {
      setStatus("Please enter a number between 1–999.");
      return;
    }
    setInputVal("");
    animateInsert(v, root);
  };

  const runPreset = async (vals: number[]) => {
    handleReset();
    let currentRoot: AVLNode | null = null;
    for (const v of vals) {
      await new Promise((r) => setTimeout(r, 500));
      currentRoot = animateInsert(v, currentRoot);
      await new Promise((r) => setTimeout(r, 1500));
    }
  };

  const handleReset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRoot(null);
    setBusy(false);
    setStepLog([]);
    setStatus("Insert a value to see AVL in action.");
  };

  const h = treeHeight(root);
  const n = countNodes(root);
  const isBalanced = root !== null;

  const logTypeColor: Record<string, string> = {
    insert: "bg-purple-400",
    bad: "bg-destructive",
    rotate: "bg-warning",
    ok: "bg-success",
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="lg:col-span-3 flex flex-col gap-5 order-2 lg:order-1">
        {/* Insert */}
        <div className="clay-card p-5">
          <div className="flex items-center gap-2 mb-3 text-foreground">
            <span className="text-primary">➕</span>
            <h2 className="font-bold text-sm">Insert Node</h2>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="number"
              className="clay-inset border-none rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
              placeholder="Enter value (1-999)"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doInsert()}
              min={1}
              max={999}
              disabled={busy}
            />
            <button
              onClick={doInsert}
              disabled={busy}
              className="clay-button w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              Add to Tree
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
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

        {/* Stats */}
        <div className="clay-card p-5">
          <div className="flex items-center gap-2 mb-3 text-foreground">
            <span className="text-primary">📊</span>
            <h2 className="font-bold text-sm">Tree Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="clay-inset p-3 rounded-xl text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Height</p>
              <p className="text-lg font-bold text-foreground">{h || "—"}</p>
            </div>
            <div className="clay-inset p-3 rounded-xl text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Nodes</p>
              <p className="text-lg font-bold text-foreground">{n}</p>
            </div>
            <div className="clay-inset p-3 rounded-xl text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Balance</p>
              <p className={`text-lg font-bold ${isBalanced ? "text-success" : "text-destructive"}`}>
                {n === 0 ? "—" : "True"}
              </p>
            </div>
            <div className="clay-inset p-3 rounded-xl text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Type</p>
              <p className="text-lg font-bold text-foreground">AVL</p>
            </div>
          </div>
        </div>

        {/* Step Log */}
        <div className="clay-card p-5 flex-1 flex flex-col min-h-[200px]">
          <div className="flex items-center gap-2 mb-3 text-foreground">
            <span className="text-primary">🕐</span>
            <h2 className="font-bold text-sm">Step Log</h2>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[250px]">
            {stepLog.length === 0 && (
              <p className="text-xs text-muted-foreground">No operations yet.</p>
            )}
            {stepLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 p-2 clay-inset rounded-lg animate-slide-in">
                <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${logTypeColor[entry.type] || "bg-muted-foreground"}`} />
                <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.message}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleReset}
          className="clay-card py-3 px-4 text-sm font-bold text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center gap-2"
        >
          ↺ Reset Tree
        </button>
      </aside>

      {/* Main canvas */}
      <div className="lg:col-span-9 flex flex-col gap-5 order-1 lg:order-2">
        {/* Status */}
        <div className="clay-card px-5 py-3 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">
            ℹ️
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Status</p>
            <p className="text-sm font-semibold text-foreground">{status}</p>
          </div>
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
          <TreeCanvas root={root} width={700} height={420} />
          {/* Legend */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <div className="clay-card px-3 py-1.5 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Critical BF</span>
            </div>
            <div className="clay-card px-3 py-1.5 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary/40" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Stable BF</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={handleReset} className="clay-card px-5 py-3 flex items-center gap-2 font-bold text-sm text-muted-foreground hover:text-primary transition-colors">
            ↺ Reset Tree
          </button>
          <button
            onClick={() => {
              handleReset();
              const vals: number[] = [];
              const set = new Set<number>();
              while (set.size < 7) set.add(Math.floor(Math.random() * 90) + 5);
              set.forEach((v) => vals.push(v));
              runPreset(vals);
            }}
            disabled={busy}
            className="clay-card px-5 py-3 flex items-center gap-2 font-bold text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            🔀 Randomize
          </button>
        </div>
      </div>
    </div>
  );
}
