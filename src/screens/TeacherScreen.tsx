import { useEffect, useMemo, useState } from "react";
import {
  TeacherApiError,
  clearTeacherSession,
  fetchDashboard,
  fetchStudentDetail,
  loadTeacherSession,
  teacherLogin,
  type TeacherSession,
} from "../lib/teacherApi";
import type {
  AttemptRecord,
  SessionResult,
  TeacherDashboard,
  TeacherStudentDetail,
  TeacherStudentRow,
} from "../lib/models";
import { questionLabel } from "../game/catalog";
import { loadBank } from "../game/bank";
import { countDraftQuestions } from "../game/review";
import { missionMeta } from "../game/levels";
import { resultLabel } from "../game/engine";
import { formatDateTime, formatDuration, formatPercent, timeAgo } from "../lib/format";
import { NightScene } from "../components/NightScene";
import { MathText } from "../components/MathText";
import { Badge, Button, IconButton, Modal } from "../components/ui";

interface Props {
  onBack: () => void;
}

function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Chặn công thức spreadsheet khi mở CSV bằng Excel/Google Sheets.
  if (/^\s*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const content = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function levelName(level: number): string {
  if (level === 1 || level === 2) return `Màn ${level}`;
  return `Màn ${level} (cũ)`;
}

function levelTopic(level: number): string {
  if (level === 1 || level === 2) return missionMeta(level).topic;
  return "Dữ liệu phiên bản 7 màn cũ";
}

function studentCsv(rows: TeacherStudentRow[]): void {
  downloadCsv(`bang-diem-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Họ tên", "Lớp", "Nhân vật", "Số lượt", "Thắng", "Hết mạng", "Hết giờ", "Số lần sai", "Tổng thời gian (ms)", "Màn gần nhất", "Lần chơi gần nhất"],
    ...rows.map((row) => [
      row.displayName,
      row.className,
      row.avatar === "prince" ? "Hoàng tử" : "Công chúa",
      row.sessionsCount,
      row.winCount,
      row.loseLivesCount,
      row.loseTimeoutCount,
      row.wrongCount,
      row.totalTimeMs,
      row.lastLevel,
      row.lastPlayed ? formatDateTime(row.lastPlayed) : "",
    ]),
  ]);
}

function detailCsv(student: TeacherStudentRow, attempts: AttemptRecord[]): void {
  downloadCsv(`chi-tiet-${student.displayName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Thời gian", "Màn", "Câu", "Loại", "Đề bài", "Đáp án đã chọn", "Đáp án đúng", "Kết quả", "Mạng còn lại", "Thời gian làm (ms)"],
    ...attempts.map((attempt) => [
      formatDateTime(attempt.createdAt),
      attempt.level,
      `${attempt.questionId} – ${questionLabel(attempt.questionId)}`,
      attempt.isSimilar ? "Câu tương tự" : "Câu gốc",
      attempt.questionText,
      attempt.chosenText,
      attempt.correctText,
      attempt.isCorrect ? "Đúng" : "Sai",
      attempt.livesLeft,
      attempt.timeSpentMs,
    ]),
  ]);
}

function sessionTone(result: SessionResult): "mint" | "rose" | "gold" | "lilac" {
  if (result === "win" || result === "victory") return "mint";
  if (result === "lose_lives" || result === "game_over") return "rose";
  if (result === "lose_timeout") return "gold";
  return "lilac";
}

export function TeacherScreen({ onBack }: Props) {
  const [session, setSession] = useState<TeacherSession | null>(() => loadTeacherSession());
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<TeacherStudentDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  useEffect(() => {
    if (session) void loadDashboard(session.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session) {
      setDraftCount(null);
      return;
    }
    let cancelled = false;
    void Promise.all([loadBank(1), loadBank(2)])
      .then(([level1, level2]) => {
        if (!cancelled) setDraftCount(countDraftQuestions([level1, level2]));
      })
      .catch(() => {
        // Không đọc được ngân hàng thì không hiện số liệu duyệt sai.
        if (!cancelled) setDraftCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  function expire(message: string) {
    clearTeacherSession();
    setSession(null);
    setDashboard(null);
    setDetail(null);
    setError(message);
  }

  async function loadDashboard(token: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboard(token);
      setDashboard(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tải được bảng điểm.";
      if (err instanceof TeacherApiError && err.status === 401) expire(message);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!key.trim()) {
      setError("Vui lòng nhập key giáo viên.");
      return;
    }
    setLoginBusy(true);
    setError(null);
    try {
      const next = await teacherLogin(key.trim());
      setSession(next);
      setKey("");
      await loadDashboard(next.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function openDetail(student: TeacherStudentRow) {
    if (!session) return;
    setDetailLoadingId(student.id);
    setDetailError(null);
    try {
      const data = await fetchStudentDetail(session.token, student.id);
      setDetail(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tải được chi tiết.";
      if (err instanceof TeacherApiError && err.status === 401) expire(message);
      else setDetailError(message);
    } finally {
      setDetailLoadingId(null);
    }
  }

  const classes = useMemo(() => {
    const set = new Set((dashboard?.students ?? []).map((student) => student.className));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [dashboard]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi");
    return (dashboard?.students ?? []).filter((student) => {
      const matchesClass = classFilter === "all" || student.className === classFilter;
      const matchesName = !needle || student.displayName.toLocaleLowerCase("vi").includes(needle);
      const matchesLevel =
        levelFilter === "all" || (student.levelsPlayed ?? []).some((level) => String(level) === levelFilter);
      return matchesClass && matchesName && matchesLevel;
    });
  }, [dashboard, classFilter, levelFilter, search]);

  const summary = useMemo(() => {
    const students = dashboard?.students ?? [];
    const sessions = students.reduce((sum, student) => sum + student.sessionsCount, 0);
    const wins = students.reduce((sum, student) => sum + student.winCount, 0);
    const wrong = students.reduce((sum, student) => sum + student.wrongCount, 0);
    return { students: students.length, sessions, wins, wrong };
  }, [dashboard]);

  const levelRows = (dashboard?.levelStats ?? []).filter(
    (row) => levelFilter === "all" || String(row.level) === levelFilter,
  );
  const levelFilterLabel = levelFilter === "all" ? "tất cả các màn" : levelName(Number(levelFilter));
  const questionRows = (dashboard?.questionStats ?? [])
    .filter((row) => levelFilter === "all" || String(row.level) === levelFilter)
    .slice()
    .sort((a, b) => b.wrongRate - a.wrongRate || b.attempts - a.attempts)
    .slice(0, 15);

  return (
    <NightScene className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-3 pb-12 pt-4 sm:px-6">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconButton label="Về menu" onClick={onBack}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </IconButton>
            <div>
              <h1 className="text-lg font-extrabold text-white sm:text-xl">Khu vực giáo viên</h1>
              <p className="text-[11px] text-lilac-300">Bảng điểm &amp; phân tích lớp học</p>
            </div>
          </div>
          {session && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => void loadDashboard(session.token)}>
                Làm mới
              </Button>
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  clearTeacherSession();
                  setSession(null);
                  setDashboard(null);
                }}
              >
                Đăng xuất
              </Button>
            </div>
          )}
        </header>

        {!session ? (
          <div className="mx-auto mt-10 max-w-md card p-5 sm:p-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/15 text-2xl" aria-hidden>
              🔐
            </div>
            <h2 className="text-xl font-bold text-white">Đăng nhập giáo viên</h2>
            <p className="mt-1 text-sm leading-relaxed text-lilac-300">
              Nhập key truy cập do quản trị viên cung cấp. Key được kiểm tra trên máy chủ và không có trong mã nguồn
              trình duyệt.
            </p>
            <form className="mt-5 space-y-3" onSubmit={handleLogin}>
              <label className="label" htmlFor="teacher-key">
                Key giáo viên
              </label>
              <div className="relative">
                <input
                  id="teacher-key"
                  className="field pr-12"
                  type={showKey ? "text" : "password"}
                  autoComplete="current-password"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="••••••••••••"
                  disabled={loginBusy}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-lilac-300"
                  aria-label={showKey ? "Ẩn key" : "Hiện key"}
                  onClick={() => setShowKey((value) => !value)}
                >
                  {showKey ? "🙈" : "👁️"}
                </button>
              </div>
              {error && (
                <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full py-3" disabled={loginBusy}>
                {loginBusy ? "Đang kiểm tra..." : "Mở bảng điểm"}
              </Button>
            </form>
            <p className="mt-4 text-[11px] leading-relaxed text-lilac-300/60">
              Phiên đăng nhập có hạn 8 giờ. Mọi truy vấn bảng điểm đều gửi kèm token và được kiểm tra ở Edge Function.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {error && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
            {(draftCount ?? 0) > 0 && (
              <p className="rounded-lg border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-xs leading-relaxed text-gold-200">
                ⚠️ Còn <strong>{draftCount} câu draft</strong>. Đáp án/lời giải của các câu này cần được giáo viên
                duyệt trước khi dùng chính thức.
              </p>
            )}
            {draftCount === 0 && <p className="text-[11px] font-semibold text-mint-300">✓ Câu chưa duyệt: 0</p>}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Học sinh", value: summary.students, tone: "text-gold-300" },
                { label: "Lượt chơi", value: summary.sessions, tone: "text-lilac-200" },
                { label: "Lượt thắng", value: summary.wins, tone: "text-mint-300" },
                { label: "Lần trả lời sai", value: summary.wrong, tone: "text-rose-300" },
              ].map((item) => (
                <div key={item.label} className="card p-3">
                  <p className="text-[11px] text-lilac-300">{item.label}</p>
                  <p className={`text-2xl font-extrabold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-lilac-400/15 p-3 sm:flex-row sm:items-center sm:p-4">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <input
                    className="field py-2.5 sm:max-w-xs"
                    placeholder="Tìm theo tên..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Tìm theo tên"
                  />
                  <select
                    className="field py-2.5 sm:max-w-36"
                    value={classFilter}
                    onChange={(event) => setClassFilter(event.target.value)}
                    aria-label="Lọc theo lớp"
                  >
                    <option value="all">Tất cả lớp</option>
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field py-2.5 sm:max-w-32"
                    value={levelFilter}
                    onChange={(event) => setLevelFilter(event.target.value)}
                    aria-label="Lọc theo màn"
                  >
                    <option value="all">Tất cả màn</option>
                    <option value="1">Màn 1</option>
                    <option value="2">Màn 2</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-lilac-300">{filtered.length} học sinh</span>
                  <Button
                    variant="secondary"
                    className="px-3 py-2 text-xs"
                    onClick={() => studentCsv(filtered)}
                    disabled={!filtered.length}
                  >
                    ⬇ Xuất CSV
                  </Button>
                </div>
              </div>

              {loading && !dashboard ? (
                <p className="p-6 text-center text-sm text-lilac-300">Đang tải bảng điểm...</p>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-lilac-300">Chưa có học sinh phù hợp.</p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="bg-ink-950/50 text-[11px] uppercase tracking-wide text-lilac-300">
                        <tr>
                          <th className="px-4 py-2.5">Học sinh</th>
                          <th className="px-3 py-2.5">Lớp</th>
                          <th className="px-3 py-2.5">Lượt</th>
                          <th className="px-3 py-2.5">Thắng</th>
                          <th className="px-3 py-2.5">Thua</th>
                          <th className="px-3 py-2.5">Thời gian</th>
                          <th className="px-3 py-2.5">Màn</th>
                          <th className="px-3 py-2.5">Gần nhất</th>
                          <th className="px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-lilac-400/10">
                        {filtered.map((student) => (
                          <tr key={student.id} className="hover:bg-lilac-400/5">
                            <td className="px-4 py-2.5 font-semibold text-white">{student.displayName}</td>
                            <td className="px-3 py-2.5 text-lilac-200">{student.className}</td>
                            <td className="px-3 py-2.5">{student.sessionsCount}</td>
                            <td className="px-3 py-2.5 font-bold text-mint-300">{student.winCount}</td>
                            <td className="px-3 py-2.5 text-rose-300">
                              {student.loseLivesCount + student.loseTimeoutCount} thua
                              {student.loseLivesCount + student.loseTimeoutCount > 0 && (
                                <p className="text-[10px] font-normal text-lilac-300">
                                  mạng {student.loseLivesCount} · giờ {student.loseTimeoutCount}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-lilac-200">{formatDuration(student.totalTimeMs)}</td>
                            <td className="px-3 py-2.5 text-xs text-lilac-200">
                              {(student.levelsPlayed ?? []).length
                                ? (student.levelsPlayed ?? []).map(levelName).join(", ")
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-lilac-300">{timeAgo(student.lastPlayed)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                variant="secondary"
                                className="px-2.5 py-1.5 text-xs"
                                disabled={detailLoadingId === student.id}
                                onClick={() => void openDetail(student)}
                              >
                                {detailLoadingId === student.id ? "Đang tải..." : "Chi tiết"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-lilac-400/10 md:hidden">
                    {filtered.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-lilac-400/5"
                        onClick={() => void openDetail(student)}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{student.displayName}</p>
                          <p className="text-xs text-lilac-300">
                            {student.className} · {student.sessionsCount} lượt · {formatDuration(student.totalTimeMs)}
                          </p>
                          <p className="text-[10px] text-lilac-300/70">Gần nhất {timeAgo(student.lastPlayed)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-mint-300">
                            {student.winCount} thắng
                          </p>
                          <p className="text-[11px] text-rose-300">
                            {student.loseLivesCount + student.loseTimeoutCount} thua
                          </p>
                          {student.loseLivesCount + student.loseTimeoutCount > 0 && (
                            <p className="text-[10px] text-lilac-300">
                              mạng {student.loseLivesCount} · giờ {student.loseTimeoutCount}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <div className="card min-w-0 p-4">
                <h2 className="text-sm font-bold text-white">Tỉ lệ sai theo màn</h2>
                <p className="mb-3 text-[11px] text-lilac-300">Dữ liệu {levelFilterLabel} · toàn bộ học sinh.</p>
                <div className="space-y-2.5">
                  {levelRows.length === 0 && <p className="text-sm text-lilac-300">Chưa có dữ liệu.</p>}
                  {levelRows.map((row) => (
                    <div key={row.level}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate text-lilac-200">
                          {levelName(row.level)} · {levelTopic(row.level)}
                        </span>
                        <span className="shrink-0 font-semibold text-white">
                          {formatPercent(row.wrongRate)}{" "}
                          <span className="font-normal text-lilac-300">
                            ({row.wrong}/{row.attempts})
                          </span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-950">
                        <div
                          className={`h-full rounded-full ${
                            row.wrongRate >= 0.5 ? "bg-rose-400" : row.wrongRate >= 0.25 ? "bg-gold-400" : "bg-mint-400"
                          }`}
                          style={{ width: `${Math.round(row.wrongRate * 100)}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-lilac-300/70">
                        {row.sessions} lượt · thắng {row.wins} · TB {formatDuration(row.avgTimeMs)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card min-w-0 p-4">
                <h2 className="text-sm font-bold text-white">Câu hỏi cần chú ý</h2>
                <p className="mb-3 text-[11px] text-lilac-300">
                  Dữ liệu {levelFilterLabel} · sắp xếp theo tỉ lệ sai giảm dần.
                </p>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {questionRows.map((row) => (
                    <div key={`${row.level}-${row.questionId}`} className="flex items-center justify-between gap-2 rounded-lg bg-ink-950/40 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-lilac-100">{questionLabel(row.questionId)}</p>
                        <p className="text-[10px] text-lilac-300">
                          {levelName(row.level)} · {row.similarAttempts} lượt câu tương tự
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${row.wrongRate >= 0.4 ? "text-rose-300" : "text-gold-300"}`}>
                          {formatPercent(row.wrongRate)}
                        </p>
                        <p className="text-[10px] text-lilac-300">
                          {row.wrong}/{row.attempts} sai
                        </p>
                      </div>
                    </div>
                  ))}
                  {questionRows.length === 0 && <p className="text-sm text-lilac-300">Chưa có dữ liệu.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(detail) || Boolean(detailError)}
        title={detail ? `Chi tiết: ${detail.student.displayName} · ${detail.student.className}` : "Chi tiết học sinh"}
        onClose={() => {
          setDetail(null);
          setDetailError(null);
        }}
        wide
      >
        {detailError && <p className="text-sm text-rose-300">{detailError}</p>}
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-ink-950/50 p-2.5">
                <p className="text-[10px] text-lilac-300">Lượt chơi</p>
                <p className="text-lg font-bold text-white">{detail.student.sessionsCount}</p>
              </div>
              <div className="rounded-lg bg-ink-950/50 p-2.5">
                <p className="text-[10px] text-lilac-300">Lượt thắng</p>
                <p className="text-lg font-bold text-mint-300">{detail.student.winCount}</p>
              </div>
              <div className="rounded-lg bg-ink-950/50 p-2.5">
                <p className="text-[10px] text-lilac-300">Tổng lần sai</p>
                <p className="text-lg font-bold text-rose-300">{detail.student.wrongCount}</p>
              </div>
              <div className="rounded-lg bg-ink-950/50 p-2.5">
                <p className="text-[10px] text-lilac-300">Gần nhất</p>
                <p className="text-xs font-semibold text-lilac-200">{timeAgo(detail.student.lastPlayed)}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-white">Các lượt chơi ({detail.sessions.length})</h3>
              {detail.sessions.length === 0 ? (
                <p className="text-sm text-lilac-300">Chưa có lượt chơi nào.</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {detail.sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-lilac-400/15 bg-ink-950/40 p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={sessionTone(session.result)}>{resultLabel(session.result)}</Badge>
                        <span className="text-xs font-semibold text-lilac-100">{levelName(session.level)}</span>
                        <span className="ml-auto text-[10px] text-lilac-300">{formatDateTime(session.startedAt)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-lilac-300">
                        {formatDuration(session.totalTimeMs)} · qua {session.clearedCount} câu · {session.correctCount} đúng ·{" "}
                        {session.wrongCount} sai
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">Các lượt trả lời ({detail.attempts.length})</h3>
                <Button
                  variant="secondary"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => detailCsv(detail.student, detail.attempts)}
                  disabled={!detail.attempts.length}
                >
                  ⬇ CSV chi tiết
                </Button>
              </div>
              {detail.attempts.length === 0 ? (
                <p className="text-sm text-lilac-300">Học sinh chưa trả lời câu nào.</p>
              ) : (
                <div className="space-y-2">
                  {detail.attempts.map((attempt) => (
                    <details key={attempt.id} className="rounded-xl border border-lilac-400/15 bg-ink-950/40">
                      <summary className="flex cursor-pointer list-none items-center gap-2 p-2.5">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                            attempt.isCorrect ? "bg-mint-400/20 text-mint-300" : "bg-rose-400/20 text-rose-300"
                          }`}
                        >
                          {attempt.isCorrect ? "✓" : "✕"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-lilac-100">
                          {levelName(attempt.level)} · {questionLabel(attempt.questionId)}
                          {attempt.isSimilar ? " · tương tự" : ""}
                        </span>
                        <span className="shrink-0 text-[10px] text-lilac-300">
                          {attempt.livesLeft}❤️ · {(attempt.timeSpentMs / 1000).toFixed(1)}s
                        </span>
                        <span className="shrink-0 text-[10px] text-lilac-300">{formatDateTime(attempt.createdAt)}</span>
                      </summary>
                      <div className="space-y-2 border-t border-lilac-400/10 p-3 text-xs">
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase text-lilac-300">Đề bài</p>
                          <MathText text={attempt.questionText} className="text-lilac-100" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg bg-ink-900/70 p-2">
                            <p className="text-[10px] text-lilac-300">Đã chọn</p>
                            <MathText text={attempt.chosenText || "—"} className="text-white" />
                          </div>
                          <div className="rounded-lg bg-ink-900/70 p-2">
                            <p className="text-[10px] text-lilac-300">Đáp án đúng</p>
                            <MathText text={attempt.correctText} className="text-mint-300" />
                          </div>
                        </div>
                        {attempt.options?.length > 0 && (
                          <details>
                            <summary className="cursor-pointer text-[10px] text-lilac-300">Xem đáp án</summary>
                            <ol className="mt-1 space-y-1">
                              {attempt.options.map((option, index) => (
                                <li
                                  key={index}
                                  className={`rounded px-2 py-1 ${
                                    index === attempt.correctIndex
                                      ? "bg-mint-400/10 text-mint-200"
                                      : index === attempt.chosenIndex
                                        ? "bg-rose-400/10 text-rose-200"
                                        : "text-lilac-200"
                                  }`}
                                >
                                  {String.fromCharCode(65 + index)}. <MathText text={option} />
                                </li>
                              ))}
                            </ol>
                          </details>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-lilac-300">
                          <span>Câu: {attempt.questionId}</span>
                          <span>Thời gian: {formatDuration(attempt.timeSpentMs)}</span>
                          <span>Mạng còn: {attempt.livesLeft}</span>
                          <span>{formatDateTime(attempt.createdAt)}</span>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-white">Lượt chơi</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-lilac-300">
                    <tr>
                      <th className="py-1.5 pr-3">Bắt đầu</th>
                      <th className="py-1.5 pr-3">Màn</th>
                      <th className="py-1.5 pr-3">Kết quả</th>
                      <th className="py-1.5 pr-3">Đúng</th>
                      <th className="py-1.5 pr-3">Sai</th>
                      <th className="py-1.5 pr-3">Thời gian</th>
                      <th className="py-1.5">Kết thúc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-lilac-400/10">
                    {detail.sessions.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1.5 pr-3 text-lilac-200">{formatDateTime(item.startedAt)}</td>
                        <td className="py-1.5 pr-3">{levelName(item.level)}</td>
                        <td className="py-1.5 pr-3">
                          <Badge tone={sessionTone(item.result)}>{resultLabel(item.result)}</Badge>
                        </td>
                        <td className="py-1.5 pr-3 text-mint-300">{item.correctCount}</td>
                        <td className="py-1.5 pr-3 text-rose-300">{item.wrongCount}</td>
                        <td className="py-1.5 pr-3">{formatDuration(item.totalTimeMs)}</td>
                        <td className="py-1.5 text-lilac-300">{item.endedAt ? formatDateTime(item.endedAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </NightScene>
  );
}
