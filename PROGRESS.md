# Tiến độ & việc cần làm — NGX E-Commerce

> Cập nhật: 2026-09-09. File này là **nguồn sự thật duy nhất** về "đang tới đâu".
> Đọc hết mục 0 → 4 trước khi viết dòng code nào. Xong việc thì ghi vào mục 6.

---

## 0. Dành cho AI coding agent (Cursor / Claude Code)

**Quy ước bắt buộc:**

- Database dev chạy ở **port 55432** (không phải 5432) vì máy dev đã có PostgreSQL 18 chiếm 5432. Xem `README.md` mục 1.
- Sau khi seed lại: dùng `npm run seed:full` (seed + sinh embedding). Nếu chỉ chạy `npm run seed`, bảng `product_embeddings` rỗng và chatbot RAG **âm thầm** tụt về tìm theo từ khoá — mọi số đo AI sẽ sai.
- Trước khi commit: `cd backend && npm test` (14 bộ test + `demo-readiness`, 105 ca). Không commit khi test đỏ. Lệnh này **seed lại DB**, chạy xong nhớ `npm run embed:products`.
- Đo lại AI: `npm run eval:ai` → `backend/docs/ai-evaluation.md`.
- Đo truy hồi và RAG Triad: `npm run eval:rag` → `backend/docs/rag-evaluation.md`. Thêm `-- --quick` để chạy nhanh. Bản miễn phí của Gemini giới hạn 15 lượt/phút nên script tự giãn nhịp, chạy đầy đủ mất khoảng 4 phút.
- Chuẩn hoá tiếng Việt: dùng `lib/vietnamese.js`, **đừng tự viết lại** `normalize("NFD")` vì chữ "đ" không tách được bằng cách đó.
- Sinh lại ERD: `npm run docs:erd` → `backend/docs/erd.md`.
- Tài liệu hành vi hệ thống: `backend/docs/architecture.md` (Mermaid). **Sửa code lõi thì sửa luôn tài liệu này.**
- Mỗi task ở mục 4 đều có "Tiêu chí nghiệm thu". Không tự coi là xong nếu chưa có test hoặc số đo chứng minh.

**Không cần làm lại:** CRUD sản phẩm / danh mục / giỏ hàng / hồ sơ, layout admin - seller - buyer, upload ảnh Cloudinary. Phần này đã chạy và đã có test bao phủ. Trọng tâm còn lại là **kỹ thuật lõi và AI**, xem mục 3 - 4.

---

## 1. Hiện trạng theo module

| Module | Trạng thái | File chính | Bằng chứng |
|---|---|---|---|
| Xác thực, phân quyền 3 lớp, xác thực email | Xong | `backend/controllers/auth.controller.js`, `middleware/auth.middleware.js` | `tests/01-auth`, `tests/02-authz` |
| Vòng đời gian hàng (đăng ký, duyệt, đình chỉ, ẩn sản phẩm theo shop) | Xong | `controllers/shop.controller.js` | `tests/03-shops` |
| Sản phẩm, biến thể màu, thông số, xoá mềm | Xong | `controllers/product.controller.js`, `lib/productQuery.js` | `tests/04-products` |
| Bộ lọc động theo thông số kỹ thuật | Xong | `routes/filter.route.js`, `docs/filter-system-summary.md` | `scripts/test-filter-logic.js` |
| Giỏ hàng gom nhiều shop | Xong | `controllers/cart.controller.js` | `tests/05-cart` |
| Voucher hai cấp (sàn + shop) | Xong | `controllers/coupon.controller.js` | `tests/06-vouchers` |
| **Tách đơn: 1 OrderGroup → N Order** | Xong | `controllers/order.controller.js:404-520` | `tests/07-marketplace-flow` |
| **Bất biến dòng tiền** (đơn cuối hấp thụ sai số làm tròn) | Xong | `order.controller.js` — phân bổ khuyến mãi theo tỉ lệ | `tests/11-business-rules`: "bảng chi tiết tiền cộng lại đúng bằng tổng thanh toán" |
| **Chống bán vượt kho / vượt lượt voucher** bằng cập nhật có điều kiện | Xong | `order.controller.js:455-520` | `tests/11-business-rules`: voucher 1 lượt khi thanh toán đồng thời |
| Chuyển trạng thái đơn có khoá (compare-and-set) | Xong | `order.controller.js:801-980` | `tests/07`, `tests/11` |
| Thanh toán VNPay / MoMo + xác thực chữ ký IPN | Xong | `controllers/payment.controller.js` | `tests/09-payment-security` (5 ca) |
| Đổi trả: yêu cầu, duyệt, hoàn kho, thu hồi điểm | Xong | `controllers/return.controller.js` | `tests/07` |
| Khách hàng thân thiết (tích điểm, hạng, đổi điểm) | Xong | `earnPointsForOrder` trong `order.controller.js` | `tests/08-loyalty-notifications` |
| Chat thời gian thực 2 kênh + thông báo | Xong | `controllers/chat.controller.js`, Socket.IO trong `server.js` | `tests/07`, `tests/08` |
| Nhật ký thao tác (audit log) | Xong | `writeAuditLog` | ghi ở mọi lệnh tạo đơn |
| **Truy hồi lai**: full-text + trigram + vector, hợp nhất bằng RRF | Xong | `backend/ai/retrieval.js` | `tests/13-retrieval`, Recall@5 100% |
| **Function calling**: bot tự đọc giá, tồn kho, phí ship từ DB | Xong | `backend/ai/tools.js` | `docs/rag-evaluation.md` |
| **Phòng thủ tiêm lệnh ba lớp** (gồm tiêm gián tiếp qua mô tả người bán) | Xong | `backend/ai/guard.js` | `tests/12-ai-guard` 15/15 |
| **Trả lời theo luồng (SSE)** | Xong | `controllers/aiAssistant.controller.js` | sự kiện `token`/`replace`/`done` |
| Chatbot RAG điều phối chung | Xong | `backend/ai/agent.js` | `docs/rag-evaluation.md` |
| Tìm kiếm bằng hình ảnh | Xong, chưa đo | `ai/imageSearch.js`, `controllers/productImageSearch.controller.js` | — |
| So sánh sản phẩm bằng AI (trả JSON có cấu trúc) | Xong | `ai/productComparison.js` | — |
| Kiểm duyệt đánh giá tự động | Xong | `ai/reviewModeration.js` | `docs/ai-evaluation.md` mục 2 |
| Thu thập phản hồi chất lượng trả lời AI | Xong | `controllers/aiFeedback.controller.js` | — |
| Gợi ý cá nhân hoá (lọc cộng tác chạy nền) | Xong phần job, chưa đo chất lượng | `jobs/computeProductSimilarity.js`, `jobs/computeUserRecommendations.js`, `jobs/scheduler.js` | `docs/ai-evaluation.md` mục 3 |
| Hardening API (helmet, rate limit, guard ID, error handler) | Xong | `middleware/` | `tests/10-api-contract` |
| Đóng gói Docker + seed dữ liệu mẫu | Xong | `docker-compose.yml`, `seed/index.js` | `tests/demo-readiness` |
| Tài liệu kiến trúc + ERD sinh tự động | Xong | `docs/architecture.md`, `docs/erd.md` | `npm run docs:erd` |

---

## 2. Số đo thực tế so với KPI trong đề cương

Nguồn: `backend/docs/rag-evaluation.md` (`npm run eval:rag`, tập gắn nhãn 30 câu)
và `backend/docs/ai-evaluation.md` (`npm run eval:ai`).

| KPI đề cương | Mục tiêu | Trước 09/09 | Đo được 09/09 | Kết luận |
|---|---|---|---|---|
| Truy hồi đúng sản phẩm trong top 5 | > 75% | 62.5% | **100%** (30/30) | Đạt |
| MRR của truy hồi | - | chưa đo | **0.919** | Có số |
| Faithfulness (Ragas) | > 0.75 | chưa đo | **0.875** | Đạt |
| Answer Relevance (Ragas) | > 0.75 | chưa đo | **0.825** | Đạt |
| Context Relevance (Ragas) | - | chưa đo | **0.275** | Thấp, xem ghi chú |
| Thời gian tới ký tự đầu tiên | < 1.5 s | không có streaming | **4.0 s** | **Chưa đạt** |
| Thời gian hoàn tất | < 8 s | p50 = 9.0 s | **4.5 s** | Đạt |
| Độ chính xác giá / tồn kho | > 85% | chưa đo được | khớp tuyệt đối với DB | Đạt, xem ghi chú |
| Chặn tấn công tiêm lệnh | 100% | chưa có | **11/11**, chặn nhầm 0/10 | Đạt |
| Phát hiện bình luận vi phạm | > 80% | 100% (n = 10) | 100% | Đạt, cỡ mẫu nhỏ |
| Nhận diện đúng khi tìm bằng ảnh | > 70% | chưa đo | **chưa đo** | Còn thiếu |
| nDCG của gợi ý cá nhân hoá | > 0.60 | chưa đo | **chưa đo** | Còn thiếu |

**Ghi chú ba con số cần giải thích khi bảo vệ:**

- **Context Relevance 0.275 không phải lỗi.** Chỉ số này của Ragas phạt việc lấy
  về thừa: hệ thống luôn trả 5 ứng viên, trong khi câu hỏi kiểu "Dell XPS 15 giá
  bao nhiêu" chỉ cần 1. Bốn sản phẩm còn lại bị tính là nhiễu. Muốn nâng thì
  giảm `topK` động theo độ chắc chắn của truy hồi, đánh đổi với Recall.
- **Độ chính xác giá / tồn kho.** Không còn là phép đo xác suất nữa: giá và tồn
  kho đưa vào ngữ cảnh đọc trực tiếp từ cùng một truy vấn, và dùng chung hàm
  `calculateProductPrices` với API sản phẩm. Sai số chỉ xảy ra nếu model đọc sai
  con số đã cho, và đó chính là thứ Faithfulness 0.875 đang đo.
- **TTFT 4.0 s chưa đạt mốc 1.5 s.** Phần còn lại gần như toàn bộ là thời gian
  model cân nhắc trước khi phát token đầu. Đo riêng lượt sinh không bind công cụ
  thì TTFT là 1.4 s, còn khi bind công cụ model dừng lại để quyết định có gọi
  hay không. Xem T7.

---

## 3. Khoảng trống kỹ thuật

### Đã đóng (09/09/2026)

| Mã | Vấn đề | Đã xử lý thế nào | Bằng chứng |
|---|---|---|---|
| G1 | Chatbot không có giá / tồn kho thời gian thực | Giá và tồn kho nạp sẵn vào ngữ cảnh từ chính truy vấn truy hồi, cộng ba công cụ `lookup_product`, `check_stock`, `get_shop_policy` cho phần ngữ cảnh không có. Dùng chung `calculateProductPrices` với API sản phẩm | `ai/tools.js`, Faithfulness 0.875 |
| G2 | Hybrid search thô, cộng điểm thủ công | Ba nhánh full-text `ts_rank`, trigram `word_similarity`, vector pgvector; hợp nhất bằng Reciprocal Rank Fusion | `ai/retrieval.js`, `tests/13-retrieval`, Recall@5 100% |
| G3 | Tìm kiếm không chịu lỗi chính tả | Nhánh trigram dùng `word_similarity` thay vì `similarity`: tên sản phẩm dài làm `similarity` tụt dưới ngưỡng | `tests/13`: "iphon", "macbok pro", "samsng galaxy tab" |
| G4 | Không có phòng thủ tiêm lệnh | Ba lớp: đầu vào, ngữ cảnh (nonce + vô hiệu hoá câu lệnh trong mô tả người bán), đầu ra | `ai/guard.js`, `tests/12-ai-guard` 15/15 |
| G5 | Không có streaming | Endpoint SSE `POST /:chatId/messages/stream`, endpoint cũ giữ làm dự phòng | `controllers/aiAssistant.controller.js` |
| G6 | Khung đánh giá chưa chuẩn hoá | Tập gắn nhãn 30 câu, Recall@5 và MRR đo khách quan, RAG Triad chấm theo phương pháp Ragas | `eval/dataset.json`, `npm run eval:rag` |
| G7 | Thiếu ca biên thanh toán | Hai người mua tranh mặt hàng cuối; IPN phát lại không ghi đè bản ghi thanh toán | `tests/14-concurrency` |

**Một lỗi phát sinh trong lúc làm, đã sửa:** chữ "đ" và "Đ" không tách được bằng
`normalize("NFD")` vì là ký tự có gạch ngang chứ không phải nguyên âm mang dấu,
nên bước lọc `[^a-z0-9]` xoá luôn cả chữ: `"điện thoại"` thành `"ien thoai"`.
Phía Postgres thì `unaccent` ánh xạ đúng thành `"dien thoai"`. Hai bên lệch nhau
nghĩa là token gửi xuống không khớp được với thứ đã lập chỉ mục — mọi câu hỏi
tiếng Việt có chữ "đ" đều bị ảnh hưởng. Gom về `lib/vietnamese.js`, sửa luôn cả
`frontend/src/client/utils/productSlug.ts`.

### Còn lại

**G8 — Chưa có bộ nhớ đệm, và TTFT chưa đạt.**
Mỗi câu hỏi hiện tốn 1 lượt gọi model khi ngữ cảnh đã đủ, 2 lượt khi phải gọi
công cụ (trước đây là 3). Đo riêng lượt sinh không bind công cụ cho TTFT 1.4 s;
khi bind công cụ, model dừng lại cân nhắc và TTFT lên 4.0 s. Xem T7.

**G9 — Hai KPI vẫn chưa có phép đo:** độ chính xác tìm kiếm bằng ảnh và nDCG
của gợi ý cá nhân hoá. Cần tập ảnh gắn nhãn và tập ground-truth cho gợi ý.

---

## 4. Backlog theo thứ tự ưu tiên

### Đã xong 09/09/2026

| Mã | Việc | Nghiệm thu |
|---|---|---|
| T1 | Function calling: bot tự truy vấn giá và tồn kho | Trả lời khớp tuyệt đối với DB; công cụ chỉ đọc gian hàng đang hoạt động |
| T2 | Hybrid search chuẩn hoá + chịu lỗi chính tả | Recall@5 = 100% trên tập 30 câu, vượt mốc 75% |
| T3 | Streaming câu trả lời (SSE) | Endpoint stream phát `token` / `replace` / `done` kèm số đo TTFT |
| T4 | Chống prompt injection hai chiều | 11 câu tấn công chặn 100%, 10 câu mua hàng bình thường không bị chặn nhầm |
| T5 | Khung đánh giá theo RAG Triad | `npm run eval:rag` xuất Recall@5, MRR, Faithfulness, Answer Relevance, Context Relevance |
| T6 | Ca biên nghiệp vụ thanh toán | `tests/14-concurrency` xanh; test IPN phát lại được kiểm chứng là **đỏ khi gỡ guard** |

### Còn lại

#### T7. Hạ thời gian tới ký tự đầu tiên xuống dưới 1.5 s

- **Việc**:
  1. Chỉ bind công cụ khi câu hỏi thực sự cần, ví dụ khi ngữ cảnh truy hồi rỗng
     hoặc câu hỏi chạm tới màu sắc / phí ship. Đo cho thấy chỉ riêng việc bind
     công cụ đã đẩy TTFT từ 1.4 s lên 4.0 s.
  2. Cache embedding của câu hỏi lặp lại và kết quả truy hồi theo câu đã chuẩn hoá.
  3. Thử tắt chế độ suy nghĩ của model nếu thư viện hỗ trợ. Bản
     `@langchain/google-genai@0.2.18` hiện không có tham số này.
- **Nghiệm thu**: TTFT trung vị dưới 1.5 s trên tập 30 câu, Faithfulness không tụt.

#### T8. Đo hai KPI còn thiếu

- Tập từ 20 ảnh gắn nhãn cho tìm kiếm bằng ảnh; tập ground-truth cho gợi ý để
  tính nDCG@5.
- **Nghiệm thu**: bảng ở mục 2 không còn ô "chưa đo".

#### T9. Nâng Context Relevance

- Giảm `topK` động: câu hỏi nêu đích danh tên sản phẩm thì chỉ cần 1-2 ứng viên.
- **Nghiệm thu**: Context Relevance trên 0.5 mà Recall@5 không tụt dưới 90%.

### P2 — nếu còn thời gian

- Bảng phân tích giữ chân người dùng và tỉ lệ chuyển đổi giỏ hàng cho admin.
- Báo cáo tỉ lệ phản hồi tích cực về trả lời AI. Dữ liệu đã thu, chỉ thiếu màn hình thống kê.
- Giám sát thời gian thực: cảnh báo lỗi, đo độ trễ API, quản lý hạn mức gọi dịch vụ AI.

---


## 5. Bản đồ đề cương → thư mục code

| Mục đề cương | Nơi hiện thực |
|---|---|
| Tách đơn, voucher hai cấp, bất biến dòng tiền | `backend/controllers/order.controller.js` và `docs/architecture.md` mục 2 |
| Chatbot RAG trên cơ sở dữ liệu vector | `backend/ai/agent.js`, bảng `product_embeddings` |
| Truy hồi lai và hợp nhất RRF | `backend/ai/retrieval.js` |
| Function calling cho giá và tồn kho | `backend/ai/tools.js` |
| Phòng thủ tiêm lệnh ba lớp | `backend/ai/guard.js` |
| Chuẩn hoá tiếng Việt dùng chung | `backend/lib/vietnamese.js` |
| Khung đánh giá RAG Triad | `backend/scripts/evaluate-rag.js`, `backend/eval/dataset.json` |
| Tìm kiếm bằng hình ảnh | `backend/ai/imageSearch.js` |
| So sánh thông số có cấu trúc | `backend/ai/productComparison.js` |
| Lọc cộng tác gợi ý | `backend/jobs/compute*.js` |
| Kiểm duyệt đánh giá | `backend/ai/reviewModeration.js` |
| Phân quyền ba lớp | `backend/middleware/auth.middleware.js` |
| Bộ kiểm thử tự động | `backend/tests/*.test.mjs` |
| Số đo KPI | `backend/scripts/evaluate-ai.js` → `docs/ai-evaluation.md`, `evaluate-rag.js` → `docs/rag-evaluation.md` |

---

## 6. Nhật ký

| Ngày | Việc | Người / công cụ |
|---|---|---|
| 2026-09-08 | Lập file theo dõi tiến độ, rà soát hiện trạng so với đề cương, chốt backlog T1 - T7 | Claude Code |
| 2026-09-08 | Viết lại toàn văn đề cương theo góp ý của CBHD, xem `docs/de-cuong-chi-tiet-v2.md`. Kế hoạch mới rút giai đoạn cài đặt còn 2 tuần, dồn 13/11 - 27/11 cho T4 chống tiêm lệnh, T3 streaming và phần kiểm thử biên của T6 | Claude Code |
| 2026-09-09 | Hiện thực T1 - T6 theo góp ý của CBHD. Recall@5 đi từ 62.5% lên 100%, thời gian hoàn tất từ 9.0s xuống 4.5s. Thêm `ai/retrieval.js`, `ai/tools.js`, `ai/guard.js`, `lib/vietnamese.js`, `eval/dataset.json`, `scripts/evaluate-rag.js`, ba bộ test 12-14, migration `20260909_product_search_vector` | Claude Code |
| 2026-09-09 | Sửa lỗi chuẩn hoá chữ "đ" làm lệch token giữa JS và Postgres, ảnh hưởng mọi câu hỏi tiếng Việt có chữ này. Sửa cả backend lẫn `frontend/src/client/utils/productSlug.ts` | Claude Code |
| 2026-09-09 | Thêm guard chống ghi đè khi IPN bị phát lại. Test được kiểm chứng là đỏ khi gỡ guard, xanh khi có guard | Claude Code |
