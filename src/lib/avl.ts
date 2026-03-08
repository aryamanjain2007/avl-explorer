// AVL Tree Engine

export interface AVLNode {
  v: number;
  l: AVLNode | null;
  r: AVLNode | null;
  h: number;
  state: 'normal' | 'new' | 'bad' | 'rotate' | 'ok';
  // Layout positions (set during rendering)
  x?: number;
  y?: number;
}

export interface LogEntry {
  t: 'insert' | 'bad' | 'ok' | 'rotate';
  m: string;
}

export interface InsertResult {
  node: AVLNode;
  rot: 'LL' | 'RR' | 'LR' | 'RL' | 'none';
}

function createNode(v: number): AVLNode {
  return { v, l: null, r: null, h: 1, state: 'normal' };
}

export function ht(n: AVLNode | null): number {
  return n ? n.h : 0;
}

export function bf(n: AVLNode | null): number {
  return n ? ht(n.l) - ht(n.r) : 0;
}

function upH(n: AVLNode | null): void {
  if (n) n.h = 1 + Math.max(ht(n.l), ht(n.r));
}

function rotR(y: AVLNode): AVLNode {
  const x = y.l!;
  const T = x.r;
  x.r = y;
  y.l = T;
  upH(y);
  upH(x);
  return x;
}

function rotL(x: AVLNode): AVLNode {
  const y = x.r!;
  const T = y.l;
  y.l = x;
  x.r = T;
  upH(x);
  upH(y);
  return y;
}

export function avlInsert(root: AVLNode | null, val: number, log: LogEntry[]): InsertResult {
  function ins(node: AVLNode | null, v: number): InsertResult {
    if (!node) {
      const n = createNode(v);
      n.state = 'new';
      return { node: n, rot: 'none' };
    }
    let rot: InsertResult['rot'] = 'none';
    if (v < node.v) {
      const r = ins(node.l, v);
      node.l = r.node;
      if (r.rot !== 'none') rot = r.rot;
    } else if (v > node.v) {
      const r = ins(node.r, v);
      node.r = r.node;
      if (r.rot !== 'none') rot = r.rot;
    } else {
      return { node, rot: 'none' };
    }
    upH(node);
    const b = bf(node);

    if (b > 1 && node.l && v < node.l.v) {
      node.state = 'bad';
      log.push({ t: 'bad', m: `Node ${node.v} unbalanced (BF=+${b}) → LL → Right Rotate` });
      const res = rotR(node);
      res.state = 'ok';
      if (res.l) res.l.state = 'rotate';
      if (res.r) res.r.state = 'rotate';
      return { node: res, rot: 'LL' };
    }
    if (b < -1 && node.r && v > node.r.v) {
      node.state = 'bad';
      log.push({ t: 'bad', m: `Node ${node.v} unbalanced (BF=${b}) → RR → Left Rotate` });
      const res = rotL(node);
      res.state = 'ok';
      if (res.l) res.l.state = 'rotate';
      if (res.r) res.r.state = 'rotate';
      return { node: res, rot: 'RR' };
    }
    if (b > 1 && node.l && v > node.l.v) {
      node.state = 'bad';
      log.push({ t: 'bad', m: `Node ${node.v} unbalanced (BF=+${b}) → LR → Left-Right Rotate` });
      node.l = rotL(node.l);
      if (node.l) node.l.state = 'rotate';
      const res = rotR(node);
      res.state = 'ok';
      return { node: res, rot: 'LR' };
    }
    if (b < -1 && node.r && v < node.r.v) {
      node.state = 'bad';
      log.push({ t: 'bad', m: `Node ${node.v} unbalanced (BF=${b}) → RL → Right-Left Rotate` });
      node.r = rotR(node.r);
      if (node.r) node.r.state = 'rotate';
      const res = rotL(node);
      res.state = 'ok';
      return { node: res, rot: 'RL' };
    }
    return { node, rot };
  }
  return ins(root, val);
}

export function treeHeight(n: AVLNode | null): number {
  return ht(n);
}

export function countNodes(n: AVLNode | null): number {
  return n ? 1 + countNodes(n.l) + countNodes(n.r) : 0;
}

export function resetStates(n: AVLNode | null): void {
  if (!n) return;
  n.state = 'normal';
  resetStates(n.l);
  resetStates(n.r);
}

export function cloneTree(n: AVLNode | null): AVLNode | null {
  if (!n) return null;
  const c = createNode(n.v);
  c.h = n.h;
  c.l = cloneTree(n.l);
  c.r = cloneTree(n.r);
  return c;
}

export function allVals(n: AVLNode | null, a: number[] = []): number[] {
  if (!n) return a;
  a.push(n.v);
  allVals(n.l, a);
  allVals(n.r, a);
  return a;
}

export function findNode(root: AVLNode | null, v: number): AVLNode | null {
  if (!root) return null;
  if (root.v === v) return root;
  return findNode(root.l, v) || findNode(root.r, v);
}

export function seedTree(size: number): AVLNode | null {
  let root: AVLNode | null = null;
  const vals = new Set<number>();
  while (vals.size < size) vals.add(Math.floor(Math.random() * 80) + 5);
  vals.forEach((v) => {
    const r = avlInsert(root, v, []);
    root = r.node;
  });
  resetStates(root);
  return root;
}

// Raw insert without balancing (for quiz rotation questions)
export function rawInsert(n: AVLNode | null, v: number): AVLNode {
  if (!n) {
    const nd = createNode(v);
    nd.state = 'new';
    return nd;
  }
  if (v < n.v) n.l = rawInsert(n.l, v);
  else if (v > n.v) n.r = rawInsert(n.r, v);
  upH(n);
  return n;
}

export function markUnbalanced(n: AVLNode | null): void {
  if (!n) return;
  markUnbalanced(n.l);
  markUnbalanced(n.r);
  if (Math.abs(bf(n)) > 1) n.state = 'bad';
}

export function markNewPurple(n: AVLNode | null, val: number): void {
  if (!n) return;
  if (n.v === val && n.state === 'normal') n.state = 'new';
  markNewPurple(n.l, val);
  markNewPurple(n.r, val);
}

export function shuffle<T>(a: T[]): T[] {
  return [...a].sort(() => Math.random() - 0.5);
}
