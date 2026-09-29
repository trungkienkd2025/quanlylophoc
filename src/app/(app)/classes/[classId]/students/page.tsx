import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ClassStudentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const supabase = await createClient();

  const { data: classItem } = await supabase
    .from("classes")
    .select("id, name, school_year, grade")
    .eq("id", classId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!classItem) notFound();

  const { count: studentCount } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .is("deleted_at", null);

  return (
    <>
      <Link
        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        href={`/classes/${classId}`}
      >
        <ArrowLeft className="size-4" />
        Quay lại lớp {classItem.name}
      </Link>

      <header className="mb-4">
        <p className="text-xs text-muted-foreground">
          Khối {classItem.grade} · Năm học {classItem.school_year}
        </p>
        <h1 className="mt-0.5 text-2xl font-bold">
          Học sinh — {classItem.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {studentCount ?? 0} học sinh đang học
        </p>
      </header>
    </>
  );
}
