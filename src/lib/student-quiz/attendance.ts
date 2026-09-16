/**
 * The class picker controls learning material, while attendance belongs to the
 * class typed by the student. Use an explicit grade at the start of a class
 * name (for example, "5/6", "5A" or "Lớp 5/6") when it is available.
 */
export function resolvePortalAttendanceGrade(className: string, selectedGrade: number) {
  const normalizedClassName = className
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^lop\s*/, "");
  const match = normalizedClassName.match(/^(1[0-2]|[1-9])(?=\D|$)/);
  const classGrade = match ? Number(match[1]) : null;

  return classGrade === 4 || classGrade === 5 ? classGrade : selectedGrade;
}
