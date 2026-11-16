/** Chuẩn hoá tên: NFC, trim, gộp khoảng trắng, không phân biệt hoa thường. */
export function normalizeName(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

/** Tên hiển thị: giữ nguyên dấu, chỉ trim và gộp khoảng trắng. */
export function displayName(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** Lớp: chuẩn hoá để "12a1", "12A1 ", "12 a1" được coi là một. */
export function normalizeClass(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, "")
    .toLocaleUpperCase("vi");
}

export function displayClass(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** UUID ổn định từ tên + lớp, để nhiều thiết bị cùng tạo ra một student id. */
export async function stableUuid(seed: string): Promise<string> {
  const data = new TextEncoder().encode(`giai-cuu-toan-v1:${seed}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function identitySeed(name: string, className: string): string {
  return `${normalizeName(name)}|${normalizeClass(className)}`;
}
