# Kiến trúc QLLH (MVP)

## Repository hiện tại

Next.js 16 App Router + Supabase (Postgres, Auth, RLS). Mã nguồn trong `src/`. Schema SQL nguồn truth: `supabase/complete_setup.sql`. Domain logic nằm ở `src/app/(app)/classes/`, `src/lib/`, `src/types/`.

## Cấu trúc thực tế

```text
src/app/                     # routes, pages, server actions
src/components/              # UI tái sử dụng và shadcn/ui
src/lib/                     # Supabase, validation, aggregation
src/types/                   # TypeScript types
supabase/complete_setup.sql  # schema + RLS + RPC (một file)
docs/                        # quyết định kỹ thuật, deploy
```

Server Components load dữ liệu trang; Server Actions xử lý mutation. Thao tác nhanh (phát biểu, điểm) gọi RPC với `client_request_id` idempotent. RLS là hàng rào bảo mật cuối cùng.

## Review và schema cuối cùng

Model gốc phù hợp, với các thay đổi sau:

| Điều chỉnh | Lý do |
| --- | --- |
| `gender` và `attendance.status` là enum | Chặn giá trị sai, không cần số thực. |
| `classes.grade` là `smallint` (1–12) | Có thể lọc/sắp xếp tin cậy thay vì lưu text tự do. |
| `students` có unique `(id, class_id)` | Cho phép attendance/events dùng FK kép, bảo đảm học sinh thực sự thuộc lớp được ghi nhận. |
| Unique partial cho class name/năm học và student code | Giữ soft-deleted record, nhưng tránh trùng trong dữ liệu đang hoạt động. |
| `client_request_id` trên event/điểm | Retry mạng dùng cùng UUID sẽ idempotent; hai lần tap chủ đích dùng UUID khác. |
| Không thêm bảng counter | Tổng phát biểu/điểm được tính từ lịch sử, tránh counter bị lệch. Có thể thêm materialized aggregate sau khi có số liệu tải thực tế. |

`attendance.class_id`, `weekly_attendance.class_id`, `weekly_evaluations.class_id`, `semester_scores.class_id`, và `annual_scores.class_id` vẫn được lưu để truy vấn theo lớp nhanh, đồng thời FK kép `(student_id, class_id)` ngăn dữ liệu lệch lớp. Luồng chính điểm danh/đánh giá theo **tuần** (`week_number` 1–35); điểm danh theo **ngày** vẫn giữ cho buổi học cũ. Điểm học tập lưu lý thuyết / thực hành và `total_score` là generated column dùng cùng công thức cho HK1 và cuối năm: thiếu thành phần thì 0, đủ hai thành phần thì `ceil(theory_score + practice_score)`. `school_years` là cấp sở hữu năm học; `classes.school_year_id` gắn lớp vào năm.

Khu vực giải trí dùng bảng `entertainment_videos` độc lập, gồm `teacher_id`, tên, mô tả và URL YouTube đã chuẩn hoá về dạng nhúng. Đây không phải học liệu theo khối lớp; RLS chỉ cho phép giáo viên tạo, xem, sửa hoặc xoá bản ghi của chính mình.

## RLS strategy

- Mọi bảng nghiệp vụ đều bật RLS.
- `classes.teacher_id = auth.uid()` là ranh giới sở hữu chính.
- Bảng đánh giá tuần và điểm học tập dùng policy theo lớp cha, giống attendance.
- `students`, `attendance`, `participation_events`, `student_points` chỉ được đọc/ghi khi lớp cha thuộc giáo viên hiện tại và chưa xoá mềm.
- Profile chỉ cho chủ sở hữu đọc/cập nhật; trigger tạo profile khi Auth tạo user.
- `entertainment_videos` chỉ cho phép chủ sở hữu `teacher_id = auth.uid()` đọc và ghi, nên video giải trí của giáo viên không lộ sang giáo viên khác.
- Client dùng anon key, không dùng service-role key. Policies bảo vệ cả khi người dùng sửa URL hay tự tạo request.
- RPC mutation xác minh quyền sở hữu và active student ở database. `SECURITY INVOKER` giữ nguyên ngữ cảnh RLS.

## Tính nguyên tử và retry

`record_participation` và `record_student_points` là một lệnh SQL: kiểm quyền, insert lịch sử và trả về kết quả. Unique `(created_by, client_request_id)` biến retry cùng một thao tác thành no-op. `save_attendance` nhận toàn bộ danh sách, kiểm tra payload và upsert theo unique `(student_id, date)` trong một transaction.

Một double-tap tạo hai request ID vẫn là hai lượt phát biểu có chủ ý theo nghĩa dữ liệu; UI Phase 5 sẽ disable ngắn nút trong lúc gửi và hỗ trợ Undo bằng một event bù trừ, không xoá lịch sử.

## Rủi ro cần theo dõi

- Dữ liệu học sinh là dữ liệu cá nhân: giới hạn PII hiển thị/log, kiểm thử RLS với hai tài khoản trước deploy.
- Time zone: MVP chuẩn hoá mọi ngày và khoảng thời gian báo cáo theo `Asia/Ho_Chi_Minh`, độc lập với timezone của Vercel/browser. Cần bổ sung timezone cho từng lớp nếu mở rộng đa quốc gia.
- Excel có thể chứa ngày và giới tính không chuẩn: Phase 3 cần preview, validate toàn bộ trước import và transactional RPC để không import nửa chừng.
- Báo cáo từ event lịch sử cần index đã có; chỉ tối ưu aggregate khi đo được tải thực tế.
