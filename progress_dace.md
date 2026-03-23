# 🚀 Tiến độ dự án: DACE

## 📌 Tổng quan dự án (Project Overview)
- **Tên dự án:** DACE - English Learning Website
- **Mục tiêu/Mô tả:** Website học câu giao tiếp tiếng Anh theo chủ đề. Người dùng nhập câu mẫu, AI (Google Gemini) tự động điền cấu trúc, chức năng, dịch nghĩa, phát âm và ví dụ.
- **Tech Stack:** Next.js 16.2, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (PostgreSQL), Google Gemini AI, React Query

## 📝 Lịch sử cập nhật (Changelog)

- **[23/03/2026 - 21:15] - DACE [FE/BE] BulkAddModal: thêm nhiều câu với AI review**
  - ✅ Đã làm: Tạo `BulkAddModal.tsx` — 3 bước (input dạng text/file, AI fill concurrent, review từng thẻ có prev/next + deselect). Nút "Nhiều câu" thêm vào toolbar trang topic detail.
  - 🚧 Bước tiếp theo: Test thử tính năng trên dev server.

- **[23/03/2026 - 16:47] - DACE [FE/BE] Thêm chức năng Bulk Import từ file Excel/CSV**
  - ✅ Đã làm: 
    - Cài đặt `papaparse` và `xlsx`.
    - Tạo Component Frontend: `BulkImportModal.tsx` đọc file ở client và preview.
    - Cập nhật trang quản lý câu trong chủ đề có thêm nút "Nhập từ file".
    - Tạo Backend API `POST /api/phrases/bulk` insert nguyên cục mảng phrase vào Database.
  - 🚧 Bước tiếp theo: Test thủ công chức năng Upload file trên giao diện.

- **[23/03/2026 - 16:26] - DACE [FE/Core] Tinh chỉnh UI và sửa lỗi middleware**
  - ✅ Đã làm: 
    - Đổi triệt để các màu `violet` còn sót ở trang Chi tiết chủ đề sang tông cam (`orange`).
    - Dời vị trí các nút "Thêm chủ đề" và "Thêm câu mới" xuống cạnh ô tìm kiếm (phía bên phải) ở cả trang chủ và trang chi tiết.
    - Sửa cảnh báo Warning Deprecated Middleware của Next.js bằng cách đổi file `middleware.ts` sang `proxy.ts`, đồng thời đổi tên hàm export tương ứng.
  - 🚧 Bước tiếp theo: User trải nghiệm giao diện màu mới trên Dev Server.

- **[23/03/2026 - 16:22] - DACE [FE] Đổi theme màu chủ đạo**
  - ✅ Đã làm: Thay đổi toàn bộ các class màu `violet` thành `orange`, và `indigo` thành `amber` để tạo gradient cam theo yêu cầu.
  - 🚧 Bước tiếp theo: User trải nghiệm giao diện màu mới trên Dev Server.

- **[23/03/2026 - 16:20] - DACE [BE] Tự động sinh icon cho chủ đề bằng AI**
  - ✅ Đã làm:
    - Sửa `lib/ai.ts`: thêm hàm `generateTopicIcon` dùng Llama-3-70b-versatile qua Groq để phân tích tên và trả về emoji đại diện
    - Sửa `api/topics/route.ts` (GET): fallback sinh icon bằng AI nếu request không gửi icon (ví dụ khi tạo từ trang "Quản lý chủ đề")
  - 🚧 Bước tiếp theo: Test thủ công tính năng tạo chủ đề mới trên giao diện

- **[23/03/2026 - 15:34] - DACE [FE] Sidebar minimal + Trang quản lý chủ đề phân trang**
  - ✅ Đã làm:
    - Sửa `Sidebar.tsx`: chỉ giữ logo + 1 nút "Quản lý chủ đề" link về `/`
    - Viết lại `page.tsx`: bảng quản lý topics phân trang 10 dòng, debounced search (400ms), inline create/edit, xóa
    - Tạo `lib/hooks/useDebounce.ts`: generic debounce hook
  - 🚧 Bước tiếp theo: Test thủ công trên dev server

- **[23/03/2026 - 15:11] - DACE [FE] Bỏ giao diện chọn chủ đề & nâng cấp Sidebar quản lý chủ đề**
  - ✅ Đã làm:
    - Sửa `Sidebar.tsx`: thêm CRUD inline (tạo/sửa tên/xóa chủ đề) với hover actions
    - Sửa `page.tsx`: bỏ hero/stats/grid → redirect sang topic đầu tiên hoặc empty state
    - Sửa `topics/[id]/page.tsx`: bỏ TopicSelector dropdown ở header
    - Xóa `TopicSelector.tsx` (không còn sử dụng)
  - 🚧 Bước tiếp theo: Test thủ công trên dev server

- **[23/03/2026 - 11:38] - DACE [Config] Khởi tạo và build toàn bộ dự án**
  - ✅ Đã làm:
    - Cài đặt dependencies: `@supabase/supabase-js`, `@google/generative-ai`, `@tanstack/react-query`, `lucide-react`, shadcn/ui components
    - Tạo `supabase/schema.sql` - DB schema với 2 bảng `topics`, `phrases` và 8 topic seed data
    - Tạo `lib/supabase.ts` - Supabase client + TypeScript types
    - Tạo `lib/ai.ts` - Gemini AI integration để auto-fill phrase fields
    - Tạo API routes: `GET/POST /api/topics`, `GET/PUT/DELETE /api/topics/[id]`, `GET/POST /api/phrases`, `GET/PUT/DELETE /api/phrases/[id]`, `POST /api/generate`
    - Tạo UI components: `Sidebar.tsx`, `PhraseForm.tsx` (AI fill feature), `PhraseCard.tsx` (Web Speech API audio)
    - Tạo Pages: `app/page.tsx` (Homepage), `app/topics/[id]/page.tsx` (Topic detail)
    - `npm run build` thành công (Exit code 0)
  - 🚧 Bước tiếp theo:
    - Điền `GEMINI_API_KEY` + Supabase keys vào `.env.local`
    - Chạy SQL migration trong Supabase SQL Editor
    - Chạy `npm run dev` và test AI generation feature
