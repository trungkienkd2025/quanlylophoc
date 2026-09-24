# Schema SQL

Nguồn truth: [`../complete_setup.sql`](../complete_setup.sql) — chạy cho project mới / reset.

Patch bổ sung an toàn (project đã có dữ liệu):

- [`../patch_class_weeks.sql`](../patch_class_weeks.sql) — bảng ngày bắt đầu/kết thúc theo tuần
- [`20260907_repair_entertainment_video_student_access.sql`](./20260907_repair_entertainment_video_student_access.sql) — khôi phục RPC để học sinh xem video giải trí theo mã giáo viên mà không mở quyền đọc trực tiếp bảng video
- [`20260907_z_reload_entertainment_video_rpc.sql`](./20260907_z_reload_entertainment_video_rpc.sql) — làm mới schema cache của Supabase API nếu RPC đã có nhưng cổng học sinh vẫn báo chưa thể tải video
- [`20260910_add_teacher_schedules.sql`](./20260910_add_teacher_schedules.sql) — lưu thời khóa biểu theo tài khoản để đồng bộ giữa các thiết bị
- [`20260916_auto_attendance_from_student_portal.sql`](./20260916_auto_attendance_from_student_portal.sql) — tự ghi Có mặt từ cổng học sinh cho tên/lớp khớp (không phân biệt hoa/thường), chỉ khối 4–5; cần có `class_weeks` từ `patch_class_weeks.sql` để đồng bộ thêm bảng điểm danh tuần
- [`20260916_fix_portal_attendance_class_match.sql`](./20260916_fix_portal_attendance_class_match.sql) — sửa điểm danh cổng học sinh để luôn khớp theo lớp đã nhập; chạy file này sau file điểm danh cổng học sinh ở trên cho project đã có dữ liệu
- [`20260924_add_student_homework_status.sql`](./20260924_add_student_homework_status.sql) — thêm trạng thái nộp bài hiện tại cho từng học sinh
