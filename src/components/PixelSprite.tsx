interface SpriteDef {
  grid: string[];
  palette: Record<string, string>;
}

const SPRITES: Record<string, SpriteDef> = {
  prince: {
    grid: [
      "....gggg....",
      "...gggggg...",
      "...gssssg...",
      "...sseess...",
      "...ssssss...",
      "....smms....",
      "...bbbbbb...",
      "..bbggggbb..",
      "..bbggggbb..",
      "...bbbbbb...",
      "...bbbbbb...",
      "...llllll...",
      "...ll..ll...",
      "...ll..ll...",
      "..ooo..ooo..",
      "............",
    ],
    palette: {
      g: "#f6c453",
      s: "#f7c9a3",
      e: "#241338",
      m: "#b4535f",
      b: "#4f7cff",
      l: "#2b2b55",
      o: "#7a4a2b",
    },
  },
  princess: {
    grid: [
      "....gggg....",
      "...gyyyyg...",
      "..yyyyyyyy..",
      "..yssssssy..",
      "..ysesessy..",
      "..yssssssy..",
      "...yssssy...",
      "..pppppppp..",
      ".pppppppppp.",
      ".pppppppppp.",
      "..pppppppp..",
      "...pppppp...",
      "...pp..pp...",
      "..ooo..ooo..",
      "............",
      "............",
    ],
    palette: {
      g: "#f6c453",
      y: "#8b5a2b",
      s: "#f7c9a3",
      e: "#241338",
      p: "#ff7ab6",
      o: "#7a4a2b",
    },
  },
  slime: {
    grid: [
      "............",
      "...gggggg...",
      "..gggggggg..",
      ".gggggggggg.",
      ".ggeeggeegg.",
      ".gggggggggg.",
      ".gggmmmmggg.",
      "..gggggggg..",
      "...gggggg...",
      "....gggg....",
      "............",
      "............",
    ],
    palette: { g: "#5eead4", e: "#100726", m: "#0f766e" },
  },
  bat: {
    grid: [
      "............",
      ".g........g.",
      ".gg......gg.",
      ".ggg.gg.ggg.",
      ".gggggggggg.",
      ".ggeeggeegg.",
      "..gggggggg..",
      "...gg..gg...",
      "....gggg....",
      "............",
      "............",
      "............",
    ],
    palette: { g: "#a78bfa", e: "#f6c453" },
  },
  dragon: {
    grid: [
      "............",
      "..r......r..",
      "..rr....rr..",
      "..rrrrrrrr..",
      "..rreerrer..",
      "..rrrrrrrr..",
      ".rrrwwwwrrr.",
      ".rrrrrrrrrr.",
      "..rrrrrrrr..",
      "...rrrrrr...",
      "....rrrr....",
      "...rr..rr...",
    ],
    palette: { r: "#fb7185", e: "#f6c453", w: "#fde68a" },
  },
  ghost: {
    grid: [
      "....gggg....",
      "...gggggg...",
      "..gggggggg..",
      "..ggeeggeg..",
      "..gggggggg..",
      "..gggmmggg..",
      "..gggggggg..",
      "..gggggggg..",
      "..gggggggg..",
      "..g.gg.gg.g.",
      "............",
      "............",
    ],
    palette: { g: "#ddd6fe", e: "#312e81", m: "#8b5cf6" },
  },
  golem: {
    grid: [
      "...gggggg...",
      "..gggggggg..",
      "..ggeeggeg..",
      "..gggggggg..",
      "..gggmmggg..",
      ".gggggggggg.",
      ".gg.gggg.gg.",
      ".gg.gggg.gg.",
      "..gggggggg..",
      "...gg..gg...",
      "..ggg..ggg..",
      "............",
    ],
    palette: { g: "#94a3b8", e: "#f6c453", m: "#334155" },
  },
  robot: {
    grid: [
      ".....gg.....",
      "....gggg....",
      "...gggggg...",
      "...geeeeg...",
      "...gggggg...",
      "....gmmg....",
      "..gggggggg..",
      ".g.gggggg.g.",
      ".g.gggggg.g.",
      "..gggggggg..",
      "...gg..gg...",
      "...gg..gg...",
    ],
    palette: { g: "#cbd5e1", e: "#38bdf8", m: "#475569" },
  },
  darklord: {
    grid: [
      ".....gggg.....",
      "....gggggg....",
      "...gggggggg...",
      "...ggeeggeg...",
      "...gggggggg...",
      "...gg.mm.gg...",
      "..gggggggggg..",
      ".gggggggggggg.",
      ".gg.gggggg.gg.",
      ".gg.gggggg.gg.",
      "..gggggggggg..",
      "...ggg..ggg...",
      "..gggg..gggg..",
      "..............",
    ],
    palette: { g: "#4c1d95", e: "#fb7185", m: "#f6c453" },
  },
};

export type SpriteId = keyof typeof SPRITES;

export function PixelSprite({
  id,
  className = "",
  title,
}: {
  id: string;
  className?: string;
  title?: string;
}) {
  const sprite = SPRITES[id] ?? SPRITES.slime;
  const width = Math.max(...sprite.grid.map((row) => row.length));
  const height = sprite.grid.length;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={title ?? id}
      shapeRendering="crispEdges"
    >
      {title ? <title>{title}</title> : null}
      {sprite.grid.flatMap((row, y) =>
        Array.from(row).map((char, x) => {
          if (char === "." || char === " ") return null;
          const fill = sprite.palette[char];
          if (!fill) return null;
          return <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} />;
        }),
      )}
    </svg>
  );
}

export function HeroSprite({ avatar, className = "" }: { avatar: "prince" | "princess"; className?: string }) {
  return <PixelSprite id={avatar} className={className} title={avatar === "prince" ? "Hoàng tử" : "Công chúa"} />;
}
