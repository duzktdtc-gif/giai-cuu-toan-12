export type Avatar = "prince" | "princess";
export type MonsterId = "slime" | "bat" | "dragon" | "ghost" | "golem" | "robot" | "darklord";

export interface LevelMeta {
  level: number;
  topic: string;
  monsterId: MonsterId;
  monsterName: string;
  taunt: string;
  reward: string;
}

export const LEVELS: LevelMeta[] = [
  {
    level: 1,
    topic: "Tính đơn điệu của hàm số",
    monsterId: "slime",
    monsterName: "Slime Lười Biếng",
    taunt: "Ngươi không biết ta tăng hay giảm à?",
    reward: "Đồng bằng Đơn Điệu",
  },
  {
    level: 2,
    topic: "Cực trị của hàm số",
    monsterId: "bat",
    monsterName: "Dơi Đỉnh Cao",
    taunt: "Đỉnh cao của ngươi chỉ là... cực tiểu!",
    reward: "Thung lũng Cực Trị",
  },
  {
    level: 3,
    topic: "Giá trị lớn nhất – nhỏ nhất và tiệm cận",
    monsterId: "dragon",
    monsterName: "Rồng Bóng Đêm",
    taunt: "Ngươi có tiến gần được ta không?",
    reward: "Hồ Tiệm Cận",
  },
  {
    level: 4,
    topic: "Nguyên hàm",
    monsterId: "ghost",
    monsterName: "Bóng Ma Nguyên Hàm",
    taunt: "Ta sinh ra từ mọi hằng số C...",
    reward: "Rừng Nguyên Sinh",
  },
  {
    level: 5,
    topic: "Tích phân (tính chất, đổi biến)",
    monsterId: "golem",
    monsterName: "Golem Tích Phân",
    taunt: "Diện tích cơ thể ta là... vô hạn!",
    reward: "Đèo Tích Phân",
  },
  {
    level: 6,
    topic: "Phương pháp tọa độ trong không gian Oxyz",
    monsterId: "robot",
    monsterName: "Robot Không Gian",
    taunt: "Tọa độ của ngươi đã bị ta khoá!",
    reward: "Thành phố Oxyz",
  },
  {
    level: 7,
    topic: "Tổng hợp: diện tích, thể tích, xác suất có điều kiện",
    monsterId: "darklord",
    monsterName: "Chúa Tể Bóng Tối",
    taunt: "7 màn đã qua? Ngươi vẫn chưa đủ trình!",
    reward: "Lâu đài Ánh Sáng",
  },
];

export function levelMeta(level: number): LevelMeta {
  return LEVELS[Math.min(Math.max(level, 1), 7) - 1];
}

export const MAX_LEVEL = LEVELS.length;

export function captiveName(avatar: Avatar): string {
  return avatar === "prince" ? "Công chúa An Nhiên" : "Hoàng tử Minh Triết";
}

export function heroName(avatar: Avatar): string {
  return avatar === "prince" ? "Hoàng tử Dũng Cảm" : "Công chúa Kiên Cường";
}

export function storySlides(avatar: Avatar): { title: string; text: string }[] {
  const captive = captiveName(avatar);
  const hero = heroName(avatar);
  return [
    {
      title: "Vương quốc Toán học",
      text: "Một vương quốc nơi mọi điều đều được viết bằng con số và đường cong. Người dân sống bình yên dưới ánh sáng của Lâu đài Ánh Sáng.",
    },
    {
      title: "Bóng tối ập đến",
      text: `Chúa Tể Bóng Tối đã phong ấn ${captive} vào lâu đài, chia vương quốc thành 7 vùng đất và đặt 7 con quái vật canh giữ. ${hero} là hy vọng cuối cùng.`,
    },
    {
      title: "7 màn, 3 trái tim",
      text: "Mỗi câu trả lời đúng là một đòn tấn công hạ gục quái vật. Mỗi lần sai, con mất một trái tim và phải làm một bài tương tự. Hãy suy nghĩ kỹ nhé!",
    },
  ];
}
