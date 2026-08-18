"use client";

import { useState, useEffect, useRef } from "react";
import { QuizQuestion, LessonVideo } from "@/types/student-quiz";
import { getQuizQuestions, getLessonVideos, submitQuizResult, verifyTeacherCode } from "@/app/actions/student-quiz";
import { LoginForm } from "./login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpenCheck, Clock, Award,
  ChevronRight, RefreshCw, Check, X, LogIn, ChevronLeft,
  Play, Users, BookOpen, Presentation, FileText, ExternalLink
} from "lucide-react";

interface Props {
  initialQuestions: QuizQuestion[];
  initialVideos?: LessonVideo[];
  returnPath?: string;
}

export function StudentQuizClient({ initialQuestions, initialVideos = [], returnPath }: Props) {
  // Khối lớp học sinh chọn
  const [selectedGrade, setSelectedGrade] = useState<number>(4);

  // Lưu danh sách câu hỏi và học liệu động
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [videos, setVideos] = useState<LessonVideo[]>(initialVideos);

  // Trạng thái chung
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Trạng thái bài làm
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Trạng thái mã Giáo viên phân tách dữ liệu
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [teacherCode, setTeacherCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Đồng bộ hoá dữ liệu localStorage sau khi Client mount thành công
  useEffect(() => {
    const savedTeacherId = localStorage.getItem("qllh.quiz.teacherId");
    const savedTeacherName = localStorage.getItem("qllh.quiz.teacherName");
    const savedTeacherCode = localStorage.getItem("qllh.quiz.teacherCode");
    if (savedTeacherId && savedTeacherName && savedTeacherCode) {
      setTeacherId(savedTeacherId);
      setTeacherName(savedTeacherName);
      setTeacherCode(savedTeacherCode);
    }

    const savedGrade = localStorage.getItem("qllh.quiz.selectedGrade");
    let currentGrade = 4;
    if (savedGrade) {
      currentGrade = parseInt(savedGrade, 10);
      setSelectedGrade(currentGrade);
    }

    const savedName = localStorage.getItem("qllh.quiz.studentName") || "";
    setStudentName(savedName);

    const savedClass = localStorage.getItem("qllh.quiz.className") || "";
    setClassName(savedClass);

    const savedSubmitted = localStorage.getItem("qllh.quiz.isSubmitted") === "true";
    setIsSubmitted(savedSubmitted);
    setIsQuizStarted(savedSubmitted);

    if (savedSubmitted) {
      try {
        const savedAnswers = localStorage.getItem("qllh.quiz.answers");
        if (savedAnswers) {
          setSelectedAnswers(JSON.parse(savedAnswers));
        }
      } catch {
        // ignore
      }
    }

    if (currentGrade !== 4 || savedTeacherId) {
      setIsLoadingData(true);
      Promise.all([
        getQuizQuestions(currentGrade, false, savedTeacherId || undefined),
        getLessonVideos(currentGrade, savedTeacherId || undefined)
      ]).then(([qData, vData]) => {
        setQuestions(qData);
        setVideos(vData);
      }).finally(() => {
        setIsLoadingData(false);
      });
    }
  }, []);

  // Tải danh sách câu hỏi và video tương ứng khi chuyển khối lớp hoặc đổi giáo viên
  useEffect(() => {
    let active = true;
    async function loadGradeData() {
      if (isQuizStarted) return;
      setIsLoadingData(true);
      try {
        const [qData, vData] = await Promise.all([
          getQuizQuestions(selectedGrade, false, teacherId || undefined),
          getLessonVideos(selectedGrade, teacherId || undefined)
        ]);
        if (active) {
          setQuestions(qData);
          setVideos(vData);
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu khối lớp:", err);
      } finally {
        if (active) {
          setIsLoadingData(false);
        }
      }
    }
    loadGradeData();
    return () => {
      active = false;
    };
  }, [selectedGrade, isQuizStarted, teacherId]);

  function handleGradeChange(grade: number) {
    if (isQuizStarted && !isSubmitted) {
      if (!confirm("Em đang làm bài trắc nghiệm. Thay đổi khối lớp sẽ khởi động lại bài tập. Em có đồng ý không?")) {
        return;
      }
    }
    setSelectedGrade(grade);
    setIsQuizStarted(false);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setTimeElapsed(0);
    localStorage.setItem("qllh.quiz.selectedGrade", grade.toString());
    localStorage.removeItem("qllh.quiz.isSubmitted");
    localStorage.removeItem("qllh.quiz.answers");
    localStorage.removeItem("qllh.quiz.score");
  }

  function handleGoHome() {
    if (isQuizStarted && !isSubmitted) {
      if (!confirm("Em đang làm bài tập trắc nghiệm. Thoát ra ngoài sẽ huỷ kết quả bài làm hiện tại. Em có đồng ý không?")) {
        return;
      }
    }
    setIsQuizStarted(false);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setTimeElapsed(0);
    localStorage.removeItem("qllh.quiz.isSubmitted");
    localStorage.removeItem("qllh.quiz.answers");
    localStorage.removeItem("qllh.quiz.score");
  }

  // Bộ đếm thời gian
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Bắt đầu đếm giờ khi bài làm bắt đầu và chưa nộp
  useEffect(() => {
    if (isQuizStarted && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isQuizStarted, isSubmitted]);

  // Định dạng giây thành mm:ss
  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // Click bắt đầu làm bài (yêu cầu điền tên & lớp trước)
  function handleStartQuiz() {
    if (!studentName.trim() || !className.trim()) {
      const element = document.getElementById("student-info-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // Lưu tạm thông tin vào localStorage
    localStorage.setItem("qllh.quiz.studentName", studentName);
    localStorage.setItem("qllh.quiz.className", className);

    setIsQuizStarted(true);
    setTimeElapsed(0);
  }

  // Chọn đáp án
  function handleSelectOption(optionIndex: number) {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIdx]: optionIndex
    }));
  }

  // Chuyển câu tiếp theo hoặc lùi lại
  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    }
  }

  function handlePrev() {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  }

  // Xác thực mã giáo viên
  async function handleVerifyCode() {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setCodeError("Vui lòng nhập mã code.");
      return;
    }
    setIsValidatingCode(true);
    setCodeError(null);
    try {
      const res = await verifyTeacherCode(clean);
      if (res.success && res.teacherId && res.teacherName) {
        setTeacherId(res.teacherId);
        setTeacherName(res.teacherName);
        setTeacherCode(clean);
        localStorage.setItem("qllh.quiz.teacherId", res.teacherId);
        localStorage.setItem("qllh.quiz.teacherName", res.teacherName);
        localStorage.setItem("qllh.quiz.teacherCode", clean);

        // Tải câu hỏi và học liệu mới theo giáo viên này
        const [qData, vData] = await Promise.all([
          getQuizQuestions(selectedGrade, false, res.teacherId),
          getLessonVideos(selectedGrade, res.teacherId)
        ]);
        setQuestions(qData);
        setVideos(vData);
      } else {
        setCodeError(res.error || "Mã code của giáo viên không chính xác.");
      }
    } catch {
      setCodeError("Có lỗi xảy ra khi xác thực.");
    } finally {
      setIsValidatingCode(false);
    }
  }

  // Đổi Giáo viên / mã lớp
  function handleResetCode() {
    if (confirm("Em có chắc chắn muốn đổi mã lớp / giáo viên khác? Thông tin bài tập hiện tại sẽ thay đổi.")) {
      setTeacherId(null);
      setTeacherName(null);
      setTeacherCode(null);
      setInputCode("");
      setCodeError(null);
      localStorage.removeItem("qllh.quiz.teacherId");
      localStorage.removeItem("qllh.quiz.teacherName");
      localStorage.removeItem("qllh.quiz.teacherCode");

      // Reset trạng thái bài tập
      setIsQuizStarted(false);
      setIsSubmitted(false);
      setSelectedAnswers({});
      setCurrentIdx(0);
      setTimeElapsed(0);
    }
  }

  // Nộp bài
  async function handleSubmitQuiz() {
    if (Object.keys(selectedAnswers).length < questions.length) {
      if (!confirm("Em chưa trả lời hết các câu hỏi. Em vẫn muốn nộp bài chứ?")) {
        return;
      }
    }

    // Tính điểm
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    // Gửi kết quả lên database lưu trữ
    await submitQuizResult(studentName, className, correctCount, questions.length, teacherId || undefined);

    // Lưu trạng thái hoàn thành vào browser
    localStorage.setItem("qllh.quiz.isSubmitted", "true");
    localStorage.setItem("qllh.quiz.answers", JSON.stringify(selectedAnswers));
    localStorage.setItem("qllh.quiz.score", correctCount.toString());

    setIsSubmitted(true);
  }

  // Làm lại bài tập
  function handleRetake() {
    if (confirm("Em có muốn làm lại bài tập trắc nghiệm này không?")) {
      setSelectedAnswers({});
      setIsSubmitted(false);
      setIsQuizStarted(false);
      setCurrentIdx(0);
      setTimeElapsed(0);

      localStorage.removeItem("qllh.quiz.isSubmitted");
      localStorage.removeItem("qllh.quiz.answers");
      localStorage.removeItem("qllh.quiz.score");
    }
  }

  // Tính toán kết quả thống kê
  const score = questions.reduce((sum, q, idx) => {
    return selectedAnswers[idx] === q.correctAnswer ? sum + 1 : sum;
  }, 0);
  const correctCount = score;
  const incorrectCount = questions.length - correctCount;
  const scorePercentage = Math.round((correctCount / questions.length) * 100);

  // Đánh giá bài thi
  let evaluationTitle = "Hãy cố gắng thêm!";
  let evaluationEmoji = "💪";
  let evaluationColor = "text-rose-600 bg-rose-50 border-rose-200";

  if (scorePercentage >= 80) {
    evaluationTitle = "Rất tốt!";
    evaluationEmoji = "🎉";
    evaluationColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
  } else if (scorePercentage >= 60) {
    evaluationTitle = "Khá tốt!";
    evaluationEmoji = "👍";
    evaluationColor = "text-amber-600 bg-amber-50 border-amber-200";
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-bold antialiased pb-16">

      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-sky-100 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div onClick={handleGoHome} className="flex items-center gap-2 cursor-pointer select-none hover:opacity-90 active:scale-98 transition-all">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <BookOpenCheck className="size-5" />
            </div>
            <div>
              <p className="text-base font-extrabold text-primary">Kiến thức tin học</p>
              <p className="text-[10px] text-muted-foreground font-normal">Kết nối tri thức với cuộc sống</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {teacherName && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border px-2.5 py-1 rounded-xl font-bold">
                <span>Lớp của: <strong className="text-slate-900 font-extrabold">{teacherName}</strong></span>
                <span className="text-slate-300">|</span>
                <button onClick={handleResetCode} className="text-rose-600 hover:text-rose-700 font-extrabold cursor-pointer">Đổi mã lớp</button>
              </div>
            )}
            <Button
              onClick={() => setShowLoginModal(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold border-sky-200 text-sky-700 hover:bg-sky-50"
            >
              <LogIn className="size-3.5" />
              Đăng nhập Giáo viên
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="mx-auto max-w-4xl px-4 pt-6 space-y-8">
        {!teacherId ? (
          <section className="max-w-md mx-auto space-y-6 pt-10">
            <Card className="border-2 border-sky-300 bg-white shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-sky-500 p-6 text-white text-center space-y-2">
                <div className="grid size-12 place-items-center rounded-full bg-white/20 mx-auto">
                  <BookOpen className="size-6 text-white" />
                </div>
                <h3 className="text-xl font-black">Nhập mã lớp học</h3>
                <p className="text-xs text-sky-100 font-normal">Nhập mã code từ Giáo viên của em để làm bài tập và xem bài giảng</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherCode" className="font-extrabold text-sky-950">Mã code Giáo viên</Label>
                  <Input
                    id="teacherCode"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                    placeholder="Ví dụ: A1B2C3"
                    className="h-12 text-center text-lg font-black tracking-widest uppercase border-sky-200 focus:border-sky-500 focus:ring-sky-500 rounded-xl"
                  />
                  {codeError && (
                    <p className="text-xs text-rose-600 font-semibold">{codeError}</p>
                  )}
                </div>

                <Button
                  onClick={handleVerifyCode}
                  disabled={isValidatingCode}
                  className="w-full h-12 text-base font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow border-b-4 border-emerald-700 active:border-b-0 active:mt-1 transition-all"
                >
                  {isValidatingCode ? "Đang xác thực..." : "Vào lớp học 🚀"}
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : (
          <>
            {/* Mobile teacher info banner */}
            {teacherName && (
              <div className="flex md:hidden items-center justify-between gap-1.5 text-xs text-slate-700 bg-white border border-sky-100 p-3 rounded-2xl shadow-sm">
                <span>Giáo viên: <strong className="text-slate-900 font-extrabold">{teacherName}</strong></span>
                <button onClick={handleResetCode} className="text-rose-600 hover:text-rose-700 font-extrabold cursor-pointer">Đổi mã lớp</button>
              </div>
            )}

            {/* BỘ CHỌN KHỐI LỚP CHO HỌC SINH */}
            {!isQuizStarted && (
              <section className="bg-white border border-sky-100 rounded-3xl p-5 shadow-sm text-center space-y-4">
                <h2 className="text-lg font-black text-sky-950 flex items-center justify-center gap-2">
                  🎒 Chọn Khối lớp của em để học và làm bài tập
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((g) => {
                    const isActive = selectedGrade === g;
                    const emoji = g === 1 ? "🎒" : g === 2 ? "✏️" : g === 3 ? "📐" : g === 4 ? "💻" : "🚀";
                    return (
                      <button
                        key={g}
                        onClick={() => handleGradeChange(g)}
                        className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 text-base font-extrabold shadow-sm transition-all duration-200 cursor-pointer ${isActive
                          ? "bg-primary text-white border-primary scale-105"
                          : "bg-white text-slate-700 border-sky-100 hover:border-sky-300 hover:bg-sky-50"
                          }`}
                      >
                        <span className="text-xl">{emoji}</span>
                        <span>Khối {g}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {!isQuizStarted ? (
              isLoadingData ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white border border-sky-100 rounded-3xl p-8 shadow-sm w-full">
                  <RefreshCw className="size-10 text-sky-500 animate-spin" />
                  <p className="text-slate-500 font-bold text-sm">Đang tải câu hỏi và học liệu bài học...</p>
                </div>
              ) : (
                <>
                  {/* HERO SECTION */}
                  <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 p-6 text-white shadow-xl sm:p-10">
                    <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute left-0 bottom-0 -ml-16 -mb-16 size-64 rounded-full bg-indigo-500/30 blur-2xl" />

                    <div className="relative z-10 space-y-6 max-w-2xl">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
                        ✨ Luyện tập trực tuyến
                      </span>
                      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                        Bài tập Kiến thức tin học
                      </h1>
                      <p className="text-lg sm:text-xl font-medium text-sky-100 drop-shadow-sm leading-relaxed">
                        Học vui – Luyện tập dễ – Kiểm tra ngay!
                      </p>

                      {/* Metadata badges - Cố định hiển thị ngang hàng đẹp mắt */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] sm:text-xs font-semibold">
                        <span className="bg-white/15 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">📚 Môn: Tin học</span>
                        <span className="bg-white/15 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">🎓 Lớp: {selectedGrade}</span>
                        <span className="bg-white/15 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">📖 Sách: Kết nối tri thức</span>
                        <span className="bg-white/15 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">📝 Số câu: {questions.length} câu</span>
                        <span className="bg-white/15 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">⏱️ Thời gian: 15 phút</span>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-4">
                        <Button
                          onClick={() => {
                            const element = document.getElementById("student-info-section");
                            if (element) element.scrollIntoView({ behavior: "smooth" });
                          }}
                          size="lg"
                          className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold h-12 px-6 rounded-2xl shadow-lg border-b-4 border-orange-700 active:border-b-0 active:mt-1 transition-all"
                        >
                          Bắt đầu làm bài
                        </Button>
                        <a href="#video-lessons">
                          <Button
                            variant="outline"
                            size="lg"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-extrabold h-12 px-6 rounded-2xl backdrop-blur-sm"
                          >
                            Học liệu số
                          </Button>
                        </a>
                      </div>
                    </div>
                  </section>

                  {/* SECTION: THÔNG TIN BÀI TẬP & MỤC TIÊU */}
                  <section className="grid gap-6 md:grid-cols-5">

                    {/* Thẻ thông tin */}
                    <Card className="md:col-span-2 border-sky-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-sky-950 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <BookOpen className="size-5 text-sky-500" />
                          📚 Thông tin bài tập
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between"><span className="text-slate-500 font-normal">Môn học:</span><span className="text-slate-900 font-bold">Tin học</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 font-normal">Khối:</span><span className="text-slate-900 font-bold">Lớp {selectedGrade}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 font-normal">Bộ sách:</span><span className="text-slate-900 font-bold">Kết nối tri thức</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 font-normal">Chủ đề:</span><span className="text-slate-900 font-bold text-right max-w-[180px]">Luyện tập tổng hợp</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 font-normal">Số câu hỏi:</span><span className="text-slate-900 font-bold">{questions.length} câu</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 font-normal">Thời gian làm:</span><span className="text-slate-900 font-bold">15 phút</span></div>
                          <div className="flex justify-between"><span className="text-slate-500 font-normal">Hình thức:</span><span className="text-slate-900 font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">Trắc nghiệm</span></div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Mục tiêu học tập */}
                    <Card className="md:col-span-3 border-sky-100 shadow-sm rounded-3xl bg-white">
                      <CardContent className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-sky-950 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Award className="size-5 text-sky-500" />
                          🎯 Mục tiêu bài học
                        </h3>
                        <p className="text-xs text-muted-foreground font-normal -mt-2">Sau khi hoàn thành bài tập này, học sinh có thể:</p>
                        <ul className="space-y-2 text-sm text-slate-800 font-semibold list-disc list-inside">
                          <li>Củng cố kiến thức Tin học theo chương trình lớp {selectedGrade}.</li>
                          <li>Rèn luyện tư duy logic và kỹ năng thực hành máy tính.</li>
                          <li>Phát triển tinh thần tự học và tự đánh giá năng lực.</li>
                          <li>Nâng cao khả năng sử dụng thiết bị số an toàn, lành mạnh.</li>
                          <li>Vận dụng kiến thức vào thực tế học tập hàng ngày.</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </section>

                  {/* DÀNH CHO HỌC SINH ĐIỀN TÊN & LỚP */}
                  <section id="student-info-section" className="scroll-mt-20">
                    <Card className="border-2 border-sky-300 bg-white shadow-lg rounded-3xl overflow-hidden max-w-xl mx-auto">
                      <div className="bg-sky-500 p-4 text-white text-center">
                        <h3 className="text-lg font-extrabold flex items-center justify-center gap-2">
                          <Users className="size-5" />
                          Nhập thông tin để làm bài
                        </h3>
                      </div>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="sName" className="font-extrabold text-sky-950">Họ và tên của em</Label>
                          <Input
                            id="sName"
                            value={studentName}
                            onChange={e => setStudentName(e.target.value)}
                            placeholder="Ví dụ: Nguyễn Văn An"
                            className="h-12 text-base font-bold border-sky-200 focus:border-sky-500 focus:ring-sky-500 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sClass" className="font-extrabold text-sky-950">Lớp học</Label>
                          <Input
                            id="sClass"
                            value={className}
                            onChange={e => setClassName(e.target.value)}
                            placeholder={`Ví dụ: ${selectedGrade}A1`}
                            className="h-12 text-base font-bold border-sky-200 focus:border-sky-500 focus:ring-sky-500 rounded-xl"
                          />
                        </div>

                        <Button
                          onClick={handleStartQuiz}
                          className="w-full h-12 text-base font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow border-b-4 border-emerald-700 active:border-b-0 active:mt-1 transition-all"
                        >
                          Bắt đầu làm bài trắc nghiệm 🚀
                        </Button>
                      </CardContent>
                    </Card>
                  </section>

                  {/* SECTION VIDEO BÀI HỌC */}
                  <section id="video-lessons" className="space-y-4 scroll-mt-20">
                    <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                      <Play className="size-6 text-sky-500" />
                      🎬 Học liệu số: Các bài giảng vui nhộn
                    </h2>
                    {videos.length === 0 ? (
                      <Card className="border-sky-100 shadow-sm rounded-3xl bg-white p-8 text-center text-muted-foreground font-normal">
                        Chưa có video bài học nào cho khối {selectedGrade}. Giáo viên có thể thêm video trong trang quản lý.
                      </Card>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                        {videos.map((video, idx) => {
                          const isYouTube = video.youtubeUrl.includes("youtube.com") || video.youtubeUrl.includes("youtu.be");
                          const isGoogleSlides = video.youtubeUrl.includes("docs.google.com/presentation");

                          return (
                            <Card key={video.id || idx} className="border-sky-100 shadow-sm rounded-3xl overflow-hidden bg-white flex flex-col hover:-translate-y-1 transition-transform duration-200">
                              <div className="aspect-video w-full relative bg-slate-100 border-b border-sky-50 flex items-center justify-center overflow-hidden">
                                {isYouTube ? (
                                  <iframe
                                    src={video.youtubeUrl}
                                    title={video.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : isGoogleSlides ? (
                                  <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex flex-col items-center justify-center p-4 text-white text-center">
                                    <Presentation className="size-12 mb-2 animate-bounce" />
                                    <span className="text-sm font-black uppercase tracking-wider">Bài giảng Slides</span>
                                    <span className="text-[10px] opacity-80 font-normal">Click bên dưới để xem</span>
                                  </div>
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4 text-white text-center">
                                    <FileText className="size-12 mb-2" />
                                    <span className="text-sm font-black uppercase tracking-wider">Tài liệu học tập</span>
                                    <span className="text-[10px] opacity-80 font-normal">Click bên dưới để xem</span>
                                  </div>
                                )}
                              </div>
                              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <h4 className="font-bold text-slate-900 text-base leading-snug">{video.title}</h4>
                                  <p className="text-xs text-muted-foreground font-normal mt-2 line-clamp-2">{video.description}</p>
                                </div>
                                <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                                  <Button variant="outline" size="sm" className="w-full text-xs font-bold border-sky-100 text-sky-600 hover:bg-sky-50 rounded-xl gap-1">
                                    {isYouTube ? "Xem trên YouTube" : isGoogleSlides ? "Xem bài giảng Slides 📝" : "Mở tài liệu học tập 📖"}
                                    <ExternalLink className="size-3" />
                                  </Button>
                                </a>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )
            ) : (

              /* KHI ĐÃ BẮT ĐẦU LÀM BÀI */
              <div className="space-y-6">

                {/* Thanh tiến độ bài thi */}
                <Card className="border-sky-100 shadow-sm rounded-3xl bg-white">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-extrabold">
                        Học sinh: {studentName} - Lớp: {className}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-800">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Clock className="size-4 text-sky-500 animate-pulse" />
                        {formatTime(timeElapsed)}
                      </span>
                      {!isSubmitted && (
                        <Button
                          onClick={handleSubmitQuiz}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-5 py-2 rounded-xl shadow border-b-2 border-emerald-700 text-sm active:border-0"
                        >
                          Nộp bài kiểm tra
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* MÀN HÌNH KẾT QUẢ SAU KHI NỘP BÀI */}
                {isSubmitted && (
                  <Card className={`border-2 rounded-3xl shadow-lg overflow-hidden ${evaluationColor}`}>
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="text-5xl">{evaluationEmoji}</div>
                      <h2 className="text-3xl font-extrabold">Hoàn thành bài kiểm tra!</h2>
                      <p className="text-xl font-bold">
                        Kết quả của em: <span className="text-3xl font-black">{score} / {questions.length}</span> điểm
                      </p>

                      {/* Đánh giá */}
                      <div className="inline-block px-5 py-2 rounded-full border bg-white shadow-sm font-extrabold text-lg">
                        {evaluationTitle}
                      </div>

                      <div className="grid gap-2 max-w-xs mx-auto text-sm text-slate-800 pt-2 text-left bg-white/50 backdrop-blur-sm p-4 rounded-2xl border">
                        <div>✅ Số câu đúng: <span className="font-bold">{correctCount}</span></div>
                        <div>❌ Số câu sai: <span className="font-bold">{incorrectCount}</span></div>
                        <div>🎯 Tỷ lệ đúng: <span className="font-bold">{scorePercentage}%</span></div>
                        <div>⏱️ Thời gian hoàn thành: <span className="font-bold">{formatTime(timeElapsed)}</span></div>
                      </div>

                      <div className="flex justify-center gap-3 pt-3">
                        <Button
                          onClick={handleRetake}
                          className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-2xl h-11 px-5"
                        >
                          <RefreshCw className="size-4 mr-1.5" />
                          Làm bài lại
                        </Button>
                        <a href="#video-lessons-submitted">
                          <Button variant="outline" className="border-sky-200 text-sky-700 bg-white hover:bg-sky-50 rounded-2xl h-11 px-5">
                            Học liệu số
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CHƠI QUIZ - HIỂN THỊ CÂU HỎI */}
                {!isSubmitted ? (
                  <div className="space-y-4">
                    {/* Câu hỏi hiện tại */}
                    <Card className="border-sky-200 shadow-md rounded-3xl overflow-hidden bg-white">
                      <div className="bg-sky-500 px-6 py-3.5 text-white flex justify-between items-center">
                        <span className="font-extrabold text-sm sm:text-base">
                          Câu hỏi {currentIdx + 1} trên {questions.length}
                        </span>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          Mức độ: Dễ thương 🐱
                        </span>
                      </div>

                      <CardContent className="p-6 sm:p-8 space-y-6">
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                          {questions[currentIdx]?.question}
                        </h2>

                        {/* Danh sách 4 đáp án */}
                        <div className="grid gap-3">
                          {questions[currentIdx]?.options.map((optionText, idx) => {
                            const isSelected = selectedAnswers[currentIdx] === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectOption(idx)}
                                className={`w-full p-4 text-left rounded-2xl border-2 font-bold text-base transition-all flex items-center gap-3 cursor-pointer ${isSelected
                                  ? "bg-sky-50 border-sky-500 text-sky-900 shadow-sm"
                                  : "bg-white border-slate-100 hover:border-sky-200 text-slate-800"
                                  }`}
                              >
                                <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black border transition-colors ${isSelected
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-100 text-slate-600"
                                  }`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="font-bold">{optionText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Điều khiển lùi / tiến */}
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={handlePrev}
                        disabled={currentIdx === 0}
                        variant="outline"
                        className="gap-1.5 font-bold rounded-xl border-sky-100"
                      >
                        <ChevronLeft className="size-4" />
                        Quay lại
                      </Button>

                      {currentIdx < questions.length - 1 ? (
                        <Button
                          onClick={handleNext}
                          disabled={selectedAnswers[currentIdx] === undefined}
                          className="gap-1.5 font-bold rounded-xl bg-sky-500 hover:bg-sky-600 text-white"
                        >
                          Câu tiếp theo
                          <ChevronRight className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubmitQuiz}
                          className="gap-1.5 font-extrabold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          Nộp bài tập
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (

                  /* ĐÃ NỘP BÀI - REVIEW TỪNG CÂU HỎI */
                  <div className="space-y-6 pt-4">
                    <h3 className="text-xl font-extrabold text-slate-800 pb-2 border-b">
                      🔍 Xem lại kết quả chi tiết:
                    </h3>

                    {questions.map((q, idx) => {
                      const studentChoice = selectedAnswers[idx];
                      const isCorrect = studentChoice === q.correctAnswer;

                      return (
                        <Card key={q.id || idx} className="border-sky-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                          <div className="bg-slate-50 px-5 py-3 border-b flex items-center justify-between">
                            <span className="bg-sky-100 text-sky-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                              Câu hỏi {idx + 1}
                            </span>
                            {isCorrect ? (
                              <span className="flex items-center gap-1 text-emerald-600 text-sm font-extrabold">
                                Đúng rồi ✅
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-600 text-sm font-extrabold">
                                Chưa đúng ❌
                              </span>
                            )}
                          </div>

                          <CardContent className="p-5 space-y-4">
                            <h4 className="text-base font-bold text-slate-900">{q.question}</h4>

                            {/* Các lựa chọn review */}
                            <div className="grid gap-2 text-sm">
                              {q.options.map((optionText, optIdx) => {
                                const isChosen = studentChoice === optIdx;
                                const isCorrectOpt = q.correctAnswer === optIdx;

                                let optStyle = "bg-white border-slate-100 text-slate-700";
                                let iconBadge = null;

                                if (isCorrectOpt) {
                                  optStyle = "bg-emerald-50 border-emerald-300 text-emerald-800";
                                  iconBadge = <Check className="size-3.5 text-emerald-600" />;
                                } else if (isChosen && !isCorrect) {
                                  optStyle = "bg-rose-50 border-rose-300 text-rose-800";
                                  iconBadge = <X className="size-3.5 text-rose-600" />;
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-3 rounded-xl border font-bold flex items-center justify-between ${optStyle}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${isCorrectOpt
                                        ? "bg-emerald-500 text-white"
                                        : isChosen
                                          ? "bg-rose-500 text-white"
                                          : "bg-slate-100 text-slate-600"
                                        }`}>
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span>{optionText}</span>
                                    </div>
                                    {iconBadge}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Thẻ giải thích */}
                            <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 text-sm text-slate-700">
                              <span className="font-extrabold text-sky-950 block mb-1">💡 Lời giải thích:</span>
                              <p className="font-normal text-slate-800 leading-relaxed">{q.explanation}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Video section after submission */}
                    <section id="video-lessons-submitted" className="space-y-4 pt-4">
                      <h2 className="text-xl font-extrabold text-slate-800">
                        🎬 Em xem học liệu số để hiểu sâu hơn nhé:
                      </h2>
                      {videos.length === 0 ? (
                        <Card className="border-sky-100 shadow-sm rounded-3xl bg-white p-8 text-center text-muted-foreground font-normal">
                          Chưa có video bài học nào cho khối {selectedGrade}.
                        </Card>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                          {videos.map((video, idx) => {
                            const isYouTube = video.youtubeUrl.includes("youtube.com") || video.youtubeUrl.includes("youtu.be");
                            const isGoogleSlides = video.youtubeUrl.includes("docs.google.com/presentation");

                            return (
                              <Card key={video.id || idx} className="border-sky-100 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col justify-between">
                                <div className="aspect-video w-full relative bg-slate-100 flex items-center justify-center overflow-hidden border-b">
                                  {isYouTube ? (
                                    <iframe
                                      src={video.youtubeUrl}
                                      title={video.title}
                                      className="w-full h-full"
                                      allowFullScreen
                                    />
                                  ) : isGoogleSlides ? (
                                    <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex flex-col items-center justify-center p-4 text-white text-center">
                                      <Presentation className="size-8 mb-1" />
                                      <span className="text-xs font-black uppercase tracking-wider">Bài giảng Slides</span>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-4 text-white text-center">
                                      <FileText className="size-8 mb-1" />
                                      <span className="text-xs font-black uppercase tracking-wider">Tài liệu</span>
                                    </div>
                                  )}
                                </div>
                                <CardContent className="p-3 flex-1 flex flex-col justify-between">
                                  <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">{video.title}</h4>
                                  <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                                    <Button variant="outline" size="sm" className="w-full text-xs font-bold border-sky-100 text-sky-600 hover:bg-sky-50 rounded-xl gap-1">
                                      {isYouTube ? "Xem YouTube" : isGoogleSlides ? "Xem Slides" : "Mở tài liệu"}
                                      <ExternalLink className="size-3" />
                                    </Button>
                                  </a>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* CTA CUỐI TRANG */}
      {!isQuizStarted && (
        <section className="bg-sky-100 border-t border-sky-200 mt-12 py-10 text-center space-y-4">
          <div className="max-w-md mx-auto px-4 space-y-3">
            <h2 className="text-2xl font-extrabold text-sky-950">🎯 Sẵn sàng thử sức?</h2>
            <p className="text-sm text-sky-900 font-normal">Hãy làm bài tập trắc nghiệm và xem em đạt được bao nhiêu điểm nhé!</p>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="mt-12 text-center text-xs text-muted-foreground font-normal px-4">
        <p>© 2026 – Hệ thống Quản lý lớp học.</p>
        <p className="mt-1">Đồng hành cùng giáo viên trong quản lý và nâng cao chất lượng học tập.</p>
      </footer>

      {/* 3. ĐĂNG NHẬP GIÁO VIÊN DIALOG MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-sky-100 sm:p-9 relative scale-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <BookOpenCheck aria-hidden="true" />
              </div>
              <div>
                <p className="text-xl font-black text-primary">QLLH</p>
                <p className="text-xs text-muted-foreground font-normal">Đăng nhập cổng Giáo viên</p>
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Chào cô/thầy 👋</h1>
            <p className="mb-5 mt-1 text-sm text-muted-foreground font-normal">Đăng nhập để quản lý lớp học và sửa đổi câu hỏi.</p>

            <LoginForm next={returnPath} />
          </div>
        </div>
      )}
    </div>
  );
}
