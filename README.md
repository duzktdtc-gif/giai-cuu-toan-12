# Giải cứu Vương quốc Toán học

Game web **mobile-first** giúp học sinh lớp 12 ôn tập Toán theo phong cách phiêu lưu: mỗi câu trả lời đúng là một đòn đánh hạ gục quái vật, mỗi câu sai mất một trái tim. Trò chơi có 7 màn bám sát chương trình lớp 12, ngân hàng câu hỏi sinh ngẫu nhiên, lưu tiến độ offline và bảng điểm giáo viên bảo vệ bằng key phía máy chủ.

> Không sử dụng nhân vật có bản quyền. Toàn bộ hình ảnh là SVG/CSS/emoji tự vẽ.

---

## 1. Tính năng chính

### Dành cho học sinh

- Nhập **tên**, **lớp**, chọn avatar (hoàng tử cứu công chúa hoặc công chúa cứu hoàng tử).
- **3 trái tim**, vượt **7 màn**, màn 7 là trận đấu với Chúa Tể Bóng Tối.
- Trả lời đúng: quái vật nhận đòn, mở màn tiếp theo.
- Trả lời sai: mất 1 trái tim, hiện **đáp án đúng + lời giải từng bước**, sau đó làm một câu **tương tự nhưng khác số**.
- Hết 3 trái tim: **Game Over**, cho phép chơi lại đúng màn đó với 3 trái tim mới; mỗi lần chơi lại được ghi thành một lượt riêng.
- Câu hỏi gồm **trắc nghiệm 4 lựa chọn** (đã xáo trộn, không trùng nhau) và **trả lời ngắn dạng số** (chấp nhận `1,5`, `1.5`, `3/2`).
- Chơi được **hoàn toàn offline**; khi có mạng và đã cấu hình Supabase, dữ liệu tự đồng bộ, lỗi mạng không làm gián đoạn game.
- Tiến độ gắn với **tên + lớp đã chuẩn hoá** nên mở trên thiết bị khác vẫn nhận đúng hồ sơ.
- Có nút bật/tắt âm thanh; giao diện tối ưu cho điện thoại.

### Dành cho giáo viên

- Đăng nhập bằng **key giáo viên**. Key chỉ nằm ở biến môi trường phía máy chủ, không có trong mã nguồn trình duyệt.
- Bảng điểm theo học sinh: lớp, số lượt chơi, màn cao nhất, tổng số lần sai, lần chơi gần nhất.
- Lọc theo lớp, tìm theo tên.
- Xem chi tiết từng học sinh: từng lượt chơi, từng câu trả lời (đề bài, tham số random, đáp án đã chọn, đáp án đúng, đúng/sai, số tim còn lại, thời gian làm).
- Thống kê **tỉ lệ sai theo màn** và **theo từng dạng bài (template)**.
- Xuất **CSV** cho danh sách học sinh và cho chi tiết từng học sinh.
- Token đăng nhập có hạn **8 giờ**, lưu trong `sessionStorage`; hết hạn sẽ yêu cầu đăng nhập lại.

---

## 2. Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Vite, React 19, TypeScript |
| Giao diện | Tailwind CSS v4, CSS/SVG tự viết |
| Công thức toán | KaTeX |
| Âm thanh | Web Audio API tổng hợp (không dùng file âm thanh) |
| Lưu trữ offline | `localStorage` |
| Backend (tuỳ chọn) | Supabase Postgres + Edge Functions (Deno) |
| Kiểm thử | Vitest |
| Triển khai | Vercel hoặc Netlify |

---

## 3. Cấu trúc thư mục

```text
.
├── src/
│   ├── App.tsx                  # Điều phối màn hình, khôi phục hồ sơ/lượt chơi
│   ├── screens/                 # Menu, cốt truyện, chơi, kết thúc, giáo viên
│   ├── game/
│   │   ├── levels.ts            # Thông tin 7 màn, quái vật, cốt truyện
│   │   └── session.ts           # Tạo lượt, ghi câu trả lời, lên màn, kết thúc
│   ├── questions/
│   │   ├── level1.ts … level7.ts# 27 mẫu câu hỏi
│   │   ├── types.ts             # Kiểu dữ liệu, prepareQuestion, validateQuestion
│   │   ├── build.ts             # makeMC, defineTemplate
│   │   ├── math.ts / rng.ts     # Helper toán và random có seed
│   │   └── index.ts             # Registry template + chống trùng id
│   ├── lib/
│   │   ├── normalize.ts         # Chuẩn hoá tên/lớp, UUID ổn định
│   │   ├── storage.ts           # localStorage an toàn
│   │   ├── sync.ts              # Hàng đợi đồng bộ + retry/backoff
│   │   └── teacherApi.ts        # Gọi Edge Function giáo viên
│   ├── components/              # MathText, NightScene, PixelSprite, UI
│   └── tests/questions.test.ts  # Test sinh câu hỏi
├── supabase/
│   ├── migrations/20261116120000_init.sql
│   ├── functions/game-sync/index.ts
│   ├── functions/teacher/index.ts
│   └── config.toml
├── vercel.json                  # Rewrite SPA cho Vercel
├── netlify.toml                 # Cấu hình build/redirect cho Netlify
└── .env.example
```

---

## 4. Yêu cầu môi trường

- **Node.js 20+** (khuyến nghị LTS) và npm.
- Trình duyệt hiện đại (Chrome, Edge, Safari, Firefox).
- Tuỳ chọn: tài khoản [Supabase](https://supabase.com) và [Supabase CLI](https://supabase.com/docs/guides/cli) nếu muốn đồng bộ đám mây + bảng điểm giáo viên.
- Tuỳ chọn: tài khoản Vercel/Netlify để triển khai.

---

## 5. Chạy trên máy local

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra (mặc định `http://localhost:5173`).

Không cần cấu hình gì thêm: game chạy ở chế độ **offline**, dữ liệu lưu trong `localStorage`. Khu vực giáo viên sẽ báo chưa cấu hình Supabase.

### Các lệnh

| Lệnh | Ý nghĩa |
| --- | --- |
| `npm run dev` | Chạy dev server |
| `npm run build` | Kiểm tra TypeScript và build production vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm test` | Chạy toàn bộ unit test một lần |
| `npm run test:watch` | Chạy test ở chế độ watch |

---

## 6. Cấu hình Supabase (tuỳ chọn nhưng cần cho bảng điểm)

Nếu bỏ qua mục này, game vẫn chơi được nhưng **không có đồng bộ đa thiết bị và không có bảng điểm giáo viên**.

### 6.1. Tạo project

1. Tạo project mới trên [supabase.com](https://supabase.com).
2. Ghi lại **Project URL** và **anon public key** trong *Project Settings → API*.

### 6.2. Tạo schema

Chạy file migration `supabase/migrations/20261116120000_init.sql` bằng một trong hai cách:

**Cách A — SQL Editor (nhanh):**

1. Mở *SQL Editor* trong Supabase Dashboard.
2. Dán toàn bộ nội dung file migration.
3. Bấm **Run**.

**Cách B — Supabase CLI:**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Migration tạo:

- Bảng `students`, `sessions`, `attempts`.
- View `v_student_overview`, `v_level_stats`, `v_template_stats`.
- Bật **RLS** trên cả 3 bảng và **không tạo policy** cho `anon`/`authenticated`.
- Thu hồi quyền truy cập trực tiếp bảng/view khỏi `anon` và `authenticated`; chỉ `service_role` được đọc/ghi.

> Nhờ vậy, dù lộ anon key thì người ngoài cũng không đọc được bảng điểm qua PostgREST. Mọi truy vấn đi qua Edge Function dùng service role.

### 6.3. Đặt secret cho Edge Functions

Key giáo viên **không bao giờ** đặt trong biến `VITE_*` hay mã nguồn frontend. Đặt bằng CLI:

```bash
supabase secrets set \
  TEACHER_KEY="mat-khau-giao-vien-dai-va-kho-doan" \
  TEACHER_TOKEN_SECRET="chuoi-bi-mat-ngau-nhien-it-nhat-32-ky-tu"
```

Hoặc vào *Project Settings → Edge Functions → Secrets* và thêm hai biến trên.

- `TEACHER_KEY`: mật khẩu giáo viên dùng để đăng nhập. Nên dài, ngẫu nhiên, không trùng mật khẩu khác.
- `TEACHER_TOKEN_SECRET`: khoá ký HMAC cho token phiên. Nếu không đặt, code sẽ dùng tạm `TEACHER_KEY`; **nên đặt riêng** một chuỗi ngẫu nhiên ≥ 32 ký tự.

`SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` do Supabase tự cấp cho Edge Function, không cần khai báo.

### 6.4. Deploy Edge Functions

```bash
supabase functions deploy game-sync teacher --no-verify-jwt
```

Hai function đã được cấu hình `verify_jwt = false` trong `supabase/config.toml` vì:

- `game-sync` nhận request từ học sinh (chỉ dùng anon key), và
- `teacher` tự xác thực bằng key + token HMAC riêng.

Có thể bỏ cờ `--no-verify-jwt` nếu đã dùng `config.toml`, nhưng thêm cờ này để chắc chắn.

### 6.5. Cấu hình frontend

Tạo file `.env.local` (đã nằm trong `.gitignore`):

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Xem mẫu tại `.env.example`. Khởi động lại dev server sau khi đổi biến môi trường.

Khi build production, khai báo đúng hai biến này trong phần Environment Variables của Vercel/Netlify.

---

## 7. Triển khai

### Vercel

1. Import repository vào Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`; Output directory: `dist`.
4. Thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (nếu dùng Supabase).
5. Deploy. `vercel.json` đã cấu hình rewrite mọi đường dẫn về `index.html`.

### Netlify

1. Import repository vào Netlify.
2. `netlify.toml` đã đặt sẵn:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Redirect SPA `/* → /index.html` (200)
3. Thêm hai biến môi trường `VITE_*` trong *Site settings → Environment variables*.
4. Deploy.

> Supabase Edge Functions chạy độc lập trên Supabase, không deploy cùng frontend. Sau khi deploy frontend, nhớ cấu hình CORS nếu thay đổi domain (hiện tại function cho phép `*`).

---

## 8. Luật chơi và cách lưu dữ liệu

### Luật chơi

- Bắt đầu với 3 trái tim.
- Đúng → hạ quái vật, sang màn kế.
- Sai → mất 1 tim, xem lời giải, làm câu tương tự khác số.
- Hết tim → Game Over; chơi lại **đúng màn đang dở** với 3 tim mới, ghi thành lượt mới.
- Thắng màn 7 → Victory.

### Danh tính học sinh

- Tên được chuẩn hoá: Unicode NFC, trim, gộp khoảng trắng, **không phân biệt hoa thường**.
- Lớp được chuẩn hoá: bỏ khoảng trắng, viết hoa (`12a1`, `12 A1` → `12A1`).
- Khoá danh tính là cặp `(tên chuẩn hoá, lớp chuẩn hoá)`.
- ID học sinh là UUID **ổn định**, sinh từ SHA-256 của `tên chuẩn hoá|lớp chuẩn hoá`, nên hai thiết bị nhập cùng tên + lớp sẽ ra cùng một hồ sơ.
- Lượt chơi và câu trả lời dùng UUID do client sinh; ghi lên server bằng **upsert idempotent**, gửi lại nhiều lần không tạo bản trùng.

### Đồng bộ

- Mọi thay đổi được đẩy vào hàng đợi trong `localStorage`.
- Khi online, hàng đợi được gửi theo nhóm học sinh tới `game-sync`.
- Lỗi mạng → giữ nguyên hàng đợi, thử lại với backoff (5s → tối đa 120s), không chặn game.
- Khi mở lại game, app gọi `bootstrap` để lấy màn cao nhất đã đạt và gợi ý tiếp tục.

### Các khoá localStorage

| Khoá | Nội dung |
| --- | --- |
| `gcs:v1:profiles` | Danh sách hồ sơ trên thiết bị |
| `gcs:v1:last-student` | Học sinh dùng gần nhất |
| `gcs:v1:queue` | Hàng đợi đồng bộ |
| `gcs:v1:settings` | Cài đặt (ví dụ âm thanh) |
| `gcs:teacher-token` | Token giáo viên trong `sessionStorage` |

Xoá dữ liệu trình duyệt sẽ xoá lịch sử offline; dữ liệu đã đồng bộ lên Supabase vẫn còn.

---

## 9. Ngân hàng câu hỏi và cách thêm mẫu mới

Hiện có **27 mẫu**: 4 mẫu cho màn 1–6, 3 mẫu cho màn 7. Mỗi mẫu sinh đề ngẫu nhiên và tự tính đáp án + lời giải từ tham số, không hard-code đề.

### Cấu trúc một mẫu

Mở file `src/questions/levelN.ts` tương ứng và làm theo mẫu:

```ts
import { makeMC, defineTemplate } from "./build";
import { randInt } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const myTemplate: QuestionTemplate = defineTemplate(
  {
    id: "l1-my-new-template", // phải duy nhất, bắt đầu bằng lN-
    level: 1,
    topic: "Tính đơn điệu của hàm số",
    title: "Tên hiển thị ngắn gọn",
  },
  (rng = Math.random): GeneratedQuestion => {
    const a = randInt(rng, 1, 5);
    // ... tính toán đáp án và các bước giải từ a

    return makeMC({
      template: myTemplate,
      prompt: `Đề bài có thể trộn LaTeX trong $...$, ví dụ $f(x)=x^${a}$.`,
      correctLatex: "đáp án đúng dạng LaTeX",
      distractors: ["nhiễu 1", "nhiễu 2", "nhiễu 3"],
      params: { a },              // lưu để giáo viên đối chiếu
      solution: [                 // từng bước, cũng trộn LaTeX trong $...$
        "Bước 1...",
        "Bước 2...",
      ],
    });
  },
);
```

Sau đó thêm mẫu vào mảng export cuối file:

```ts
export const level1Templates: QuestionTemplate[] = [
  // ... các mẫu cũ
  myTemplate,
];
```

### Quy tắc cần tuân thủ

- `id` duy nhất toàn hệ thống; registry ở `src/questions/index.ts` sẽ báo lỗi nếu trùng.
- `makeMC` yêu cầu **đúng 3 đáp án nhiễu phân biệt** và khác đáp án đúng; nếu không đủ sẽ throw.
- Đáp án nhiễu phải **thực sự sai** về mặt toán học — kiểm tra kỹ để tránh nhiều đáp án cùng đúng.
- Với câu trả lời ngắn, trả về object có `kind: "short"`, `answerLatex`, `answerValue` (số) và tuỳ chọn `tolerance` (mặc định `0.01`).
- Lời giải nên có ít nhất 2 bước và bám theo tham số đã random.
- `level` trong metadata phải khớp file/màn.

### Kiểm thử tự động

```bash
npm test
```

Test sẽ:

- Kiểm tra mỗi màn có tối thiểu 3 mẫu và id không trùng.
- Với **mỗi mẫu**, sinh **200 câu** bằng RNG có seed, xác nhận:
  - đề bài và lời giải không rỗng,
  - trắc nghiệm có đúng 4 lựa chọn, đúng 1 đáp án đúng, không trùng nhau,
  - `answerIndex` trỏ đúng,
  - câu ngắn có đáp án số hợp lệ,
  - sinh lại sau khi sai cho đề khác.
- Kiểm tra parser số (`1,5`, `1.5`, `3/2`, số âm).

---

## 10. Bảo mật và quyền riêng tư

### Dữ liệu thu thập

- Tên hiển thị, lớp, avatar.
- Lượt chơi: thời điểm bắt đầu/kết thúc, màn bắt đầu, màn cao nhất, kết quả.
- Câu trả lời: màn, mã mẫu, tham số random, đề bài, lựa chọn, đáp án đã chọn, đáp án đúng, đúng/sai, số tim còn lại, thời gian làm.

Không thu thập email, số điện thoại, vị trí, cookies quảng cáo hay dữ liệu theo dõi bên thứ ba.

### Nơi lưu

- Mặc định: chỉ trong `localStorage` trên thiết bị.
- Nếu cấu hình Supabase: thêm bản sao trên Postgres của project bạn quản lý.

### Biện pháp bảo vệ

- RLS bật, không policy cho `anon`/`authenticated`.
- Thu hồi quyền trực tiếp trên bảng và view; chỉ service role trong Edge Function truy cập.
- Key giáo viên chỉ ở server, so sánh constant-time (qua SHA-256 + XOR).
- Token phiên ký HMAC-SHA256, hết hạn sau 8 giờ, kiểm tra chữ ký + hạn mỗi request.
- Frontend chỉ giữ token trong `sessionStorage` (mất khi đóng tab).

### Giới hạn cần biết

- `game-sync` là endpoint công khai có chủ đích (học sinh không có tài khoản). Người biết URL project + anon key **có thể gửi dữ liệu giả**. Vì vậy không dùng dữ liệu này cho đánh giá điểm chính thức nếu không bổ sung xác thực thiết bị/rate limit.
- Anon key luôn công khai trong bundle frontend; đây là thiết kế của Supabase. Việc bảo vệ dữ liệu dựa vào RLS + Edge Function, không dựa vào việc giấu anon key.
- Không có mã hoá riêng ở tầng ứng dụng; dữ liệu được bảo vệ theo hạ tầng Supabase.
- Không có cơ chế tự động xoá dữ liệu. Quản trị viên cần tự đặt chính sách lưu trữ/xoá.
- Nên dùng key giáo viên mạnh và đổi định kỳ; nếu key lộ, người khác có thể xem toàn bộ bảng điểm.

---

## 11. Hạn chế đã biết

- Bundle JS ~580 kB (gzip ~177 kB) do KaTeX; có thể code-split nếu cần tối ưu sâu hơn.
- Chưa có tài khoản học sinh; danh tính dựa trên tên + lớp nên hai học sinh trùng tên trong cùng lớp sẽ chung hồ sơ.
- Chưa có rate limiting cho `game-sync` và `teacher`.
- Chưa có test E2E tự động trong repo; unit test tập trung vào sinh câu hỏi.
- Bảng điểm tải tối đa 2000 học sinh và 1000 câu trả lời/học sinh mỗi lần xem chi tiết (đủ cho quy mô lớp học).

---

## 12. Kiểm tra trước khi bàn giao

```bash
npm test          # 57 test, sinh 200 câu/mẫu
npx tsc --noEmit  # kiểm tra kiểu
npm run build     # build production
```

Nếu dùng Supabase, kiểm tra thêm:

1. Đăng nhập giáo viên bằng `TEACHER_KEY` → xem được bảng điểm.
2. Chơi một lượt trên điện thoại → dữ liệu xuất hiện sau khi đồng bộ.
3. Mở cùng tên + lớp trên thiết bị khác → nhận đúng hồ sơ.
4. Gọi trực tiếp `https://<project>.supabase.co/rest/v1/students?select=*` với anon key → phải bị từ chối.
