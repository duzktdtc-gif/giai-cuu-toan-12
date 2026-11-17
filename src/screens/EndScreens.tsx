import type { StudentProfile } from "../lib/models";
import type { GameResultView } from "../game/types";
import { captiveName, heroLabel, missionMeta } from "../game/levels";
import { loseHeadline } from "../game/engine";
import { formatDuration, formatPercent } from "../lib/format";
import { NightScene } from "../components/NightScene";
import { HeroSprite, PixelSprite } from "../components/PixelSprite";
import { Button, MuteToggle, Badge } from "../components/ui";

function resultReason(result: GameResultView): string {
  return result.result === "lose_timeout" ? "Hết 5 phút" : "Hết 2 trái tim";
}

function Stats({ result }: { result: GameResultView }) {
  const total = result.correctCount + result.wrongCount;
  return (
    <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2">
      <div className="card p-3">
        <p className="text-[10px] text-lilac-300">Câu đúng</p>
        <p className="text-xl font-extrabold text-mint-300">{result.correctCount}/5</p>
      </div>
      <div className="card p-3">
        <p className="text-[10px] text-lilac-300">Lần sai</p>
        <p className="text-xl font-extrabold text-rose-300">{result.wrongCount}</p>
      </div>
      <div className="card p-3">
        <p className="text-[10px] text-lilac-300">Thời gian</p>
        <p className="text-sm font-extrabold text-gold-300">{formatDuration(result.totalTimeMs)}</p>
      </div>
      <p className="col-span-3 text-[10px] text-lilac-300/60">
        Tổng {total} lượt trả lời · tỉ lệ đúng {formatPercent(total > 0 ? result.correctCount / total : 0)}
      </p>
    </div>
  );
}

export function GameOverScreen({
  profile,
  result,
  onReplay,
  onChoose,
  onMenu,
}: {
  profile: StudentProfile;
  result: GameResultView;
  onReplay: () => void;
  onChoose: () => void;
  onMenu: () => void;
}) {
  const meta = missionMeta(result.level);
  return (
    <NightScene className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-8 pt-4 sm:px-6">
        <header className="flex justify-end">
          <MuteToggle />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-4 flex items-end justify-center gap-3">
            <div className="opacity-60 grayscale">
              <HeroSprite avatar={profile.avatar} className="h-28 w-24" />
            </div>
            <div className="animate-bob">
              <PixelSprite id={meta.monsterId} title={meta.monsterName} className="h-32 w-28" />
            </div>
          </div>
          <Badge tone="rose">{resultReason(result)}</Badge>
          <h1 className="mt-3 text-balance text-2xl font-extrabold leading-tight text-rose-300 sm:text-3xl">
            {loseHeadline(profile.avatar)}
          </h1>
          <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-lilac-200">
            {heroLabel(profile.avatar, profile.name)} đã gục ngã trước{" "}
            <span className="font-semibold text-white">{meta.monsterName}</span> ở {meta.title.toLowerCase()}. Mỗi lần
            ngã là một lần học thêm điều mới.
          </p>
          <Stats result={result} />
          <div className="mt-6 grid w-full max-w-sm gap-2">
            <Button className="py-4" onClick={onReplay}>
              Thử lại {meta.title} <span aria-hidden>❤️</span>
            </Button>
            <Button variant="secondary" onClick={onChoose}>
              Chọn màn khác
            </Button>
            <Button variant="ghost" onClick={onMenu}>
              Về menu
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-lilac-300/60">
            Lượt thử lại có 2 trái tim mới, 5 câu rút lại và 5 phút.
          </p>
        </div>
      </div>
    </NightScene>
  );
}

export function VictoryScreen({
  profile,
  result,
  onReplay,
  onChoose,
  onMenu,
}: {
  profile: StudentProfile;
  result: GameResultView;
  onReplay: () => void;
  onChoose: () => void;
  onMenu: () => void;
}) {
  const meta = missionMeta(result.level);
  const perfect = result.correctCount === 5 && result.wrongCount === 0;
  return (
    <NightScene className="min-h-dvh">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 28 }, (_, index) => (
          <span
            key={index}
            className="confetti-piece"
            style={{
              left: `${(index * 37) % 100}%`,
              background: ["#f6c453", "#5eead4", "#fb7185", "#a78bfa", "#fff2c9"][index % 5],
              animationDuration: `${3 + (index % 5) * 0.6}s`,
              animationDelay: `${(index % 7) * 0.25}s`,
            }}
          />
        ))}
      </div>
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-8 pt-4 sm:px-6">
        <header className="flex items-center justify-between">
          <Badge tone="gold">🏆 Hoàn thành {meta.title}</Badge>
          <MuteToggle />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-2 flex items-end justify-center gap-1">
            <div className="animate-floaty">
              <HeroSprite
                avatar={profile.avatar}
                className="h-32 w-24 drop-shadow-[0_0_24px_rgba(246,196,83,0.45)] sm:h-36 sm:w-28"
              />
            </div>
            <div className="animate-bob pb-2 opacity-40 grayscale">
              <PixelSprite id={meta.monsterId} title={meta.monsterName} className="h-28 w-24" />
            </div>
            <div className="animate-floaty pb-1">
              <HeroSprite
                avatar={profile.avatar === "prince" ? "princess" : "prince"}
                className="h-28 w-20 drop-shadow-[0_0_24px_rgba(246,196,83,0.45)] sm:h-32 sm:w-24"
              />
            </div>
          </div>
          <div className="text-3xl" aria-hidden>
            💖
          </div>
          <h1 className="mt-2 text-balance text-3xl font-extrabold text-white sm:text-4xl">
            {perfect ? "Hoàn hảo! Quái vật bị hạ!" : "Quái vật đã bị hạ!"}
          </h1>
          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-lilac-200 sm:text-base">
            {heroLabel(profile.avatar, profile.name)} đã vượt qua {meta.topic.toLowerCase()} và giải cứu{" "}
            {captiveName(profile.avatar)}. {perfect ? "Không một lần sai — quá đỉnh!" : "Hãy thử lại để làm đúng cả 5 câu nhé!"}
          </p>
          <Stats result={result} />
          <div className="mt-6 grid w-full max-w-sm gap-2">
            <Button className="py-4" onClick={onReplay}>
              Chơi lại {meta.title}
            </Button>
            <Button variant="secondary" onClick={onChoose}>
              Chọn màn khác
            </Button>
            <Button variant="ghost" onClick={onMenu}>
              Về menu
            </Button>
          </div>
        </div>
      </div>
    </NightScene>
  );
}
