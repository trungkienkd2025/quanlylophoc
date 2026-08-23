-- Đồng bộ công thức tổng điểm học tập cho HK1 và Cuối năm.
-- An toàn với dữ liệu hiện tại: total_score là dữ liệu suy ra từ theory_score + practice_score,
-- nên chỉ tái tạo cột generated; điểm thành phần hiện có không bị thay đổi.

begin;

alter table public.semester_scores
  drop column if exists total_score;

alter table public.semester_scores
  add column total_score numeric(4,2) generated always as (
    case
      when theory_score is null or practice_score is null then 0
      else ceil(theory_score + practice_score)
    end
  ) stored;

alter table public.annual_scores
  drop column if exists total_score;

alter table public.annual_scores
  add column total_score numeric(4,2) generated always as (
    case
      when theory_score is null or practice_score is null then 0
      else ceil(theory_score + practice_score)
    end
  ) stored;

commit;
