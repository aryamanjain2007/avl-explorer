import { useRef, useEffect, useCallback } from "react";
import { AVLNode, ht, bf } from "@/lib/avl";

interface TreeCanvasProps {
  root: AVLNode | null;
  width?: number;
  height?: number;
}

const NR = 22;

const NODE_COLORS: Record<string, { fill: string; stroke: string; glow: string | null; text: string }> = {
  normal: { fill: "#ffffff", stroke: "#cbd5e1", glow: null, text: "#334155" },
  new: { fill: "#ede9fe", stroke: "#8b5cf6", glow: "rgba(139,92,246,0.4)", text: "#6d28d9" },
  bad: { fill: "#fee2e2", stroke: "#f87171", glow: "rgba(248,113,113,0.4)", text: "#dc2626" },
  rotate: { fill: "#fef3c7", stroke: "#f59e0b", glow: "rgba(245,158,11,0.35)", text: "#b45309" },
  ok: { fill: "#dcfce7", stroke: "#4ade80", glow: "rgba(74,222,128,0.4)", text: "#16a34a" },
};

function layout(root: AVLNode, W: number, H: number) {
  const depth = ht(root);
  const levelH = Math.min(88, (H - 60) / Math.max(depth, 1));
  function pos(node: AVLNode | null, lo: number, hi: number, lv: number) {
    if (!node) return;
    node.x = (lo + hi) / 2;
    node.y = 50 + lv * levelH;
    pos(node.l, lo, (lo + hi) / 2, lv + 1);
    pos(node.r, (lo + hi) / 2, hi, lv + 1);
  }
  pos(root, 0, W, 0);
}

function drawTree(ctx: CanvasRenderingContext2D, root: AVLNode | null, W: number, H: number) {
  ctx.clearRect(0, 0, W, H);
  if (!root) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Insert a value to begin →", W / 2, H / 2);
    return;
  }
  layout(root, W, H);

  // Draw edges
  function edges(n: AVLNode | null) {
    if (!n) return;
    const drawLine = (a: AVLNode, b: AVLNode) => {
      ctx.beginPath();
      ctx.moveTo(a.x!, a.y!);
      ctx.lineTo(b.x!, b.y!);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.stroke();
    };
    if (n.l) { drawLine(n, n.l); edges(n.l); }
    if (n.r) { drawLine(n, n.r); edges(n.r); }
  }
  edges(root);

  // Draw nodes
  function nodes(n: AVLNode | null) {
    if (!n) return;
    nodes(n.l);
    nodes(n.r);
    const st = NODE_COLORS[n.state] || NODE_COLORS.normal;

    // Glow
    if (st.glow) {
      ctx.shadowColor = st.glow;
      ctx.shadowBlur = 16;
    }

    // Node circle with clay effect
    ctx.beginPath();
    ctx.arc(n.x!, n.y!, NR, 0, Math.PI * 2);
    ctx.fillStyle = st.fill;
    ctx.fill();
    ctx.strokeStyle = st.stroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner highlight for clay effect
    ctx.beginPath();
    ctx.arc(n.x! - 4, n.y! - 4, NR * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();

    // Value text
    ctx.fillStyle = st.text;
    ctx.font = `bold ${n.v >= 100 ? "11" : "14"}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n.v), n.x!, n.y!);

    // BF badge
    const b = bf(n);
    const isUnbalanced = Math.abs(b) > 1;
    const badgeColor = isUnbalanced ? "#fee2e2" : "#e0f2fe";
    const badgeTextColor = isUnbalanced ? "#dc2626" : "#0284c7";
    const badgeRadius = 9;
    const bx = n.x! + NR - 2;
    const by = n.y! - NR + 2;

    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = badgeColor;
    ctx.fill();
    ctx.strokeStyle = isUnbalanced ? "#fca5a5" : "#7dd3fc";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = badgeTextColor;
    ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${b >= 0 ? "+" : ""}${b}`, bx, by + 1);
  }
  nodes(root);
}

export default function TreeCanvas({ root, width = 700, height = 430 }: TreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    drawTree(ctx, root, width, height);
  }, [root, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ width, height }}
    />
  );
}
