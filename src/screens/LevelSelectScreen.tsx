import type { StudentProfile } from "../lib/models";
import { MISSIONS, heroLabel } from "../game/levels";
import { NightScene } from "../components/NightScene";
import { HeroSprite, PixelSprite } from "../components/PixelSprite";
import { Badge, Button, IconButton, MuteToggle } from "../components/ui";

interface Props {
  profile: StudentProfile;
  loadingLevel: 1 | 2 | null;
  error: string | null;
  onSelect: (level: 1 | 2) => void;
  onBack: () => void;
}

export function LevelSelectScreen({ profile, loadingLevel, error, onSelect, onBack }: Props) {
  return (
    <NightScene className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-8 pt-4 sm:px-6">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconButton label="Về menu" onClick={onBack}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </IconButton>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {heroLabel(profile.avatar, profile.name)}
              </p>
              <p className="text-[11px] text-lilac-300">Lớp {profile.className}</p>
            </div>
          </div>
          <MuteToggle />
        </header>

        <section className="mt-8 text-center">
          <Badge tone="gold">Chọn màn</Badge>
          <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Hôm nay con muốn hạ quái nào?</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-lilac-300">
            Mỗi lượt có 5 câu trắc nghiệm, 2 trái tim và 5 phút. Chọn tự do — không cần mở khóa theo thứ tự.
          </p>
        </section>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {MISSIONS.map((mission) => {
            const runs = profile.runsByLevel?.[String(mission.level)] ?? 0;
            const wins = profile.winsByLevel?.[String(mission.level)] ?? 0;
            const busy = loadingLevel === mission.level;
            return (
              <article
                key={mission.level}
                className={`card flex flex-col p-4 ${mission.level === 2 ? "border-rose-400/25" : "border-gold-400/25"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge tone={mission.level === 2 ? "rose" : "gold"}>{mission.title}</Badge>
                    <h2 className="mt-2 text-lg font-extrabold leading-tight text-white">{mission.topic}</h2>
                  </div>
                  <div className={`shrink-0 ${mission.level === 2 ? "animate-floaty" : "animate-bob"}`}>
                    <PixelSprite
                      id={mission.monsterId}
                      title={mission.monsterName}
                      className="h-20 w-18 drop-shadow-[0_8px_14px_rgba(0,0,0,0.55)]"
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] italic text-lilac-300">“{mission.taunt}”</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-lilac-200">{mission.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-lilac-300">
                  <span>Đã chơi {runs} lượt</span>
                  <span className="font-semibold text-mint-300">Thắng {wins}</span>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant={mission.level === 2 ? "danger" : "primary"}
                  disabled={Boolean(loadingLevel)}
                  onClick={() => onSelect(mission.level)}
                >
                  {busy ? "Đang tải đề..." : `Vào ${mission.title}`} <span aria-hidden>➜</span>
                </Button>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 text-center text-[11px] text-lilac-300/70">
          <span>5 câu / lượt</span>
          <span aria-hidden>·</span>
          <span>2 ❤️</span>
          <span aria-hidden>·</span>
          <span>5 phút</span>
        </div>

        <div className="mt-auto flex items-center justify-center gap-2 pt-8 text-[11px] text-lilac-300/60">
          <HeroSprite avatar={profile.avatar} className="h-8 w-7 opacity-80" />
          <span>Mỗi lượt là một lần mới, không lưu tiến trình giữa chừng.</span>
        </div>
      </div>
    </NightScene>
  );
}
