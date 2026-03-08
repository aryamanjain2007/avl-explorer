import { useState, useRef, useCallback, useEffect } from "react";
import TreeCanvas from "./TreeCanvas";
import {
  AVLNode,
  LogEntry,
  avlInsert,
  resetStates,
  cloneTree,
  allVals,
  findNode,
  seedTree,
  rawInsert,
  shuffle,
  bf,
  treeHeight,
} from "@/lib/avl";

interface PlayModeProps {
  onScoreChange: (score: number) => void;
}

const DIFFS = [
  { name: "Easy", time: 18, bonus: 100, penalty: 0 },
  { name: "Medium", time: 12, bonus: 160, penalty: 50 },
  { name: "Hard", time: 8, bonus: 220, penalty: 100 },
];

const DIFF_ICONS = ["🌿", "⚡", "🔥"];

interface ScoreLogEntry {
  msg: string;
  type: "correct" | "wrong";
}

export default function PlayMode({ onScoreChange }: PlayModeProps) {
  const [diffIdx, setDiffIdx] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [root, setRoot] = useState<AVLNode | null>(null);
  const [displayRoot, setDisplayRoot] = useState<AVLNode | null>(null);
  const [answered, setAnswered] = useState(false);
  const [question, setQuestion] = useState("Get ready…");
  const [choices, setChoices] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [choiceStates, setChoiceStates] = useState<Record<number, "correct" | "wrong">>({});
  const [scoreLog, setScoreLog] = useState<ScoreLogEntry[]>([]);
  const [timerPct, setTimerPct] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<{ text: string; color: string } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const timeLeftRef = useRef(0);
  const answeredRef = useRef(false);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const roundRef = useRef(1);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const rootRef = useRef<AVLNode | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const showFlash = useCallback((text: string, color: string) => {
    setFlash({ text, color });
    setTimeout(() => setFlash(null), 900);
  }, []);

  const addScoreLog = useCallback((msg: string, type: "correct" | "wrong") => {
    setScoreLog((prev) => [{ msg, type }, ...prev].slice(0, 20));
  }, []);

  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    scoreRef.current = newScore;
    onScoreChange(newScore);
  }, [onScoreChange]);

  const endGame = useCallback(() => {
    stopTimer();
    setGameOver(true);
  }, [stopTimer]);

  const pickChallenge = useCallback((currentRoot: AVLNode | null, currentRound: number) => {
    const challenges = [chBF, chRotation, chHeight, chIsBalanced, chNewRoot];
    challenges[currentRound % challenges.length](currentRoot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = useCallback((diffIndex: number) => {
    const total = DIFFS[diffIndex].time;
    timeLeftRef.current = total;
    setTimerPct(100);
    stopTimer();

    timerRef.current = setInterval(() => {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 0.1);
      const p = (timeLeftRef.current / total) * 100;
      setTimerPct(p);

      if (timeLeftRef.current <= 0) {
        stopTimer();
        // Time up
        if (answeredRef.current) return;
        answeredRef.current = true;
        setAnswered(true);
        showFlash("⏱", "#f59e0b");
        livesRef.current--;
        setLives(livesRef.current);
        streakRef.current = 0;
        setStreak(0);
        wrongRef.current++;
        setWrong(wrongRef.current);
        addScoreLog("⏱ Time's up!", "wrong");

        if (livesRef.current <= 0) {
          setTimeout(() => endGame(), 1000);
          return;
        }
        setTimeout(() => {
          const nv = Math.floor(Math.random() * 90) + 5;
          const r = avlInsert(rootRef.current, nv, []);
          rootRef.current = r.node;
          resetStates(rootRef.current);
          setRoot(JSON.parse(JSON.stringify(rootRef.current)));
          roundRef.current++;
          setRound(roundRef.current);
          answeredRef.current = false;
          setAnswered(false);
          setChoiceStates({});
          pickChallenge(rootRef.current, roundRef.current);
          startTimer(diffIndex);
        }, 1000);
      }
    }, 100);
  }, [stopTimer, showFlash, addScoreLog, endGame, pickChallenge]);

  const handleAnswer = useCallback((chosenIdx: number, chosen: string) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);
    stopTimer();

    const diff = DIFFS[diffIdx];
    const ok = chosen === correctAnswer;
    const newStates: Record<number, "correct" | "wrong"> = {};

    if (ok) {
      newStates[chosenIdx] = "correct";
      const pts = diff.bonus + Math.round(timeLeftRef.current * 12);
      const sb = streakRef.current >= 2 ? streakRef.current * 25 : 0;
      const newScore = scoreRef.current + pts + sb;
      updateScore(newScore);
      streakRef.current++;
      setStreak(streakRef.current);
      correctRef.current++;
      setCorrect(correctRef.current);
      showFlash("✓", "#22c55e");
      addScoreLog(`✓ R${roundRef.current}: +${pts}${sb ? " +" + sb + "🔥" : ""}`, "correct");
    } else {
      newStates[chosenIdx] = "wrong";
      choices.forEach((c, i) => { if (c === correctAnswer) newStates[i] = "correct"; });
      showFlash("✗", "#ef4444");
      livesRef.current--;
      setLives(livesRef.current);
      streakRef.current = 0;
      setStreak(0);
      wrongRef.current++;
      setWrong(wrongRef.current);
      if (diff.penalty) {
        const newScore = Math.max(0, scoreRef.current - diff.penalty);
        updateScore(newScore);
      }
      addScoreLog(`✗ R${roundRef.current}: answer was "${correctAnswer}"`, "wrong");
    }
    setChoiceStates(newStates);

    if (livesRef.current <= 0) {
      setTimeout(() => endGame(), 1300);
      return;
    }

    setTimeout(() => {
      const nv = Math.floor(Math.random() * 90) + 5;
      const r = avlInsert(rootRef.current, nv, []);
      rootRef.current = r.node;
      resetStates(rootRef.current);
      setRoot(JSON.parse(JSON.stringify(rootRef.current)));
      roundRef.current++;
      setRound(roundRef.current);
      answeredRef.current = false;
      setAnswered(false);
      setChoiceStates({});
      pickChallenge(rootRef.current, roundRef.current);
      startTimer(diffIdx);
    }, 1200);
  }, [diffIdx, correctAnswer, choices, stopTimer, showFlash, addScoreLog, updateScore, endGame, pickChallenge, startTimer]);

  // Challenge generators
  function chBF(currentRoot: AVLNode | null) {
    if (!currentRoot) { chHeight(currentRoot); return; }
    const vals = allVals(currentRoot);
    if (vals.length < 2) { chHeight(currentRoot); return; }
    const target = findNode(currentRoot, vals[Math.floor(Math.random() * vals.length)])!;
    const b = bf(target);
    const correctStr = `${b >= 0 ? "+" : ""}${b}`;
    const pool = ["-2", "-1", "+0", "+1", "+2"].filter((x) => x !== correctStr);
    const opts = shuffle([correctStr, ...shuffle(pool).slice(0, 3)]);

    setQuestion(`What is the balance factor of node ${target.v}?`);
    const highlighted = JSON.parse(JSON.stringify(currentRoot));
    resetStates(highlighted);
    const hl = findNode(highlighted, target.v);
    if (hl) hl.state = "new";
    setDisplayRoot(highlighted);
    setChoices(opts);
    setCorrectAnswer(correctStr);
  }

  function chRotation(_currentRoot: AVLNode | null) {
    const cases = [
      { vals: [10, 20, 30], correct: "Left Rotate (RR)", desc: "10→20→30 right-right heavy" },
      { vals: [30, 20, 10], correct: "Right Rotate (LL)", desc: "30→20→10 left-left heavy" },
      { vals: [30, 10, 20], correct: "Left-Right Rotate", desc: "30→10→20 left-right case" },
      { vals: [10, 30, 20], correct: "Right-Left Rotate", desc: "10→30→20 right-left case" },
    ];
    const c = cases[Math.floor(Math.random() * cases.length)];
    let tmp: AVLNode | null = null;
    c.vals.forEach((v) => { tmp = rawInsert(tmp, v); });

    function markBad(n: AVLNode | null) {
      if (!n) return;
      if (Math.abs(bf(n)) > 1) n.state = "bad";
      markBad(n.l);
      markBad(n.r);
    }
    markBad(tmp);

    const allRots = ["Left Rotate (RR)", "Right Rotate (LL)", "Left-Right Rotate", "Right-Left Rotate"];
    const opts = shuffle([c.correct, ...shuffle(allRots.filter((r) => r !== c.correct)).slice(0, 3)]);

    setQuestion(`Tree is unbalanced. Which rotation fixes it? (${c.desc})`);
    setDisplayRoot(tmp);
    setChoices(opts);
    setCorrectAnswer(c.correct);
  }

  function chHeight(currentRoot: AVLNode | null) {
    const h = treeHeight(currentRoot);
    const correctStr = String(h);
    const pool = [h - 1, h + 1, h + 2, h - 2].filter((x) => x >= 0 && x !== h).map(String);
    const opts = shuffle([correctStr, ...shuffle(pool).slice(0, 3)]);

    setQuestion("What is the height of this AVL tree?");
    if (currentRoot) {
      const hl = JSON.parse(JSON.stringify(currentRoot));
      resetStates(hl);
      setDisplayRoot(hl);
    }
    setChoices(opts);
    setCorrectAnswer(correctStr);
  }

  function chIsBalanced(currentRoot: AVLNode | null) {
    if (!currentRoot) { chHeight(currentRoot); return; }
    const vals = allVals(currentRoot);
    const target = findNode(currentRoot, vals[Math.floor(Math.random() * vals.length)])!;
    const correctStr = Math.abs(bf(target)) <= 1 ? "Balanced ✓" : "Unbalanced ✗";
    const opts = shuffle(["Balanced ✓", "Unbalanced ✗"]);

    setQuestion(`Is node ${target.v} balanced or not? (|BF| ≤ 1 = balanced)`);
    const highlighted = JSON.parse(JSON.stringify(currentRoot));
    resetStates(highlighted);
    const hl = findNode(highlighted, target.v);
    if (hl) hl.state = "new";
    setDisplayRoot(highlighted);
    setChoices(opts);
    setCorrectAnswer(correctStr);
  }

  function chNewRoot(currentRoot: AVLNode | null) {
    if (!currentRoot) { chHeight(currentRoot); return; }
    const insertV = Math.floor(Math.random() * 80) + 10;
    const sim = cloneTree(currentRoot);
    const res = avlInsert(sim, insertV, []);
    const correctStr = String(res.node ? res.node.v : "?");
    const pool = allVals(currentRoot).map(String).filter((v) => v !== correctStr);
    if (pool.length < 3) { chBF(currentRoot); return; }
    const opts = shuffle([correctStr, ...shuffle(pool).slice(0, 3)]);

    setQuestion(`After inserting ${insertV}, what will the root be?`);
    const hl = JSON.parse(JSON.stringify(currentRoot));
    resetStates(hl);
    setDisplayRoot(hl);
    setChoices(opts);
    setCorrectAnswer(correctStr);
  }

  const startGame = useCallback((di?: number) => {
    const d = di ?? diffIdx;
    stopTimer();
    setGameOver(false);
    const newScore = 0;
    updateScore(newScore);
    livesRef.current = 3;
    setLives(3);
    streakRef.current = 0;
    setStreak(0);
    roundRef.current = 1;
    setRound(1);
    correctRef.current = 0;
    setCorrect(0);
    wrongRef.current = 0;
    setWrong(0);
    answeredRef.current = false;
    setAnswered(false);
    setChoiceStates({});
    setScoreLog([]);
    setTimerPct(100);

    const tree = seedTree(6);
    rootRef.current = tree;
    setRoot(tree ? JSON.parse(JSON.stringify(tree)) : null);
    resetStates(rootRef.current);

    // Delay to let state settle
    setTimeout(() => {
      pickChallenge(rootRef.current, 1);
      startTimer(d);
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffIdx, stopTimer, updateScore, pickChallenge, startTimer]);

  useEffect(() => {
    startGame();
    return () => stopTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalQ = correct + wrong;
  const accuracy = totalQ ? Math.round((correct / totalQ) * 100) : 0;
  const grade = score >= 2500 ? "AVL MASTER 🏆" : score >= 1500 ? "Solid understanding ⭐" : score >= 700 ? "Getting there 📈" : "Keep practicing 💡";

  return (
    <div className="flex-1 flex flex-col gap-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Score", value: score.toLocaleString(), icon: "⭐", bg: "bg-yellow-100" },
          { label: "Round", value: String(round).padStart(2, "0"), icon: "💎", bg: "bg-blue-100" },
          { label: "Lives", value: "❤️".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, 3 - lives)), icon: "❤️", bg: "bg-red-100" },
          { label: "Streak", value: `x${streak}`, icon: "🔥", bg: "bg-orange-100" },
        ].map((s) => (
          <div key={s.label} className="clay-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-lg`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
              <p className="text-lg font-extrabold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sidebar */}
        <aside className="lg:col-span-3 flex flex-col gap-5 order-2 lg:order-1">
          {/* Difficulty */}
          <div className="clay-card p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Difficulty</h3>
            <div className="flex flex-col gap-2">
              {DIFFS.map((d, i) => (
                <button
                  key={d.name}
                  onClick={() => { setDiffIdx(i); startGame(i); }}
                  className={`clay-inset p-3 rounded-lg flex items-center gap-3 text-sm font-bold transition-all ${
                    diffIdx === i
                      ? "clay-button !rounded-lg"
                      : "text-foreground hover:text-primary"
                  }`}
                >
                  <span>{DIFF_ICONS[i]}</span>
                  <span>{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div className="clay-card p-5 flex-1 flex flex-col">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Current Question</h3>
            <div className="clay-inset p-4 rounded-lg mb-4">
              <p className="text-sm font-medium leading-relaxed text-foreground">{question}</p>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              {choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i, c)}
                  disabled={answered}
                  className={`clay-card p-3 rounded-lg text-sm font-bold text-left transition-all disabled:cursor-not-allowed ${
                    choiceStates[i] === "correct"
                      ? "!bg-green-50 ring-2 ring-success text-success"
                      : choiceStates[i] === "wrong"
                      ? "!bg-red-50 ring-2 ring-destructive text-destructive"
                      : "hover:shadow-md text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Score Log */}
          <div className="clay-card p-5 max-h-48 flex flex-col">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Score Log</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {scoreLog.map((entry, i) => (
                <div key={i} className={`text-xs font-bold ${entry.type === "correct" ? "text-success" : "text-destructive"}`}>
                  {entry.msg}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => startGame()} className="clay-button w-full py-3 font-bold text-sm flex items-center justify-center gap-2">
            ↺ New Game
          </button>
        </aside>

        {/* Canvas */}
        <div className="lg:col-span-9 flex flex-col gap-4 order-1 lg:order-2">
          <div className="clay-card flex-1 relative overflow-hidden min-h-[400px] flex flex-col">
            {/* Timer bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-muted z-10">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${timerPct}%`,
                  backgroundColor: timerPct < 30 ? "#ef4444" : timerPct < 55 ? "#f59e0b" : "hsl(var(--primary))",
                }}
              />
            </div>

            {/* Timer display */}
            <div className="absolute top-4 right-4 clay-card px-3 py-1 rounded-full z-10">
              <span className="text-xs font-bold text-foreground">
                {Math.ceil(timeLeftRef.current > 0 ? timeLeftRef.current : 0)}s
              </span>
            </div>

            {/* Flash */}
            {flash && (
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black z-20 pointer-events-none animate-flash-out"
                style={{ color: flash.color, textShadow: `0 0 20px ${flash.color}` }}
              >
                {flash.text}
              </div>
            )}

            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="flex-1 flex items-center justify-center">
              <TreeCanvas root={displayRoot} width={650} height={380} />
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-foreground/80 z-50 flex items-center justify-center">
          <div className="clay-card p-8 max-w-md w-[90%] text-center">
            <h2 className="text-2xl font-extrabold text-primary mb-2">Game Over!</h2>
            <p className="text-5xl font-black text-primary my-4">{score.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mb-4">{grade}</p>
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Accuracy</span><span className="font-bold text-primary">{accuracy}%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Correct</span><span className="font-bold text-success">{correct}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Wrong</span><span className="font-bold text-destructive">{wrong}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Rounds</span><span className="font-bold text-foreground">{round}</span>
              </div>
            </div>
            <button
              onClick={() => startGame()}
              className="clay-button w-full py-3 mt-6 font-bold text-sm"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
