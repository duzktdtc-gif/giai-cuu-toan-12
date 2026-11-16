import type { StudentProfile } from "../lib/models";
import { captiveName, heroName, levelMeta } from "../game/levels";
import { NightScene } from "../components/NightScene";
import { HeroSprite, PixelSprite } from "../components/PixelSprite";
import { Button, MuteToggle, Badge } from "../components/ui";
import { MathText } from "../components/MathText";

export function GameOverScreen({
  profile,
  lostLevel,
  cleared,
  onReplay,
  onMenu,
}: {
  profile: StudentProfile;
  lostLevel: number;
  cleared: number;
  onReplay: () => void;
  onMenu: () => void;
}) {
  const meta = levelMeta(lostLevel);
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
          <Badge tone="rose">Hết trái tim</Badge>
          <h1 className="mt-3 text-3xl font-extrabold text-rose-300">GAME OVER</h1>
          <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-lilac-200">
            {heroName(profile.avatar)} đã gục ngã trước <span className="font-semibold text-white">{meta.monsterName}</span> ở
            màn {lostLevel}. Nhưng mỗi lần ngã là một lần học thêm điều mới.
          </p>
          <div className="mt-5 grid w-full max-w-sm grid-cols-2 gap-2">
            <div className="card p-3">
              <p className="text-xs text-lilac-300">Đã qua</p>
              <p className="text-2xl font-extrabold text-gold-300">{cleared}/7</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-lilac-300">Số lần sai (cả hành trình)</p>
              <p className="text-2xl font-extrabold text-rose-300">{profile.totalWrong}</p>
            </div>
          </div>
          <div className="mt-6 grid w-full max-w-sm gap-2">
            <Button className="py-4" onClick={onReplay}>
              Chơi lại màn {lostLevel} <span aria-hidden>❤️</span>
            </Button>
            <Button variant="secondary" onClick={onMenu}>
              Về menu
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-lilac-300/60">Lượt chơi lại có 3 trái tim mới và được ghi nhận riêng.</p>
        </div>
      </div>
    </NightScene>
  );
}

export function VictoryScreen({
  profile,
  onReplay,
  onMenu,
}: {
  profile: StudentProfile;
  onReplay: () => void;
  onMenu: () => void;
}) {
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
          <Badge tone="gold">🏆 Phá đảo</Badge>
          <MuteToggle />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-2 flex items-end justify-center gap-1">
            <div className="animate-floaty">
              <HeroSprite avatar={profile.avatar} className="h-32 w-24 drop-shadow-[0_0_24px_rgba(246,196,83,0.45)] sm:h-36 sm:w-28" />
            </div>
            <div className="animate-bob pb-2">
              <HeroSprite
                avatar={profile.avatar === "prince" ? "princess" : "prince"}
                className="h-32 w-24 drop-shadow-[0_0_24px_rgba(246,196,83,0.45)] sm:h-36 sm:w-28"
              />
            </div>
          </div>
          <div className="text-3xl" aria-hidden>
            💖
          </div>
          <h1 className="mt-2 text-balance text-3xl font-extrabold text-white sm:text-4xl">
            Vương quốc được giải cứu!
          </h1>
          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-lilac-200 sm:text-base">
            {heroName(profile.avatar)} đã đánh bại Chúa Tể Bóng Tối và giải cứu {captiveName(profile.avatar)}. Ánh sáng
            trở lại Lâu đài, và 7 vùng đất Toán học lại vang tiếng cười.
          </p>
          <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2">
            <div className="card p-3">
              <p className="text-[10px] text-lilac-300">Màn đã qua</p>
              <p className="text-xl font-extrabold text-mint-300">7/7</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] text-lilac-300">Số lượt chơi</p>
              <p className="text-xl font-extrabold text-gold-300">{profile.sessionsCount}</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] text-lilac-300">Tổng lần sai</p>
              <p className="text-xl font-extrabold text-rose-300">{profile.totalWrong}</p>
            </div>
          </div>
          {profile.totalWrong === 0 && (
            <p className="mt-3 text-sm font-semibold text-gold-300">
              <MathText text="Hoàn hảo! Không một lần sai. $\infty$ điểm thưởng!" />
            </p>
          )}
          <div className="mt-6 grid w-full max-w-sm gap-2">
            <Button className="py-4" onClick={onReplay}>
              Chơi lại từ màn 1
            </Button>
            <Button variant="secondary" onClick={onMenu}>
              Về menu
            </Button>
          </div>
        </div>
      </div>
    </NightScene>
  );
}
