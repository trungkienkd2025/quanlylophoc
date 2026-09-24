export type StudentGender = "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";

export type HomeworkStatus = "SUBMITTED" | "NOT_SUBMITTED";

export type StudentListItem = {
  id: string;
  student_code: string;
  full_name: string;
  date_of_birth: string | null;
  gender: StudentGender;
  notes: string;
  homework_status: HomeworkStatus | null;
};

export type StudentDetail = StudentListItem & {
  class_id: string;
  created_at: string;
  updated_at: string;
};

export type StudentFormInput = {
  fullName: string;
  studentCode: string;
  dateOfBirth?: string;
  gender?: StudentGender;
  notes?: string;
};

export type ExcelStudentRow = {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  notes: string;
};

export type ExcelRowValidation = ExcelStudentRow & {
  errors: string[];
  isValid: boolean;
};
