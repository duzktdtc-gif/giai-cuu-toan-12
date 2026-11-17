# Giải cứu Vương quốc Toán – Hình học 12

Game web **mobile-first** ôn tập hình học không gian lớp 12 theo phong cách phiêu lưu. Học sinh chọn một trong **2 màn**, mỗi lượt có **5 câu trắc nghiệm**, **2 trái tim** và **5 phút**. Trả lời đúng để tấn công quái vật; trả lời sai sẽ mất một trái tim và được xem đáp án + lời giải.

> Toàn bộ nhân vật, quái vật và hình minh họa là SVG/CSS/pixel art tự vẽ, không dùng tài sản có bản quyền. Âm thanh được tổng hợp trực tiếp bằng Web Audio API.

---

## 1. Tính năng

### Học sinh

- Nhập họ tên, lớp, chọn hoàng tử hoặc công chúa.
- Chọn tự do **Màn 1 – Góc giữa hai đường thẳng** hoặc **Màn 2 – Hai đường thẳng vuông góc**.
- Mỗi lượt rút ngẫu nhiên **5 câu gốc** từ ngân hàng của màn; không trùng trong một lượt.
- 4 đáp án được xáo trộn lại mỗi lần hiển thị; nhãn A–D gán lại sau khi xáo.
- **2 trái tim**. Sai lần thứ hai là thua.
- Đồng hồ **5 phút** cho cả lượt, tính bằng mốc `Date.now()` để không lệch khi tab chạy nền; đổi màu khi còn dưới 60 giây.
- **Màn 1**: sai câu gốc → xem đáp án/lời giải → làm một **câu tương tự**. Câu tương tự đúng được tính là đã qua câu gốc đó. Câu tương tự sai → mất thêm một trái tim. Câu tương tự không bao giờ được rút làm câu chính.
- **Màn 2**: không có câu tương tự. Sai → xem đáp án/lời giải (nếu có) → sang câu kế.
- Thắng khi trả lời xong 5 câu gốc trong thời gian và còn ít nhất 1 trái tim.
- Thua khi hết 2 trái tim hoặc hết giờ. Màn thua hiện đúng câu:
  - Hoàng tử: **“Chưa học mà đòi giải cứu công chúa”**
  - Công chúa: **“Chưa học mà đòi giải cứu hoàng tử”**
- Nút **Thử lại** tạo lượt mới cùng màn với 5 câu rút lại (xáo trộn lại), 2 trái tim và 5 phút.
- Không có lưu tiến trình giữa chừng và không có nút “chơi tiếp”. Thoát giữa chừng thì lượt đó được ghi là **bỏ dở**.
- Chơi được offline sau lần tải đầu; dữ liệu đồng bộ lại khi có mạng.
- Có nút bật/tắt âm thanh, giao diện tối ưu cho điện thoại.

### Giáo viên

- Đăng nhập bằng key giáo viên; key chỉ nằm trong Supabase Secrets, không có trong bundle trình duyệt.
- Bảng điểm theo học sinh: họ tên, lớp, số lượt, thắng, thua theo lý do, tổng thời gian, số lần sai, màn gần nhất, lần chơi gần nhất.
- Lọc theo lớp, theo màn và tìm theo tên.
- Xem chi tiết từng học sinh: từng lượt chơi và từng câu trả lời (đề bài, 4 đáp án, đã chọn, đáp án đúng, đúng/sai, số tim còn lại, thời gian làm).
- Thống kê tỉ lệ sai **theo màn** và **theo từng câu**; câu tương tự được đếm riêng.
- Xuất CSV cho danh sách học sinh và cho chi tiết từng học sinh.
- Cảnh báo rõ: **đáp án/lời giải hiện đang ở trạng thái tạm (`draft`), giáo viên phải duyệt trước khi dùng chính thức**.
- Token đăng nhập có hạn 8 giờ, lưu trong `sessionStorage`.

---

## 2. Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Vite, React 19, TypeScript |
| Giao diện | Tailwind CSS v4, SVG/CSS tự viết |
| Công thức toán | KaTeX |
| Âm thanh | Web Audio API tổng hợp |
| Lưu offline | `localStorage` |
| Backend | Supabase Postgres + Edge Functions (Deno) |
| Kiểm thử | `node --test` (không thêm framework mới) |
| Triển khai | GitHub Pages (kèm cấu hình Vercel/Netlify) |

---

## 3. Cấu trúc chính

```text
.
├── public/
│   ├── config.js                 # URL + publishable key, nạp lúc chạy
│   ├── data/level1.json          # 5 câu gốc + 5 câu tương tự
│   ├── data/level2.json          # 5 câu gốc, không có câu tương tự
│   └── .nojekyll
├── src/
│   ├── App.tsx                   # Menu → chọn màn → chơi → kết thúc
│   ├── screens/                  # Menu, LevelSelect, Game, End, Teacher
│   ├── game/
│   │   ├── types.ts
│   │   ├── levels.ts             # 2 màn, quái vật, lời thoại
│   │   ├── bank.ts               # tải/validate JSON + cache offline
│   │   ├── engine.js             # logic thuần, test bằng Node
│   │   ├── session.ts            # tạo lượt, ghi attempt, kết thúc lượt
│   │   └── catalog.ts            # nhãn câu hỏi cho dashboard
│   ├── components/               # Figure (SVG), MathText, PixelSprite, UI
│   └── lib/                      # config, storage, sync, teacherApi, format
├── tests/
│   ├── data.test.mjs             # kiểm tra ngân hàng câu hỏi
│   └── engine.test.mjs           # kiểm tra luật chơi, xáo đáp án, đồng hồ
├── supabase/
│   ├── migrations/20261116120000_init.sql
│   ├── migrations/20261117120000_two_levels.sql
│   └── functions/game-sync, teacher
├── .github/workflows/deploy-pages.yml
└── README.md
```

Các file cũ của phiên bản 7 màn (`src/questions/*`, `StoryScreen.tsx`) đã được thay thế. Migration cũ **không bị sửa**; migration mới bổ sung cột/view và giữ dữ liệu lịch sử.

---

## 4. Chạy trên máy

Yêu cầu: **Node.js 20+** và npm.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra (mặc định `http://localhost:5173`).

| Lệnh | Ý nghĩa |
| --- | --- |
| `npm run dev` | Chạy dev server |
| `npm run build` | Kiểm tra TypeScript và build production vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm test` | Chạy test dữ liệu + logic bằng `node --test` |
| `npm run test:watch` | Chạy test ở chế độ watch |

---

## 5. Cấu hình Supabase

Nếu bỏ qua mục này, game vẫn chơi offline và lưu kết quả trong `localStorage`; khu vực giáo viên sẽ báo chưa cấu hình.

### 5.1. Cấu hình frontend lúc chạy

Mở `public/config.js` và điền:

```js
window.__APP_CONFIG__ = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-PUBLISHABLE-OR-ANON-KEY",
  version: "2026-11-17.1",
};
```

- Đây là URL và **publishable/anon key** — thông tin công khai dùng cho trình duyệt.
- **Không đặt** `TEACHER_KEY`, `service_role` hoặc bất kỳ secret nào trong file này.
- Không dùng `VITE_SUPABASE_*` khi build. `main.tsx` nạp `config.js` lúc chạy trước khi import App.
- Đổi `version` mỗi khi cập nhật `public/data/*.json` để trình duyệt lấy dữ liệu mới.

### 5.2. Tạo schema

Chạy lần lượt hai migration:

1. `supabase/migrations/20261116120000_init.sql` (schema gốc)
2. `supabase/migrations/20261117120000_two_levels.sql` (bổ sung cho 2 màn)

Bằng Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Hoặc dán từng file vào SQL Editor và bấm **Run**.

Migration mới thêm:

- `sessions.level`, `total_time_ms`, `wrong_count`, `correct_count`, `cleared_count`.
  - `cleared_count` là số ô câu gốc đã hoàn thành; ở Màn 2, trả lời sai vẫn được tính là đã đi qua ô đó.
- `attempts.question_id`, `is_similar`, `chosen_index`, `correct_index`.
- Các giá trị kết quả mới: `win`, `lose_lives`, `lose_timeout`, `abandoned` (vẫn giữ `victory`, `game_over` của dữ liệu cũ).
- View mới `v_question_stats`; cập nhật `v_student_overview`, `v_level_stats`.
- Index cho màn, câu hỏi và câu tương tự.

RLS vẫn bật; `anon`/`authenticated` không đọc/ghi trực tiếp bảng hoặc view. Mọi truy cập đi qua Edge Function dùng service role.

### 5.3. Secret cho Edge Functions

```bash
supabase secrets set \
  TEACHER_KEY="<key-giao-vien-do-ban-quan-ly>" \
  TEACHER_TOKEN_SECRET="<chuoi-ngau-nhien-it-nhat-32-ky-tu>"
```

- `TEACHER_KEY`: key giáo viên. Key hiện tại do người dùng quản lý và **không được đổi** trong đợt cập nhật này.
- `TEACHER_TOKEN_SECRET`: khoá ký HMAC cho token 8 giờ. Nếu không đặt, code dùng tạm `TEACHER_KEY`; nên đặt riêng.
- `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` do Supabase tự cấp cho function.

### 5.4. Deploy Edge Functions

```bash
supabase functions deploy game-sync teacher --no-verify-jwt
```

Hai function đã đặt `verify_jwt = false` trong `supabase/config.toml` vì:

- `game-sync` nhận dữ liệu từ học sinh (chỉ dùng publishable key).
- `teacher` tự xác thực bằng key + token HMAC.

### 5.5. CORS

CORS **không dùng `*`**. Allowlist hiện tại:

- `https://duzktdtc-gif.github.io`
- Mọi `http://localhost:<port>` và `http://127.0.0.1:<port>` khi phát triển.

Nếu đổi tên miền hoặc tên tài khoản GitHub Pages, sửa `PRODUCTION_ORIGIN` trong cả hai function rồi deploy lại.

---

## 6. Triển khai GitHub Pages

Repo đang deploy tại:

**https://duzktdtc-gif.github.io/giai-cuu-toan-12/**

Workflow `.github/workflows/deploy-pages.yml` sẽ:

1. Cài dependency bằng `npm ci`.
2. Chạy `npm test`.
3. Chạy `npm run build`.
4. Upload `dist/` và deploy lên GitHub Pages.

Không cần khai báo `VITE_SUPABASE_*` trong GitHub Actions. Cấu hình Supabase nằm trong `public/config.js` và được copy vào `dist/config.js`.

`vite.config.ts` dùng `base: "./"` nên asset hoạt động cả ở đường dẫn con của GitHub Pages và ở tên miền gốc. `public/.nojekyll` tránh Jekyll bỏ qua file bắt đầu bằng dấu gạch dưới.

---

## 7. Luật chơi và dữ liệu

### Luật chơi

- Mỗi lượt: 5 câu gốc, 2 trái tim, 5 phút.
- Đúng → quái vật mất máu, sang câu kế.
- Sai → mất 1 trái tim, xem đáp án + lời giải.
  - Màn 1: làm câu tương tự. Đúng câu tương tự → qua câu gốc đó; sai → mất thêm tim.
  - Màn 2: sang câu kế.
- Hết 2 trái tim → thua vì hết mạng.
- Hết 5 phút → thua vì hết giờ.
- Hoàn thành 5 câu và còn ít nhất 1 trái tim → thắng.
- Không lưu tiến trình giữa chừng. Mỗi lần vào màn là một lượt mới.

Đồng hồ dùng mốc thời gian tuyệt đối (`Date.now()`), không cộng dồn `setInterval`. Khi hiện lời giải, đồng hồ tạm dừng nếu `PAUSE_TIMER_ON_EXPLANATION = true` (mặc định). Nếu đổi thành `false`, hết giờ vẫn thua ngay cả khi đang xem lời giải.

### Danh tính và đồng bộ

- Tên chuẩn hoá NFC, trim, gộp khoảng trắng, không phân biệt hoa thường.
- Lớp bỏ khoảng trắng và viết hoa (`12a1`, `12 A1` → `12A1`).
- ID học sinh là UUID ổn định sinh từ SHA-256 của `tên chuẩn hoá|lớp chuẩn hoá`.
- Attempt và session dùng UUID client; server upsert idempotent nên gửi lại không tạo bản trùng.
- Hàng đợi đồng bộ nằm trong `localStorage`; lỗi mạng không chặn game, tự thử lại với backoff.
- Không có lệnh `bootstrap`/resume khi mở lại game.

### Khoá localStorage

| Khoá | Nội dung |
| --- | --- |
| `gcs:v1:profiles` | Hồ sơ trên thiết bị |
| `gcs:v1:last-student` | Học sinh dùng gần nhất |
| `gcs:v1:queue` | Hàng đợi đồng bộ |
| `gcs:v1:settings` | Cài đặt âm thanh |
| `gcs:v2:bank:1`, `gcs:v2:bank:2` | Cache ngân hàng câu hỏi để chơi offline |
| `gcs:teacher-token` | Token giáo viên trong `sessionStorage` |

---

## 8. Ngân hàng câu hỏi và trạng thái duyệt

### Số lượng thực tế

Yêu cầu ban đầu ghi “khoảng 45 mục”, nhưng file Word thực tế chỉ có:

- **Màn 1:** 5 câu gốc + 2 câu tương tự có sẵn (của Câu 4 và Câu 5) = **7 mục**.
- **Màn 2:** 5 câu gốc, không có câu tương tự = **5 mục**.

Tổng cộng **12 mục từ file** (10 câu gốc + 2 câu tương tự). Để Màn 1 có đủ câu tương tự cho cả 5 câu gốc, bản này bổ sung **3 câu tương tự nháp** cho Câu 1-3. Ngân hàng hiện tại:

- `public/data/level1.json`: **10 câu** = 5 gốc + 5 tương tự.
- `public/data/level2.json`: **5 câu** = 5 gốc.

### Đáp án và lời giải

- Toàn bộ đáp án đánh dấu `answerStatus: "draft"`. Bảng đáp án trong file Word là tạm thời; **giáo viên phải xác nhận lại**.
- Màn 1 có lời giải cho cả 5 câu gốc và 5 câu tương tự.
  - Câu 4, Câu 5 giữ lời giải gốc từ file Word (`solutionStatus: "reviewed"`).
  - Câu 1–3 và các câu tương tự 1–3 có lời giải do AI soạn (`solutionStatus: "draft"`).
- Màn 2 không bắt buộc có lời giải; bản này có lời giải ngắn cho cả 5 câu nhưng đều đánh dấu `draft` để giáo viên duyệt.

### Lưu ý đặc biệt ở Màn 1 – Câu 4

Phương án nhiễu gốc **"AB và CC'"** cũng tạo với AB một góc 90°, trùng với đáp án đúng, nên đề gốc có thể có hai phương án đúng. Bản này đã thay bằng **"AB và A'C"** (góc khác 90°) để chỉ còn một đáp án đúng, đồng thời ghi chú trong `level1.json`. Giáo viên cần duyệt lại phương án này.

### Cách thêm/sửa câu

Sửa trực tiếp `public/data/level1.json` hoặc `level2.json`. Mỗi câu có dạng:

```json
{
  "id": "m1-q06",
  "level": 1,
  "topic": "goc-hai-duong-thang",
  "stem": "Đề bài, công thức trong $...$",
  "figure": { "type": "cube", "highlight": ["AB", "B'C'"] },
  "options": ["...", "...", "...", "..."],
  "correct": 0,
  "solution": ["Bước 1...", "Bước 2..."],
  "similarId": "m1-q06s",
  "answerStatus": "draft",
  "solutionStatus": "draft",
  "isSimilar": false
}
```

Quy tắc:

- Đúng **4 đáp án**, không trùng nhau, `correct` là chỉ số 0–3.
- `id` duy nhất trong màn.
- Câu gốc Màn 1 phải có `similarId` trỏ tới một câu `isSimilar: true` cùng màn.
- Câu tương tự không được có `similarId` và không bao giờ được rút làm câu chính.
- Hình minh họa dùng `type: "cube"` với `highlight` là các cặp đỉnh, hoặc `type: "lines"` với `mode` (`angle`, `parallel`, `coincident`, `perpendicular`, `skew`, `three`).
- Chạy `npm test` sau khi sửa; test sẽ kiểm tra cấu trúc, đáp án trùng, mã LaTeX sót lại và liên kết câu tương tự.

---

## 9. Kiểm thử

```bash
npm test
npx tsc --noEmit
npm run build
```

`npm test` dùng `node --test` với 2 file:

- `tests/data.test.mjs`: đếm câu gốc/tương tự, kiểm tra 4 đáp án khác nhau, đáp án đúng, lời giải Màn 1, liên kết `similarId`, hình SVG hợp lệ, không còn `\item`, `\textbf`, `\end{center}`, “Chọn A”...
- `tests/engine.test.mjs`: xáo đáp án, rút 5 câu gốc, không rút câu tương tự, đồng hồ, thông điệp thua, sai 2 lần là thua, Màn 1 đi qua câu tương tự, Màn 2 không có bước tương tự, hết giờ kể cả khi đang xem lời giải nếu `PAUSE_TIMER=false`.

Không cần cài thêm framework test.

---

## 10. Bảo mật và quyền riêng tư

### Dữ liệu thu thập

- Họ tên hiển thị, lớp, avatar.
- Lượt chơi: màn, thời điểm bắt đầu/kết thúc, tổng thời gian, số câu đúng/sai, kết quả.
- Câu trả lời: mã câu, câu gốc/tương tự, đề bài, 4 đáp án, đã chọn, đáp án đúng, đúng/sai, số tim còn lại, thời gian làm.

Không thu thập email, số điện thoại, vị trí, cookie quảng cáo hay dữ liệu theo dõi bên thứ ba.

### Bảo vệ

- RLS bật trên `students`, `sessions`, `attempts`; không policy cho `anon`/`authenticated`.
- Thu hồi quyền trực tiếp trên bảng/view; chỉ service role trong Edge Function truy cập.
- Key giáo viên chỉ ở server, so sánh constant-time qua SHA-256 + XOR.
- Token phiên ký HMAC-SHA256, hết hạn sau 8 giờ.
- Frontend chỉ giữ token trong `sessionStorage`.
- CORS giới hạn đúng origin GitHub Pages + localhost, không dùng `*`.

### Giới hạn cần biết

- `game-sync` là endpoint công khai có chủ đích (học sinh không có tài khoản). Người biết URL project + publishable key có thể gửi dữ liệu giả. Không dùng dữ liệu này cho đánh giá điểm chính thức nếu chưa bổ sung xác thực/rate limit.
- Publishable/anon key luôn công khai trong bundle; bảo vệ dựa vào RLS + Edge Function, không dựa vào việc giấu key.
- Không có mã hoá riêng ở tầng ứng dụng.
- Không có cơ chế tự động xoá dữ liệu; quản trị viên tự đặt chính sách lưu trữ.
- Nên dùng key giáo viên mạnh và đổi định kỳ nếu nghi lộ.

---

## 11. Hạn chế đã biết

- Màn 1 hiện chỉ có đúng 5 câu gốc, nên mỗi lượt dùng cả 5; chỉ thứ tự câu và thứ tự đáp án thay đổi. Muốn đa dạng hơn cần thêm câu gốc vào JSON.
- Mỗi câu gốc Màn 1 có đúng một câu tương tự.
- Đáp án/lời giải đang `draft`, chưa được giáo viên duyệt chính thức.
- Chưa có tài khoản học sinh; hai học sinh trùng tên trong cùng lớp sẽ chung hồ sơ.
- Chưa có rate limiting cho `game-sync` và `teacher`.
- Chưa có test E2E tự động; test hiện tập trung vào dữ liệu và logic thuần.
- Dashboard tải tối đa 2000 học sinh và 1000 câu trả lời/học sinh mỗi lần xem chi tiết.
- Dữ liệu 7 màn cũ vẫn hiển thị trong dashboard với nhãn “Màn N (cũ)”.

---

## 12. Checklist trước khi bàn giao

1. Giáo viên duyệt lại **toàn bộ đáp án `draft`** và các lời giải `draft`, đặc biệt phương án đã sửa ở Màn 1 – Câu 4.
2. Chạy `npm test`, `npx tsc --noEmit`, `npm run build`.
3. Chạy migration mới và deploy lại `game-sync`, `teacher`.
4. Kiểm tra CORS từ đúng origin GitHub Pages; thử một request từ origin lạ phải bị chặn.
5. Chơi thử một lượt Màn 1 và một lượt Màn 2 trên điện thoại; kiểm tra câu tương tự, hết tim, hết giờ.
6. Đăng nhập giáo viên, kiểm tra bộ lọc lớp/màn, chi tiết từng câu và xuất CSV.
7. Kiểm tra `public/config.js` không chứa `TEACHER_KEY`, `service_role` hoặc secret.
8. Kiểm tra lịch sử git không có `.env.local`, `supabase/.env.local` hoặc key giáo viên.
