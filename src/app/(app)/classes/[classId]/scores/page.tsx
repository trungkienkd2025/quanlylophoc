import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ScoreBoard } from "./score-board";

export default async function ScoresPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const supabase = await createClient();
  const { data: classItem } = await supabase
    .from("classes")
    .select("id, name, school_year")
    .eq("id", classId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!classItem) notFound();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, student_code")
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("full_name");
  const { data: semesterScores } = await supabase
    .from("semester_scores")
    .select("student_id, theory_score, practice_score, total_score")
    .eq("class_id", classId);
  const { data: annualScores } = await supabase
    .from("annual_scores")
    .select("student_id, theory_score, practice_score, total_score")
    .eq("class_id", classId);
  return (
    <>
      <Link
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href={`/classes/${classId}`}
      >
        <ArrowLeft className="size-4" />
        Quay lại lớp
      </Link>
      <header className="mb-4">
        <p className="text-xs text-muted-foreground">{classItem.school_year}</p>
        <h1 className="text-2xl font-bold">Điểm học tập · {classItem.name}</h1>
      </header>
      <ScoreBoard
        annualScores={annualScores ?? []}
        classId={classId}
        className={classItem.name}
        schoolYear={classItem.school_year}
        semesterScores={semesterScores ?? []}
        students={students ?? []}
      />
    </>
  );
}
