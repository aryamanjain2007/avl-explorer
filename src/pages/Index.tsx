import { useState } from "react";
import AVLHeader from "@/components/AVLHeader";
import LearnMode from "@/components/LearnMode";
import PlayMode from "@/components/PlayMode";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"learn" | "play">("learn");
  const [playScore, setPlayScore] = useState(0);

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 gap-5 max-w-[1600px] mx-auto">
      <AVLHeader activeTab={activeTab} onTabChange={setActiveTab} score={playScore} />
      {activeTab === "learn" ? (
        <LearnMode />
      ) : (
        <PlayMode onScoreChange={setPlayScore} />
      )}
      <footer className="text-center text-muted-foreground text-xs py-2">
        © 2024 AVL Visualizer Clay Edition. Designed for educational purposes.
      </footer>
    </div>
  );
};

export default Index;
