interface AVLHeaderProps {
  activeTab: 'learn' | 'play';
  onTabChange: (tab: 'learn' | 'play') => void;
  score?: number;
}

export default function AVLHeader({ activeTab, onTabChange, score }: AVLHeaderProps) {
  return (
    <header className="clay-card flex items-center justify-between px-6 py-3 md:px-8 md:py-4">
      <div className="flex items-center gap-3">
        <div className="clay-button w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold">
          🌳
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-foreground">
            AVL <span className="text-primary">Visualizer</span>
          </h1>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest hidden md:block">
            Balanced BST Explorer
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-1 clay-inset p-1.5 rounded-xl">
        <button
          onClick={() => onTabChange('learn')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'learn'
              ? 'bg-card shadow-sm text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Learn
        </button>
        <button
          onClick={() => onTabChange('play')}
          className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'play'
              ? 'bg-card shadow-sm text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Play
        </button>
      </nav>

      <div className="flex items-center gap-4">
        {activeTab === 'play' && score !== undefined && (
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Score</span>
            <span className="text-lg font-bold text-primary">{score.toLocaleString()}</span>
          </div>
        )}
        <div className="clay-node w-10 h-10 flex items-center justify-center text-muted-foreground text-lg">
          ⚙️
        </div>
      </div>
    </header>
  );
}
