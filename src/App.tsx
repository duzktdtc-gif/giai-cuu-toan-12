import { useState } from "react";
import type { Avatar } from "./game/levels";
import { startNewRun } from "./game/session";
import type { StudentProfile } from "./lib/models";
import {
  displayClass,
  displayName,
  identitySeed,
  normalizeClass,
  normalizeName,
  stableUuid,
} from "./lib/normalize";
import { loadProfile, saveProfile } from "./lib/storage";
import { bootstrapStudent } from "./lib/sync";
import { MenuScreen } from "./screens/MenuScreen";
import { StoryScreen } from "./screens/StoryScreen";
import { GameScreen } from "./screens/GameScreen";
import { GameOverScreen, VictoryScreen } from "./screens/EndScreens";
import { TeacherScreen } from "./screens/TeacherScreen";

type Screen = "menu" | "story" | "game" | "gameover" | "victory" | "teacher";

interface StartValues {
  name: string;
  className: string;
  avatar: Avatar;
  restart: boolean;
}

interface GameOverState {
  lostLevel: number;
  cleared: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<GameOverState>({ lostLevel: 1, cleared: 0 });

  async function handleStart(values: StartValues) {
    setBusy(true);
    setError(null);
    try {
      const readable = displayName(values.name);
      const className = displayClass(values.className);
      const id = await stableUuid(identitySeed(readable, className));
      const now = new Date().toISOString();
      const existing = loadProfile(id);
      let base: StudentProfile = existing
        ? {
            ...existing,
            name: readable,
            className,
            avatar: values.avatar,
          }
        : {
            id,
            name: readable,
            nameNormalized: "",
            className,
            classNormalized: "",
            avatar: values.avatar,
            maxLevel: 0,
            totalWrong: 0,
            sessionsCount: 0,
            createdAt: now,
            lastPlayed: now,
          };
      base = {
        ...base,
        name: readable,
        nameNormalized: normalizeName(readable),
        className,
        classNormalized: normalizeClass(className),
      };

      if (!values.restart) {
        const serverMax = await Promise.race([
          bootstrapStudent(base),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500)),
        ]);
        if (serverMax !== null && serverMax > base.maxLevel) base = { ...base, maxLevel: serverMax };
      }

      saveProfile(base);

      if (!values.restart && base.activeRun && base.activeRun.lives > 0) {
        setProfile(base);
        setScreen("game");
        return;
      }

      let startLevel = 1;
      if (!values.restart && base.maxLevel > 0 && base.maxLevel < 7) startLevel = base.maxLevel + 1;
      const next = startNewRun(base, startLevel);
      setProfile(next);
      if (!values.restart && startLevel > 1) {
        setScreen("game");
      } else {
        setScreen("story");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không bắt đầu được. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  function handleQuit(next: StudentProfile) {
    setProfile(next);
    setScreen("menu");
  }

  function handleGameOver(next: StudentProfile, lostLevel: number, cleared: number) {
    setProfile(next);
    setGameOver({ lostLevel, cleared });
    setScreen("gameover");
  }

  function handleVictory(next: StudentProfile) {
    setProfile(next);
    setScreen("victory");
  }

  function replay(lostLevel: number, showStory: boolean) {
    if (!profile) return;
    const next = startNewRun(profile, lostLevel);
    setProfile(next);
    setScreen(showStory ? "story" : "game");
  }

  if (screen === "teacher") {
    return <TeacherScreen onBack={() => setScreen("menu")} />;
  }

  if (screen === "story" && profile) {
    const startLevel = profile.activeRun?.level ?? 1;
    return <StoryScreen avatar={profile.avatar} startLevel={startLevel} onDone={() => setScreen("game")} />;
  }

  if (screen === "game" && profile?.activeRun) {
    return (
      <GameScreen
        initialProfile={profile}
        onQuit={handleQuit}
        onVictory={handleVictory}
        onGameOver={handleGameOver}
      />
    );
  }

  if (screen === "gameover" && profile) {
    return (
      <GameOverScreen
        profile={profile}
        lostLevel={gameOver.lostLevel}
        cleared={gameOver.cleared}
        onReplay={() => replay(gameOver.lostLevel, false)}
        onMenu={() => setScreen("menu")}
      />
    );
  }

  if (screen === "victory" && profile) {
    return (
      <VictoryScreen
        profile={profile}
        onReplay={() => replay(1, true)}
        onMenu={() => setScreen("menu")}
      />
    );
  }

  return <MenuScreen onStart={handleStart} onTeacher={() => setScreen("teacher")} busy={busy} error={error} />;
}
