type SortableStudent = {
  full_name: string;
  student_code: string;
};

export type StudentSortMode = "name" | "code";

const vietnameseCollator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
});

function getVietnameseNameParts(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean).reverse();
}

export function compareStudentsByName(
  a: Pick<SortableStudent, "full_name">,
  b: Pick<SortableStudent, "full_name">,
) {
  const aParts = getVietnameseNameParts(a.full_name);
  const bParts = getVietnameseNameParts(b.full_name);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const result = vietnameseCollator.compare(
      aParts[index] ?? "",
      bParts[index] ?? "",
    );
    if (result !== 0) return result;
  }

  return vietnameseCollator.compare(a.full_name, b.full_name);
}

export function sortStudents<T extends SortableStudent>(
  students: readonly T[],
  sortMode: StudentSortMode,
) {
  return [...students].sort((a, b) => {
    if (sortMode === "name") return compareStudentsByName(a, b);

    return (
      vietnameseCollator.compare(a.student_code, b.student_code) ||
      compareStudentsByName(a, b)
    );
  });
}
