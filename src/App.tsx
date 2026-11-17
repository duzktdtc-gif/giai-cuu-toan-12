import { useState } from "react";
import type { Avatar } from "./game/levels";
import { loadBank } from "./game/bank";
import type { BankQuestion, GameResultView } from "./game/types";
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
import { MenuScreen } from "./screens/MenuScreen";
import { LevelSelectScreen } from "./screens/LevelSelectScreen";
import { GameScreen } from "./screens/GameScreen";
import { GameOverScreen, VictoryScreen } from "./screens/EndScreens";
import { TeacherScreen } from "./screens/TeacherScreen";

type Screen = "menu" | "select" | "game" | "result" | "teacher";

interface StartValues {
  name: string;
  className: string;
  avatar: Avatar;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<1 | 2>(1);
  const [bank, setBank] = useState<BankQuestion[] | null>(null);
  const [loadingLevel, setLoadingLevel] = useState<1 | 2 | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [result, setResult] = useState<GameResultView | null>(null);
  const [runKey, setRunKey] = useState(0);

  async function handleStart(values: StartValues) {
    setBusy(true);
    setError(null);
    try {
      const readable = displayName(values.name);
      const className = displayClass(values.className);
      const id = await stableUuid(identitySeed(readable, className));
      const now = new Date().toISOString();
      const existing = loadProfile(id);
      const base: StudentProfile = existing
        ? {
            ...existing,
            name: readable,
            nameNormalized: normalizeName(readable),
            className,
            classNormalized: normalizeClass(className),
            avatar: values.avatar,
            runsByLevel: existing.runsByLevel ?? {},
            winsByLevel: existing.winsByLevel ?? {},
          }
        : {
            id,
            name: readable,
            nameNormalized: normalizeName(readable),
            className,
            classNormalized: normalizeClass(className),
            avatar: values.avatar,
            sessionsCount: 0,
            createdAt: now,
            lastPlayed: now,
            runsByLevel: {},
            winsByLevel: {},
          };
      saveProfile(base);
      setProfile(base);
      setResult(null);
      setSelectError(null);
      setScreen("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không bắt đầu được. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectLevel(nextLevel: 1 | 2) {
    setLoadingLevel(nextLevel);
    setSelectError(null);
    try {
      const loaded = await loadBank(nextLevel);
      setBank(loaded);
      setLevel(nextLevel);
      setResult(null);
      setRunKey((value) => value + 1);
      setScreen("game");
    } catch (err) {
      setSelectError(err instanceof Error ? err.message : "Không tải được đề. Vui lòng thử lại.");
    } finally {
      setLoadingLevel(null);
    }
  }

  function handleFinish(next: StudentProfile, nextResult: GameResultView) {
    setProfile(next);
    setResult(nextResult);
    setScreen("result");
  }

  function handleQuit(next: StudentProfile) {
    setProfile(next);
    setScreen("select");
  }

  function handleReplay() {
    if (!bank) {
      setScreen("select");
      return;
    }
    setRunKey((value) => value + 1);
    setScreen("game");
  }

  if (screen === "teacher") {
    return <TeacherScreen onBack={() => setScreen("menu")} />;
  }

  if (screen === "select" && profile) {
    return (
      <LevelSelectScreen
        profile={profile}
        loadingLevel={loadingLevel}
        error={selectError}
        onSelect={(nextLevel) => void handleSelectLevel(nextLevel)}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "game" && profile && bank) {
    return (
      <GameScreen
        key={`${level}-${runKey}`}
        profile={profile}
        level={level}
        bank={bank}
        onFinish={handleFinish}
        onQuit={handleQuit}
      />
    );
  }

  if (screen === "result" && profile && result) {
    if (result.result === "win") {
      return (
        <VictoryScreen
          profile={profile}
          result={result}
          onReplay={handleReplay}
          onChoose={() => setScreen("select")}
          onMenu={() => setScreen("menu")}
        />
      );
    }
    return (
      <GameOverScreen
        profile={profile}
        result={result}
        onReplay={handleReplay}
        onChoose={() => setScreen("select")}
        onMenu={() => setScreen("menu")}
      />
    );
  }

  return <MenuScreen onStart={handleStart} onTeacher={() => setScreen("teacher")} busy={busy} error={error} />;
}
