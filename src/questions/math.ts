export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

/** Phân số LaTeX đã rút gọn, ví dụ fracLatex(9, 6) -> \dfrac{3}{2}. */
export function fracLatex(numerator: number, denominator = 1): string {
  if (denominator === 0) throw new Error("Mẫu số bằng 0");
  let n = numerator;
  let d = denominator;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return String(n);
  return n < 0 ? `-\\dfrac{${Math.abs(n)}}{${d}}` : `\\dfrac{${n}}{${d}}`;
}

export function fracValue(numerator: number, denominator = 1): number {
  return numerator / denominator;
}

/** Ghép các hạng tử thành đa thức LaTeX. c là hệ số nguyên, v là phần biến. */
export function polyLatex(terms: Array<{ c: number; v?: string }>): string {
  const parts: string[] = [];
  for (const { c, v = "" } of terms) {
    if (c === 0) continue;
    const abs = Math.abs(c);
    const coef = v === "" ? String(abs) : abs === 1 ? "" : String(abs);
    const body = `${coef}${v}`;
    if (parts.length === 0) parts.push(c < 0 ? `-${body}` : body);
    else parts.push(`${c < 0 ? "-" : "+"} ${body}`);
  }
  return parts.length ? parts.join(" ") : "0";
}

/** Dạng ax + b, tự xử lý dấu. */
export function linearLatex(a: number, b: number, variable = "x"): string {
  return polyLatex([
    { c: a, v: variable },
    { c: b },
  ]);
}

export function intervalLatex(a: string | number, b: string | number): string {
  return `\\left(${a};${b}\\right)`;
}

export function unionLatex(...intervals: string[]): string {
  return intervals.join("\\cup ");
}

/** Số thực gọn: 1.5 -> 1{,}5? Giữ dấu chấm trong LaTeX để KaTeX hiển thị đúng. */
export function numberLatex(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(6)));
}
