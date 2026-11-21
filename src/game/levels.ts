import type { MissionMeta } from "./types";

export type Avatar = "prince" | "princess";

export const MISSIONS: MissionMeta[] = [
  {
    level: 1,
    title: "Màn 1",
    topic: "Góc giữa hai đường thẳng",
    description:
      "Nhận biết góc giữa hai đường thẳng, góc trong hình lập phương. Câu 4 và Câu 5 có câu tương tự; Câu 1-3 sai thì chuyển câu tiếp theo.",
    monsterId: "slime",
    monsterName: "Slime Góc Nhọn",
    taunt: "Ngươi có phân biệt được góc giữa hai đường thẳng không?",
  },
  {
    level: 2,
    title: "Màn 2",
    topic: "Hai đường thẳng vuông góc",
    description:
      "Nhận biết hai đường thẳng vuông góc, quan hệ song song – vuông góc trong không gian. Không có câu tương tự.",
    monsterId: "dragon",
    monsterName: "Rồng Vuông Góc",
    taunt: "Vuông góc hay chéo nhau, ngươi nhìn ra chứ?",
  },
];

export const MAX_LEVEL = MISSIONS.length;

export function missionMeta(level: number): MissionMeta {
  return MISSIONS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];
}

export function heroLabel(avatar: Avatar, name: string, maxLength = 18): string {
  const prefix = avatar === "prince" ? "Hoàng tử" : "Công chúa";
  const clean = name.normalize("NFC").trim().replace(/\s+/g, " ");
  const short = clean.length > maxLength ? `${clean.slice(0, maxLength - 3).trimEnd()}...` : clean;
  return `${prefix} ${short}`;
}

export function captiveName(avatar: Avatar): string {
  return avatar === "prince" ? "Công chúa An Nhiên" : "Hoàng tử Minh Triết";
}
