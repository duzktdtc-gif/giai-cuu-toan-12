import { useEffect, useMemo, useState } from "react";
import type { Avatar } from "../game/levels";
import { displayClass, displayName, identitySeed, stableUuid } from "../lib/normalize";
import { loadProfile, recentProfiles } from "../lib/storage";
import type { StudentProfile } from "../lib/models";
import { NightScene } from "../components/NightScene";
import { HeroSprite } from "../components/PixelSprite";
import { MuteToggle, Button, Badge } from "../components/ui";

interface Props {
  onStart: (values: { name: string; className: string; avatar: Avatar; restart: boolean }) => Promise<void>;
  onTeacher: () => void;
  busy: boolean;
  error: string | null;
}

export function MenuScreen({ onStart, onTeacher, busy, error }: Props) {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("prince");
  const [existing, setExisting] = useState<StudentProfile | null>(null);
  const [looking, setLooking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const recent = useMemo(() => recentProfiles(3), []);

  useEffect(() => {
    if (name.trim().length < 2 || className.trim().length < 1) {
      setExisting(null);
      return;
    }
    let cancelled = false;
    setLooking(true);
    const timer = window.setTimeout(async () => {
      try {
        const id = await stableUuid(identitySeed(name, className));
        if (!cancelled) setExisting(loadProfile(id) ?? null);
      } finally {
        if (!cancelled) setLooking(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, className]);

  async function submit(restart: boolean) {
    setFormError(null);
    if (displayName(name).length < 2) {
      setFormError("Vui lòng nhập họ tên (ít nhất 2 ký tự).");
      return;
    }
    if (className.trim().length < 1) {
      setFormError("Vui lòng nhập lớp, ví dụ 12A1.");
      return;
    }
    if (name.length > 80 || className.length > 30) {
      setFormError("Họ tên hoặc lớp quá dài.");
      return;
    }
    await onStart({ name: displayName(name), className: displayClass(className), avatar, restart });
  }

  const hasProgress = (existing?.maxLevel ?? 0) > 0 || Boolean(existing?.activeRun);
  const resumeLevel = existing?.activeRun?.level ?? Math.min((existing?.maxLevel ?? 0) + 1, 7);

  return (
    <NightScene className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pb-8 pt-4 sm:px-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-lilac-300">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-400/15 text-lg">⚔️</span>
            <span className="hidden sm:inline">Toán 12 • GDPT 2018</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={onTeacher}>
              <span aria-hidden>👩‍🏫</span> Giáo viên
            </button>
            <MuteToggle />
          </div>
        </header>

        <section className="mt-8 text-center">
          <div className="relative mx-auto mb-3 flex h-28 w-full max-w-sm items-end justify-center gap-1">
            <div className="animate-bob">
              <HeroSprite avatar="princess" className="h-24 w-20 drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)]" />
            </div>
            <div className="pb-10 text-2xl" aria-hidden>
              ⚔️
            </div>
            <div className="animate-floaty">
              <HeroSprite avatar="prince" className="h-24 w-20 drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)]" />
            </div>
          </div>
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Giải cứu Vương quốc
            <span className="block bg-gradient-to-r from-gold-200 via-gold-300 to-gold-500 bg-clip-text text-transparent">
              Toán học
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-lilac-300 sm:text-base">
            7 vùng đất, 7 quái vật, 27 dạng bài. Mỗi câu trả lời đúng là một đòn tấn công. Con đã sẵn sàng?
          </p>
        </section>

        <div className="mt-6 card p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-950/60 p-1" role="tablist" aria-label="Chọn vai trò">
            <button
              role="tab"
              aria-selected={role === "student"}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                role === "student" ? "bg-gold-400 text-ink-950" : "text-lilac-300 hover:bg-white/5"
              }`}
              onClick={() => setRole("student")}
            >
              🧑‍🎓 Học sinh
            </button>
            <button
              role="tab"
              aria-selected={role === "teacher"}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                role === "teacher" ? "bg-gold-400 text-ink-950" : "text-lilac-300 hover:bg-white/5"
              }`}
              onClick={() => {
                setRole("teacher");
                onTeacher();
              }}
            >
              👩‍🏫 Giáo viên
            </button>
          </div>

          {role === "student" ? (
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(false);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="student-name">
                    Họ và tên
                  </label>
                  <input
                    id="student-name"
                    className="field"
                    placeholder="Nguyễn Minh Anh"
                    autoComplete="name"
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="student-class">
                    Lớp
                  </label>
                  <input
                    id="student-class"
                    className="field"
                    placeholder="12A1"
                    autoComplete="off"
                    maxLength={30}
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <span className="label">Chọn nhân vật</span>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { id: "prince" as const, label: "Hoàng tử", desc: "Cứu Công chúa" },
                      { id: "princess" as const, label: "Công chúa", desc: "Cứu Hoàng tử" },
                    ]
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={avatar === option.id}
                      onClick={() => setAvatar(option.id)}
                      className={`group flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                        avatar === option.id
                          ? "border-gold-400 bg-gold-400/10 ring-2 ring-gold-400/30"
                          : "border-lilac-400/20 bg-ink-950/40 hover:border-lilac-400/50"
                      }`}
                    >
                      <HeroSprite avatar={option.id} className="h-12 w-10 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold text-white">{option.label}</span>
                        <span className="block text-[11px] leading-tight text-lilac-300">{option.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {looking ? (
                <p className="text-xs text-lilac-300">Đang kiểm tra tiến trình...</p>
              ) : existing && (existing.maxLevel > 0 || existing.activeRun) ? (
                <div className="rounded-xl border border-mint-400/20 bg-mint-400/10 px-3 py-2.5 text-sm text-mint-300">
                  <Badge tone="mint">Chào mừng trở lại!</Badge>{" "}
                  <span className="font-semibold text-white">{existing.name}</span> đã qua{" "}
                  {existing.maxLevel}/7 màn.
                  {existing.activeRun ? ` Đang ở màn ${existing.activeRun.level}.` : ""}
                </div>
              ) : null}

              {recent.length > 0 && (
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-lilac-300">Người chơi gần đây</span>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        className="rounded-full border border-lilac-400/20 bg-ink-950/50 px-3 py-1.5 text-xs text-lilac-200 hover:border-gold-400/50"
                        onClick={() => {
                          setName(profile.name);
                          setClassName(profile.className);
                          setAvatar(profile.avatar);
                        }}
                      >
                        {profile.name} · {profile.className}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(formError || error) && (
                <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300" role="alert">
                  {formError || error}
                </p>
              )}

              <div className="space-y-2 pt-1">
                <Button type="submit" className="w-full py-4 text-base" disabled={busy}>
                  {busy ? "Đang chuẩn bị..." : hasProgress ? `Tiếp tục màn ${resumeLevel}` : "Bắt đầu phiêu lưu"}
                  <span aria-hidden>➜</span>
                </Button>
                {hasProgress && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void submit(true)}
                  >
                    Chơi lại từ màn 1
                  </Button>
                )}
              </div>

              <p className="text-center text-[11px] leading-relaxed text-lilac-300/70">
                Chúng tôi chỉ lưu họ tên, lớp, nhân vật và kết quả làm bài để hiển thị tiến độ. Không thu thập
                email, số điện thoại hay dữ liệu khác.
              </p>
            </form>
          ) : (
            <div className="mt-6 text-center">
              <p className="text-sm text-lilac-300">Khu vực giáo viên cần key truy cập riêng.</p>
              <Button className="mt-4 w-full" onClick={onTeacher}>
                Mở khu vực giáo viên
              </Button>
            </div>
          )}
        </div>

        <footer className="mt-auto pt-8 text-center text-xs text-lilac-300/60">
          Hình ảnh pixel art tự vẽ bằng SVG · Âm thanh tổng hợp trực tiếp trên thiết bị
        </footer>
      </div>
    </NightScene>
  );
}
