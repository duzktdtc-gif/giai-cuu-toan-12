import { useState } from "react";
import { captiveName, heroName, storySlides, type Avatar } from "../game/levels";
import { NightScene } from "../components/NightScene";
import { HeroSprite, PixelSprite } from "../components/PixelSprite";
import { Button, MuteToggle } from "../components/ui";
import { sound } from "../lib/audio";

export function StoryScreen({ avatar, startLevel, onDone }: { avatar: Avatar; startLevel: number; onDone: () => void }) {
  const slides = storySlides(avatar);
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;

  function next() {
    sound.play("click");
    if (last) onDone();
    else setIndex((value) => value + 1);
  }

  return (
    <NightScene className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-6 pt-4 sm:px-6">
        <header className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-gold-300">
            Mở đầu · {index + 1}/{slides.length}
          </span>
          <div className="flex items-center gap-2">
            <MuteToggle />
            <button
              type="button"
              className="btn-ghost rounded-lg bg-ink-950/40 px-3 py-2 backdrop-blur"
              onClick={onDone}
            >
              Bỏ qua ➜
            </button>
          </div>
        </header>

        <div className="mt-6 flex flex-1 flex-col justify-center">
          <div className="relative mb-6 flex h-48 items-end justify-center gap-2 overflow-hidden rounded-3xl border border-lilac-400/15 bg-ink-900/60 p-3 sm:h-56">
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950 to-transparent" />
            <div className={index === 0 ? "animate-floaty" : ""}>
              <HeroSprite avatar={avatar} className="h-32 w-24 drop-shadow-xl sm:h-36 sm:w-28" />
            </div>
            <div className="mb-2 flex flex-col items-center gap-1">
              <span className="text-5xl" aria-hidden>
                {index === 0 ? "🏰" : "🔒"}
              </span>
              <span className="text-[10px] font-semibold text-lilac-300">{captiveName(avatar)}</span>
            </div>
            {index >= 1 && (
              <div className="animate-bob">
                <PixelSprite id="darklord" className="h-32 w-28 opacity-80 drop-shadow-xl sm:h-36" title="Chúa Tể Bóng Tối" />
              </div>
            )}
          </div>

          <div key={index} className="animate-fade-up">
            <h1 className="text-balance text-2xl font-extrabold text-white sm:text-3xl">
              {index === 0 ? slide.title : index === 1 ? `Bóng tối bắt giữ ${captiveName(avatar)}` : slide.title}
            </h1>
            <p className="mt-3 text-pretty text-base leading-relaxed text-lilac-200">
              {index === 2
                ? `${heroName(avatar)} ơi, mỗi câu trả lời đúng là một đòn tấn công. Con có 3 trái tim cho mỗi lượt chơi. Trả lời sai, quái vật sẽ phản đòn và con phải làm một bài tương tự.`
                : slide.text}
            </p>
            {index === 2 && (
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="chip bg-rose-400/15 text-rose-300">❤️ 3 mạng</span>
                <span className="chip bg-gold-400/15 text-gold-300">⚔️ 7 màn</span>
                <span className="chip bg-mint-400/15 text-mint-300">🎯 27 dạng bài</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {slides.map((_, dot) => (
              <span
                key={dot}
                className={`h-2 rounded-full transition-all ${dot === index ? "w-6 bg-gold-400" : "w-2 bg-lilac-400/30"}`}
              />
            ))}
          </div>
          <Button onClick={next} className="min-w-36">
            {last ? `Vào màn ${startLevel}` : "Tiếp tục"} <span aria-hidden>➜</span>
          </Button>
        </div>
      </div>
    </NightScene>
  );
}
