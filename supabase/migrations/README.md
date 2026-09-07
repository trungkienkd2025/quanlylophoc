# Schema SQL

Nguồn truth: [`../complete_setup.sql`](../complete_setup.sql) — chạy cho project mới / reset.

Patch bổ sung an toàn (project đã có dữ liệu):

- [`../patch_class_weeks.sql`](../patch_class_weeks.sql) — bảng ngày bắt đầu/kết thúc theo tuần
- [`20260907_repair_entertainment_video_student_access.sql`](./20260907_repair_entertainment_video_student_access.sql) — khôi phục RPC để học sinh xem video giải trí theo mã giáo viên mà không mở quyền đọc trực tiếp bảng video
