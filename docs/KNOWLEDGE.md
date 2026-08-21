# QLLH — Project Knowledge (Business + Tech)

> File này là nguồn truth chung cho người và AI tiếp nhận source code.
> Đọc file này trước khi sửa code, thêm feature, hoặc viết tài liệu.
> Chi tiết deploy: [DEPLOYMENT.md](./DEPLOYMENT.md). Chi tiết kiến trúc DB/RLS: [architecture.md](./architecture.md).

---

## 1. Sản phẩm là gì

**QLLH** là web app giúp **giáo viên tiểu học** quản lý lớp học: học sinh, điểm danh, phát biểu, điểm thi đua, báo cáo, import/export Excel.

- **Người dùng chính:** giáo viên tiểu học, không biết lập trình.
- **Ngôn ngữ UI & tài liệu giáo viên:** tiếng Việt.
- **Code / tên biến / commit:** tiếng Anh được phép.
- **Tagline:** Quản lý lớp học đơn giản hơn.
- **Ưu tiên sản phẩm:** ít click → xong việc nhanh → dễ dùng → dễ bảo trì → an toàn dữ liệu → (sau đó mới) scale.

### Nguyên tắc UX cốt lõi

> Giáo viên hoàn thành công việc nhanh nhất với số click ít nhất.

Ví dụ đúng: Chuyên cần → chọn ngày → chạm học sinh nghỉ → Lưu.  
Ví dụ sai: Học sinh → Chi tiết → Chuyên cần → Ngày → Sửa → Lưu.

Copy lỗi phải tiếng Việt thân thiện (`Không thể lưu dữ liệu. Vui lòng thử lại.`), không lộ stack/Prisma/Supabase error cho end user.

---

## 2. Đối tượng & phạm vi

### MVP hiện tại — role duy nhất

**Teacher (giáo viên)** sở hữu lớp của mình. Giáo viên A không xem/sửa dữ liệu giáo viên B.

### Có thể mở rộng sau (chưa implement)

School Admin, Principal, Parent, Student portal, multi-school, thông báo, Zalo, AI assistant, học phí, thời khóa biểu, bài tập, giáo án.

**Không** implement feature “hay” nếu chưa nằm trong scope đã thống nhất.

---

## 3. Trạng thái thực tế vs tầm nhìn gốc

Master prompt gốc mô tả stack NestJS + Prisma + Docker Postgres + điểm môn học + nhận xét + enrollment đa năm. **Repo này đã chọn hướng khác và đang chạy theo hướng đó.**

| Hạng mục | Trong repo hiện tại (source of truth) | Tầm nhìn / backlog (chưa có hoặc khác) |
| --- | --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui (Base UI), Zod | — |
| Backend | Server Components + Server Actions + Supabase RPC | NestJS / REST API riêng |
| DB | Supabase PostgreSQL + migrations SQL | Prisma + Docker Compose local Postgres |
| Auth | Supabase Auth (email/password), session cookie qua `@supabase/ssr` | JWT tự host / Nest auth |
| Bảo mật dữ liệu | **RLS** theo `classes.teacher_id = auth.uid()` | App-layer authz only |
| UX ưu tiên | **Mobile-first** (điện thoại / tablet trên lớp) | Desktop-first trong master prompt |
| Học sinh | Gắn `class_id` trực tiếp + soft delete | Entity `Enrollment` theo năm học |
| Năm học | Bảng `school_years` + `classes.school_year_id` (+ text `school_year` tương thích). UI sort theo năm bắt đầu (mới→cũ), không theo `created_at`. Form thêm năm: picker `2026-2027`…`2040-2041`, mặc định `2026-2027`; validate `YYYY-(YYYY+1)`. | Enrollment đa năm phức tạp |
| Điểm danh | `weekly_attendance` theo tuần 1–35 (luồng chính); `attendance` theo ngày vẫn còn | — |
| Đánh giá tuần | `weekly_evaluations` (level text + comment; gợi ý UI không hard-code DB) | Catalog mức đánh giá theo trường |
| Phát biểu | `participation_events` (+1 / undo -1), idempotent `client_request_id` | Không có trong master prompt gốc |
| Điểm thi đua | `student_points` (±1/2/5…), idempotent | Khác “điểm môn học 0–10” |
| Điểm học tập HK1/cuối năm | `semester_scores`, `annual_scores` (lý thuyết, thực hành, tổng tự tính) | Subject CRUD / công thức nâng cao |
| Phụ huynh entity | **Chưa có** (chỉ notes trên học sinh) | Parent CRUD |
| Excel | Import học sinh (preview + validate + RPC transactional) | Export nhiều loại + template đầy đủ parent fields |
| Demo seed one-command | Seed SQL mẫu (`supabase/seed.demo.sql`); tạo user qua Supabase Dashboard | `npm run setup` + Docker + demo password cố định |
| Tài liệu giáo viên zero-install | README + DEPLOYMENT (cần Node + Supabase) | SETUP.md full cho máy trống |

Khi conflict giữa master prompt và code/docs trong repo: **ưu tiên code + file này + architecture.md**.

---

## 4. MVP đã có (được phép coi là “shipped” khi đã test)

1. **Auth:** login / logout (Supabase).
2. **Lớp:** tạo lớp (tên, năm học, khối 1–12), soft delete, ownership theo giáo viên.
3. **Học sinh:** CRUD, soft delete, unique `student_code` trong lớp (active), form tối giản.
4. **Import Excel:** download mẫu → upload → preview/validate → confirm → RPC import atomic.
5. **Điểm danh theo tuần (luồng chính):** 35 tuần / lớp; tap đổi trạng thái; lưu batch cùng đánh giá (`save_week_board`).
6. **Đánh giá tuần:** mức gợi ý (Tốt/Khá/…) + nhận xét tự nhập; không hard-code trong DB.
7. **Điểm học tập:** học kỳ 1 / cuối năm — lý thuyết + thực hành; tổng generated trên DB.
8. **Điểm danh theo ngày / phát biểu / điểm thi đua:** vẫn có (session cũ) để tương thích.
9. **Báo cáo lớp:** lọc hôm nay / tuần / tháng / khoảng ngày.
10. **Bảo mật:** proxy + layout; RLS; lỗi kỹ thuật không lộ ra UI.
11. **Health:** `npm run lint`, `npm run typecheck`, `npm run build`.

### Chưa có (backlog có chủ đích)

- Subject CRUD, điểm theo từng môn (Toán, Tiếng Việt…), công thức điểm nâng cao, comment template.
- Entity Parent / Enrollment đa năm / AcademicYear table.
- Export Excel nhiều loại, print-friendly CSS đầy đủ, onboarding wizard.
- Audit log UI, dark mode, i18n EN, global search toàn hệ thống.
- Unit / integration / E2E test suite đầy đủ.
- `npm run setup` one-command + Docker Postgres local thay Supabase (nếu sau này cần offline).

---

## 5. Tech stack (bắt buộc tuân thủ)

```text
Browser (mobile-first UI, VI)
  → Next.js 16 App Router (src/app)
  → Server Actions / RSC
  → Supabase JS (@supabase/ssr + @supabase/supabase-js)
  → PostgreSQL + RLS + RPC (supabase/migrations)
```

### Không đưa vào trừ khi có quyết định product rõ ràng

Kubernetes, microservices, Kafka, RabbitMQ, Elasticsearch, Redis “cho vui”, event sourcing, CQRS phức tạp, Prisma (repo không dùng), NestJS (repo không dùng).

### Env

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=   # chỉ server/admin tooling; KHÔNG bao giờ NEXT_PUBLIC_
```

Không commit `.env` / `.env.local`. Không log password, session, PII học sinh.

---

## 6. Cấu trúc thư mục

```text
src/app/                 # routes, layouts, Server Actions
  (auth)/login/
  (app)/dashboard/
  (app)/classes/[classId]/
    students/            # list + import + points controls
    students/[studentId]/
    attendance/
    participation/
    session/             # tab điểm danh + phát biểu nhanh
    reports/
  actions/               # auth, classes, students, attendance, participation, points
src/components/          # UI dùng chung + shadcn
src/lib/                 # supabase clients, validation, excel, reports, dates
src/types/               # shared TS types
supabase/complete_setup.sql  # schema + RLS + RPC — nguồn truth DB (một file)
docs/                    # KNOWLEDGE, architecture, DEPLOYMENT
```

Quy ước:

- Domain logic validation ở `src/lib/**` + Zod; mutation ở `src/app/actions/**`.
- Thao tác nhanh / atomic → **Postgres RPC** trong `complete_setup.sql` (không chỉ tin client).
- UI tiếng Việt; không jargon kỹ thuật trên màn hình giáo viên.

---

## 7. Data model (hiện tại)

```text
auth.users
  └── profiles (id = auth.uid)

profiles
  ├── school_years (teacher_id, name YYYY-YYYY, deleted_at)
  └── classes (teacher_id, school_year_id, school_year, name, grade, deleted_at)
        └── students (class_id, student_code, full_name, ..., deleted_at)
              ├── weekly_attendance (student_id, class_id, week_number 1-35, status) UNIQUE(student_id, week_number)
              ├── weekly_evaluations (student_id, class_id, week_number, level, comment) UNIQUE(student_id, week_number)
              ├── semester_scores / annual_scores (theory, practice, total generated)
              ├── attendance (student_id, class_id, date, status)  UNIQUE(student_id, date)  -- legacy/day session
              ├── participation_events (points ±1, client_request_id)
              └── student_points (points ≠ 0, reason, client_request_id)
```

### Ràng buộc quan trọng

- Soft delete: `deleted_at` trên `classes` / `students` / `school_years`. Không hard-delete dữ liệu quan trọng.
- Unique partial: tên lớp + năm học theo giáo viên (active); `student_code` theo lớp (active).
- `students` có `UNIQUE (id, class_id)` để attendance/events FK kép không lệch lớp.
- Tuần học: `TOTAL_WEEKS = 35` trong `src/lib/weeks.ts`; không tạo 35 cột.
- Tổng điểm học tập = generated column `least(10, ceil(theory + practice))` trên DB; nếu thiếu lý thuyết hoặc thực hành thì tổng là 0.
- Attendance default UI = PRESENT; persist khi giáo viên lưu tuần / buổi.
- Tổng phát biểu / điểm thi đua = aggregate từ lịch sử event.
- Idempotency: cùng `client_request_id` + `created_by` → retry an toàn.
- Timezone báo cáo / ngày: chuẩn hoá **Asia/Ho_Chi_Minh** (`src/lib/dates.ts`).

### Năm học UI

Năm học là cấp cao nhất trên dashboard. Tạo năm học trước (hoặc tự tạo khi tạo lớp). Dropdown năm gần hiện tại, format `YYYY-YYYY`.

### Flow chính giáo viên

Năm học → Lớp → chọn tuần 1–35 → điểm danh + đánh giá trên một màn hình → Lưu. Cuối kỳ: Điểm học kỳ 1 / cuối năm.

---

## 8. Bảo mật & quyền

1. **RLS là hàng rào cuối** — mọi bảng nghiệp vụ bật RLS; ownership qua lớp của giáo viên.
2. Client chỉ dùng **anon key**. Không đưa service-role vào browser.
3. Mọi mutation nhạy cảm kiểm tra ownership + student active ở RPC / server.
4. Không tin validation chỉ ở frontend.
5. Route `/dashboard`, `/classes/*` yêu cầu đăng nhập (proxy + server layout).
6. Không public student list / grades / attendance / PII.
7. Dữ liệu seed/demo phải fictional — **cấm** PII trẻ em thật.

Chi tiết policy/RPC: [architecture.md](./architecture.md).

---

## 9. Feature rules (khi implement / sửa)

### Học sinh

- Tạo nhanh: chỉ bắt buộc mã + họ tên (các field khác optional).
- List: search theo tên / mã; soft delete thay vì xóa cứng.
- Import Excel: parse → validate ALL → preview → confirm → transaction RPC. Không import nửa chừng im lặng.
- Giới hạn import: xem `src/lib/students/import-limits.ts` (ví dụ ~200 hàng, ~2MB).
- Cột tối thiểu: `student_code`, `full_name`.

### Điểm danh

- Chọn lớp + ngày → bảng học sinh; ưu tiên “tất cả có mặt rồi chỉnh nghỉ”.
- Unique `(student_id, date)` ở DB.

### Phát biểu / điểm

- Mỗi tap chủ đích = một `client_request_id` mới.
- Undo = event bù trừ an toàn, không xoá lịch sử.
- Disable nút trong lúc đang gửi để giảm double-tap vô ý.

### Báo cáo

- Aggregate từ attendance + events + points theo khoảng ngày.
- Không biến dashboard thành BI phức tạp.

### Lỗi / loading / empty

- Mọi action: loading + disable button + success/error tiếng Việt.
- Empty state có CTA (`Chưa có học sinh` → Thêm học sinh).
- Thao tác nguy hiểm: confirmation dialog.

---

## 10. Commands

```bash
npm install
cp .env.example .env.local   # điền Supabase URL + anon key
# Chạy supabase/complete_setup.sql trong SQL Editor (project mới / reset)
npm run dev
npm run lint
npm run typecheck
npm run build
```

Tạo giáo viên: Supabase Dashboard → Authentication → Users → Add user. Profile tự tạo qua trigger.

---

## 11. Quy tắc làm việc cho AI / contributor

1. Không giả định máy đã cài Node/Git/Docker nếu đang viết hướng dẫn cho giáo viên — viết từng bước tiếng Việt.
2. Không over-engineer; giữ MVP đơn giản.
3. Không claim “hoàn thành” khi chưa chạy/build/test flow liên quan.
4. Gặp lỗi: tự tìm root cause → sửa → verify; không hỏi “bạn có muốn tôi sửa không?” trừ khi có rủi ro phá dữ liệu / quyết định product.
5. Schema change = cập nhật `supabase/complete_setup.sql` (nguồn truth). Project đã có dữ liệu thật: viết hướng dẫn SQL bổ sung an toàn, **không** bảo giáo viên chạy lại complete_setup (sẽ xóa dữ liệu).
6. Giữ RLS/RPC đồng bộ với mọi bảng/cột mới.
7. UI VI; không lộ lỗi kỹ thuật ra giáo viên; log chi tiết phía server/dev.
8. Không gửi dữ liệu học sinh sang third-party AI khi chưa có consent / cơ chế bảo vệ phù hợp.
9. Trước khi thêm module lớn (điểm môn, enrollment, Nest…): cập nhật mục 3–4 của file này và thống nhất scope.
10. Đọc `node_modules/next/dist/docs/` khi đụng API Next.js — version trong repo có breaking changes so với kiến thức cũ (xem `AGENTS.md`).

---

## 12. Definition of done (quality gate tối thiểu)

Trước khi báo xong một thay đổi lớn:

- [ ] `npm run lint` / `typecheck` / `build` liên quan pass
- [ ] Flow giáo viên chính vẫn dùng được (login → lớp → học sinh / điểm danh / phát biểu / điểm / báo cáo)
- [ ] RLS/ownership không bị thủng (không đọc được lớp người khác)
- [ ] Soft delete / unique / idempotency vẫn đúng nếu đụng vùng đó
- [ ] Copy UI tiếng Việt, empty/loading/error đầy đủ
- [ ] Không commit secret; không hard-code PII thật
- [ ] Cập nhật README / KNOWLEDGE / architecture nếu đổi hành vi hoặc schema

---

## 13. Handover nhanh cho AI nhận repo

### Codex / Cursor / Claude

- **Codex** tự load [`AGENTS.md`](../AGENTS.md) ở root trước mọi prompt — file đó **bắt buộc** đọc Knowledge + Architecture.
- **Cursor** có rule always-on: `.cursor/rules/QLLH-knowledge.mdc`.
- **Claude Code** load [`CLAUDE.md`](../CLAUDE.md) → `@AGENTS.md`.
- Optional Codex budget lớn hơn: `export CODEX_HOME="$(pwd)/.codex"` (xem [`.codex/README.md`](../.codex/README.md)).

### Checklist khi mở session mới

1. Đọc **file này** + [architecture.md](./architecture.md) + [README.md](../README.md).
2. Xem `supabase/complete_setup.sql` (schema hiện tại).
3. Map feature → `src/app/actions/*` + page tương ứng dưới `src/app/(app)/classes/`.
4. Giữ stack Supabase + Server Actions trừ khi product quyết định migrate.
5. Backlog lớn (điểm môn, comment, enrollment, parent): thiết kế sao cho **không phá** RLS ownership và soft-delete hiện tại; cân nhắc bảng `Enrollment` nếu học sinh cần chuyển lớp theo năm.

---

## 14. Thuật ngữ

| UI (VI) | Code / DB |
| --- | --- |
| Lớp | `classes` |
| Năm học | `school_year` (`2026-2027`) |
| Học sinh | `students` |
| Điểm danh | `attendance` |
| Có mặt / Vắng / Có phép / Đi muộn | `PRESENT` / `ABSENT` / `EXCUSED` / `LATE` |
| Phát biểu | `participation_events` |
| Điểm (thi đua) | `student_points` |
| Xoá mềm | `deleted_at` |
| Giáo viên | `profiles` + `auth.users` |

**Lưu ý:** “Điểm” trong app hiện tại là **điểm thi đua / thưởng phạt**, chưa phải điểm môn học 0–10.
