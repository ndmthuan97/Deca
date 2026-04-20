export type NLMPrompt = {
  id: string; title: string; group: string
  template: string
}

export const PROMPT_GROUPS = ['Từ vựng', 'Ngữ pháp', 'Luyện đề', 'Chẩn đoán']
export const GROUP_DESC: Record<string, string> = {
  'Từ vựng':   'Học từ mới qua ngữ cảnh thực — email, hội thoại',
  'Ngữ pháp':  'Nắm quy tắc & sửa lỗi ngữ pháp',
  'Luyện đề':  'Phân tích đề ETS — Reading & Listening',
  'Chẩn đoán': 'Cuối tuần — đánh giá tổng thể & cải thiện',
}

export const PROMPTS: NLMPrompt[] = [

  // ── TỪ VỰNG ──────────────────────────────────────────────
  {
    id: 'vocab-email',
    title: 'Email TOEIC từ 10 từ mới',
    group: 'Từ vựng',
    template: `Hãy lấy ngẫu nhiên 10 từ vựng TOEIC từ tài liệu. Tất cả 10 từ PHẢI cùng một chủ đề (Finance, HR, Marketing... — tự chọn chủ đề phù hợp và ghi rõ lên đầu).

Viết 1 email công sở chuẩn TOEIC Part 7 (100% tiếng Anh) có chứa đủ 10 từ đó. Ghi nghĩa tiếng Việt trong ngoặc ngay sau mỗi từ, ví dụ: implement (thực hiện).

Cuối email thêm bảng tổng kết:
| Từ | Nghĩa | Loại từ | Ví dụ collocation |`,
  },

  {
    id: 'vocab-dialogue',
    title: 'Hội thoại TOEIC Part 3 từ từ vựng',
    group: 'Từ vựng',
    template: `Từ tài liệu từ vựng, lấy 6 từ cùng một chủ đề (tự chọn và ghi rõ). Viết 1 hội thoại TOEIC Part 3 giữa Manager và Colleague, dùng đủ 6 từ đó (ghi nghĩa tiếng Việt trong ngoặc).

Sau hội thoại, đặt 3 câu hỏi TOEIC (dạng Part 3) về nội dung vừa đọc, kèm đáp án.`,
  },

  {
    id: 'vocab-collocations',
    title: 'Collocation & sắc thái dùng từ',
    group: 'Từ vựng',
    template: `Chọn 1 từ vựng TOEIC quan trọng từ tài liệu (ưu tiên động từ phổ biến). Phân tích đầy đủ:
1. Nghĩa chính trong ngữ cảnh TOEIC
2. 5 collocation thường gặp — kèm ví dụ câu
3. Phân biệt với từ đồng nghĩa/gần nghĩa hay bị nhầm
4. 2 câu ví dụ chuẩn Part 5 để luyện`,
  },

  // ── NGỮ PHÁP ─────────────────────────────────────────────
  {
    id: 'grammar-summary',
    title: 'Tóm tắt ngữ pháp + test nhanh',
    group: 'Ngữ pháp',
    template: `Chọn 1 chủ điểm ngữ pháp TOEIC phổ biến từ tài liệu. Tóm tắt ngắn gọn:
1. Công thức / cấu trúc cốt lõi (dùng sơ đồ hoặc bullet)
2. Khi nào DÙNG — khi nào KHÔNG DÙNG
3. Lỗi người Việt hay mắc nhất
4. 3 câu trắc nghiệm Part 5 để luyện ngay — kèm đáp án giải thích`,
  },

  {
    id: 'grammar-compare',
    title: 'So sánh 2 cấu trúc hay nhầm',
    group: 'Ngữ pháp',
    template: `Chọn 2 cấu trúc ngữ pháp TOEIC hay bị nhầm lẫn (VD: despite vs although, used to vs be used to...). So sánh:
1. Bảng: Cấu trúc / Theo sau là gì / Ý nghĩa / Khi nào dùng
2. Ví dụ ĐÚNG cho từng cái
3. Ví dụ SAI phổ biến + giải thích tại sao sai
4. Mẹo ghi nhớ không nhầm`,
  },

  {
    id: 'grammar-fix',
    title: 'Phân tích câu sai Part 5/6',
    group: 'Ngữ pháp',
    template: `Lấy 1 câu Part 5 hoặc Part 6 từ tài liệu đề thi mà bạn đánh giá là CÓ BẪY ngữ pháp phức tạp. Phân tích:
1. Trích đề bài đầy đủ + đáp án đúng
2. Đặt tên BẪY: đây là bẫy gì? (VD: bẫy thì, bẫy từ loại, bẫy từ đồng nghĩa...)
3. Giải thích tại sao từng đáp án sai "trông có lý"
4. Quy tắc ngữ pháp áp dụng — trích từ tài liệu
5. Tạo 1 câu tương tự để luyện`,
  },

  // ── LUYỆN ĐỀ ─────────────────────────────────────────────
  {
    id: 'reading-paraphrase',
    title: 'Bẫy paraphrase Part 7',
    group: 'Luyện đề',
    template: `Lấy 1 câu Part 7 từ đề ETS có kỹ thuật paraphrase (câu hỏi dùng từ khác với đoạn văn). Phân tích:
1. Trích câu hỏi + đoạn văn liên quan + đáp án đúng
2. Liệt kê 3+ cặp paraphrase: [Từ trong văn bản] → [Từ trong đáp án]
3. Giải thích từng đáp án sai "bẫy" ở chỗ nào
4. Chiến thuật nhận ra bẫy paraphrase nhanh hơn`,
  },

  {
    id: 'reading-long',
    title: 'Chiến thuật đọc đoạn văn đôi/ba',
    group: 'Luyện đề',
    template: `Lấy 1 cụm câu Part 7 dạng double/triple passage từ đề ETS. Phân tích:
1. Sơ đồ thông tin: câu nào lấy từ văn bản nào?
2. Câu nào cần cross-reference giữa 2-3 văn bản?
3. Chiến thuật mắt cú: đọc câu hỏi hay đọc văn bản trước?
4. Time allocation gợi ý cho cụm này`,
  },

  {
    id: 'listening-deaf',
    title: 'Phân tích phát âm Listening',
    group: 'Luyện đề',
    template: `Lấy 1 đoạn transcript khó từ đề ETS Listening (Part 3 hoặc 4). Phân tích:
1. Trích transcript đầy đủ + câu hỏi + đáp án
2. Chỉ ra tất cả Nối Âm (Linking) và Nuốt Âm (Elision) trong đoạn — bôi đậm và giải thích
3. Distractor: đáp án sai "nghe giống" đáp án đúng ở điểm nào?
4. Chiến thuật để không bị bẫy distraction`,
  },

  {
    id: 'listening-signpost',
    title: 'Tín hiệu ngôn ngữ Part 3&4',
    group: 'Luyện đề',
    template: `Lấy 1 cụm Part 3 hoặc Part 4 từ đề ETS. Phân tích Signposting words:
1. Trích transcript
2. Đánh dấu tất cả signal words: Actually / However / The thing is / What I need is / By the way...
3. Giải thích mỗi từ báo hiệu thông tin gì sắp xuất hiện
4. Câu hỏi nào trong cụm này dễ sai nếu không nghe kịp signpost?`,
  },

  // ── CHẨN ĐOÁN ────────────────────────────────────────────
  {
    id: 'diagnose-all',
    title: 'Chẩn đoán toàn diện điểm yếu',
    group: 'Chẩn đoán',
    template: `Dùng Sổ Tay Lỗi Sai kết hợp đề thi để phân tích tổng thể:
1. Thống kê % lỗi theo từng Part (5/6/7 Reading, 2/3/4 Listening)
2. TOP 3 điểm yếu — kèm ví dụ câu cụ thể từ đề
3. Root cause: tại sao tôi mắc lỗi này lặp đi lặp lại?
4. Lộ trình 1 tuần để vá lỗ hổng — cụ thể theo ngày`,
  },

  {
    id: 'vaccine',
    title: 'Chế "Vắc-xin" Anti-Error',
    group: 'Chẩn đoán',
    template: `Từ Sổ Tay Lỗi Sai, tìm ra kiểu lỗi tôi mắc nhiều nhất. Chế 5 câu Anti-Error Test:
- Bẫy giống hệt kiểu câu tôi hay sai
- Từ vựng hoàn toàn mới (không học vẹt được)
- Kèm đáp án + giải thích rõ tại sao đáp án SAI lại "trông có lý"`,
  },

  {
    id: 'weekly-review',
    title: 'Tổng kết lỗi sai cuối tuần',
    group: 'Chẩn đoán',
    template: `Đóng vai giáo viên nghiêm khắc, dựa vào Sổ Tay Lỗi Sai:
1. Tổng kết tuần: bao nhiêu lỗi, dạng nào nhiều nhất
2. So sánh với tuần trước — tiến bộ hay thụt lùi?
3. Chỉ thẳng 1 thói quen xấu nhất (không nương tay)
4. 3 lời khuyên cực kỳ thực tế cho tuần sau`,
  },

  {
    id: 'final-boss',
    title: '"Lời sấm" trước ngày thi',
    group: 'Chẩn đoán',
    template: `Ngày mai thi thật. Tổng hợp từ toàn bộ tài liệu:
1. TOP 5 BẪY TỬ THẦN phổ biến — kèm ví dụ câu thực từ đề ETS
2. Phân bổ thời gian theo từng Part ngày thi
3. Những lỗi TÔI đã mắc nhiều nhất cần tránh (từ Sổ Tay)
4. Lời động viên ngắn, thực tế, không sáo rỗng`,
  },
]
