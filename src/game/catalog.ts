export const QUESTION_LABELS: Record<string, string> = {
  "m1-q01": "M1 · Câu 1 – Khoảng số đo góc giữa hai đường thẳng",
  "m1-q02": "M1 · Câu 2 – Dựng đường song song để xác định góc",
  "m1-q03": "M1 · Câu 3 – Hai đường thẳng song song hoặc trùng nhau",
  "m1-q04": "M1 · Câu 4 – Góc AB và B'C' trong hình lập phương",
  "m1-q05": "M1 · Câu 5 – Góc AC và A'B trong hình lập phương",
  "m1-q01s": "M1 · Câu tương tự 1 – Khoảng số đo góc",
  "m1-q02s": "M1 · Câu tương tự 2 – Dựng đường song song",
  "m1-q03s": "M1 · Câu tương tự 3 – Hai đường thẳng trùng nhau",
  "m1-q04s": "M1 · Câu tương tự 4 – Góc AD và B'D'",
  "m1-q05s": "M1 · Câu tương tự 5 – Góc A'C' và AD",
  "m2-q01": "M2 · Câu 1 – Định nghĩa hai đường thẳng vuông góc",
  "m2-q02": "M2 · Câu 2 – Cắt nhau hoặc chéo nhau",
  "m2-q03": "M2 · Câu 3 – Góc AB và B'C'",
  "m2-q04": "M2 · Câu 4 – Quan hệ vuông góc trong hình lập phương",
  "m2-q05": "M2 · Câu 5 – Song song và vuông góc",
};

export function questionLabel(id: string): string {
  return QUESTION_LABELS[id] ?? id;
}
