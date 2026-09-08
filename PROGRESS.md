# Tiến độ & việc cần làm — NGX E-Commerce

> Cập nhật: 2026-09-08. File này là **nguồn sự thật duy nhất** về "đang tới đâu".
> Đọc hết mục 0 → 4 trước khi viết dòng code nào. Xong việc thì ghi vào mục 6.

---

## 0. Dành cho AI coding agent (Cursor / Claude Code)

**Quy ước bắt buộc:**

- Database dev chạy ở **port 55432** (không phải 5432) vì máy dev đã có PostgreSQL 18 chiếm 5432. Xem `README.md` mục 1.
- Sau khi seed lại: dùng `npm run seed:full` (seed + sinh embedding). Nếu chỉ chạy `npm run seed`, bảng `product_embeddings` rỗng và chatbot RAG **âm thầm** tụt về tìm theo từ khoá — mọi số đo AI sẽ sai.
- Trước khi commit: `cd backend && npm test` (11 bộ test + `demo-readiness`). Không commit khi test đỏ.
- Đo lại AI: `npm run eval:ai` → cập nhật `backend/docs/ai-evaluation.md`.
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
| Chatbot RAG (pgvector + mở rộng từ khoá bằng LLM + nhận diện đổi chủ đề) | Xong, cần nâng cấp | `backend/ai/agent.js` | `docs/ai-evaluation.md` mục 1 |
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

Nguồn: `backend/docs/ai-evaluation.md`, sinh bằng `npm run eval:ai`.

| KPI đề cương | Mục tiêu | Đo được | Kết luận |
|---|---|---|---|
| Truy hồi đúng sản phẩm liên quan trong top 5 | > 75% | 62.5% (5/8 câu đúng nhóm hàng) | **Chưa đạt** |
| Thời gian phản hồi chatbot | < 6.0 s | p50 = 9.0 s, p95 = 11.6 s | **Chưa đạt** |
| Phát hiện bình luận vi phạm | > 80% | 100% (F1 = 1.0, n = 10) | Đạt, cỡ mẫu còn nhỏ |
| Chặn nhầm bình luận sạch | < 5% | 0% | Đạt |
| Độ chính xác giá / tồn kho trong câu trả lời | > 85% | **chưa đo** | Chưa có phép đo |
| Nhận diện đúng dòng máy khi tìm bằng ảnh | > 70% | **chưa đo** | Chưa có phép đo |
| nDCG của danh sách gợi ý | > 0.60 | **chưa đo** | Chưa có phép đo |
| Phản hồi tích cực của người dùng về trả lời AI | > 80% | chưa gom số | Có API thu thập, chưa có báo cáo |

**Đây là danh sách việc phải làm, không phải điểm trừ.** Ba KPI chưa có phép đo là rủi ro lớn nhất khi bảo vệ: hội đồng sẽ hỏi "đo bằng gì". Xem T5.

---

## 3. Khoảng trống kỹ thuật

**G1 — Chatbot không truy vấn giá / tồn kho theo thời gian thực.**
`ai/agent.js` nhồi kết quả truy hồi vào prompt dưới dạng văn bản tĩnh. Giá trong câu trả lời là ảnh chụp lúc truy hồi, không phải giá hiện tại; tồn kho hoàn toàn không có trong ngữ cảnh. KPI "độ chính xác giá / tồn kho > 85%" gần như không chứng minh được nếu giữ kiến trúc này. Cần Function Calling / Tool Use.

**G2 — Hybrid search mới ở mức thô.**
Nhánh từ khoá trong `agent.js:405-424` dùng `LIKE %token%`, không có xếp hạng. Nhánh vector dùng pgvector đúng chuẩn. Hai nhánh được hợp nhất bằng cách cộng điểm thủ công trong `scoreCandidateRow`. Chưa có BM25 hay `ts_rank`, chưa có Reciprocal Rank Fusion. Đây là chỗ trực tiếp kéo Recall xuống 62.5%.

**G3 — Tìm kiếm văn bản chưa chịu lỗi chính tả.**
Đề cương hứa "tìm kiếm hỗ trợ sửa lỗi chính tả nhẹ" bằng kỹ thuật trigram. Thực tế `product.controller.js:216` chỉ dùng `contains`, tức so khớp chuỗi con. `pg_trgm` đã bật nhưng **chỉ dùng cho gợi ý sản phẩm tương tự theo mô tả** (`product.controller.js:1087`), chưa dùng cho ô tìm kiếm. Gõ "iphon" hay "labtop dell" hiện trả về rỗng.

**G4 — Không có phòng thủ prompt injection.**
Không có lớp lọc nào giữa câu người dùng và LLM. Rủi ro thật gồm hai hướng:

- *Trực tiếp*: người mua ép bot hứa giảm giá, cấp voucher, hoặc lộ system prompt.
- *Gián tiếp*: **mô tả sản phẩm do seller tự nhập được đưa thẳng vào ngữ cảnh** (`agent.js` lấy `pe.content`). Một seller có thể nhét câu lệnh vào mô tả để thao túng bot trong phiên của người mua khác. Đây là lỗ hổng đặc thù của mô hình đa gian hàng và là điểm rất mạnh cho báo cáo.

**G5 — Chưa có streaming.**
`sendAiChatMessage` trả một cục JSON sau khi model chạy xong. Với p50 = 9 s, người dùng nhìn màn hình trống 9 giây. Frontend đã có sẵn `AiChatTypingIndicator.tsx` nên phần hiển thị không phải làm lại từ đầu.

**G6 — Khung đánh giá AI chưa chuẩn hoá.**
`scripts/evaluate-ai.js` tự viết, đo bốn thứ: có trích dẫn sản phẩm không, đúng nhóm hàng không, độ trễ, và P/R/F1 của kiểm duyệt. Chưa có bộ ba RAG Triad (Faithfulness, Answer Relevance, Context Relevance), chưa có tập ground-truth để tính Recall@5 đúng nghĩa, chưa có nDCG.

**G7 — Thiếu vài ca biên nghiệp vụ thanh toán.**
Đã có: chữ ký IPN sai / bịa / sửa số tiền (`tests/09`), voucher đua nhau (`tests/11`). Chưa có: hai người mua cùng lúc mặt hàng còn 1 cái, IPN phát lại cùng một payload hợp lệ, huỷ đơn sau khi đã thanh toán. Riêng IPN: `payment.controller.js:418` cập nhật bản ghi payment mà không kiểm tra trạng thái đã `PAID` chưa. Đơn hàng thì an toàn nhờ guard `status: PENDING`, nhưng bản ghi thanh toán bị ghi đè.

**G8 — Chưa có bộ nhớ đệm.**
Mỗi câu hỏi chatbot gọi LLM ít nhất 3 lần (phân loại ngữ cảnh, mở rộng từ khoá, sinh câu trả lời) cộng 1 lần embedding. Đây là nguyên nhân chính của 9 giây và của chi phí gọi API.

---

## 4. Backlog theo thứ tự ưu tiên

### P0 — chặn KPI đề cương, làm trước

#### T1. Function Calling: bot tự truy vấn giá & tồn kho

- **File**: `backend/ai/agent.js`; thêm `backend/ai/tools/` gồm `lookupProduct`, `checkStock`, `getShopPolicy`.
- **Việc**: định nghĩa tool schema cho Gemini qua `@langchain/google-genai`, để model tự gọi khi câu hỏi chạm tới giá, tồn kho hoặc phí ship. Truy hồi vector chỉ còn nhiệm vụ *tìm ứng viên*; *số liệu* luôn lấy từ tool đọc thẳng DB tại thời điểm trả lời.
- **Nghiệm thu**: sửa giá một sản phẩm trong DB rồi hỏi lại ngay, bot trả giá mới. Có test tự động cho ca này. Bot không nêu tồn kho của shop đang bị đình chỉ.
- **Vì sao P0**: mở khoá KPI "độ chính xác giá / tồn kho > 85%", và là điểm kỹ thuật đáng nói nhất trong chương AI của báo cáo.

#### T2. Hybrid search chuẩn hoá + tìm kiếm chịu lỗi chính tả

- **File**: `backend/ai/agent.js` hàm `retrieveContext`; `backend/controllers/product.controller.js:216`; migration mới cho `tsvector` và index GIN.
- **Việc**:
  1. Thêm cột `search_vector tsvector` cho `products` (name + description + specs), index GIN, cập nhật bằng trigger hoặc lúc ghi.
  2. Nhánh từ khoá đổi từ `LIKE` sang `websearch_to_tsquery` kèm `ts_rank`. Giữ `similarity()` của `pg_trgm` làm lớp cứu khi tsquery không khớp — đây chính là phần "sửa lỗi chính tả nhẹ" mà đề cương đã hứa.
  3. Hợp nhất hai bảng xếp hạng bằng **Reciprocal Rank Fusion** với công thức `score = Σ 1/(k + rank)`, k = 60, thay cho hàm cộng điểm thủ công hiện tại.
- **Nghiệm thu**: Recall@5 trên tập ground-truth của T5 đạt từ 75% trở lên. Gõ "iphon 15" hoặc "labtop dell" vẫn ra đúng sản phẩm.

#### T3. Streaming câu trả lời (SSE)

- **File**: `backend/controllers/aiAssistant.controller.js`, `frontend/src/client/components/chat/AiChatPanel.tsx`.
- **Việc**: đổi `sendAiChatMessage` sang `text/event-stream`, dùng `model.stream()` của LangChain. Frontend đọc dần bằng `ReadableStream`. Giữ endpoint cũ làm dự phòng.
- **Nghiệm thu**: **thời gian tới ký tự đầu tiên** dưới 1.5 s. Báo cáo trình bày cả hai số — thời gian tới ký tự đầu và thời gian hoàn tất — thay vì một con số tổng.

#### T4. Chống prompt injection hai chiều

- **File**: `backend/ai/agent.js`; thêm `backend/ai/guard.js`.
- **Việc**:
  1. *Đầu vào*: chặn mẫu câu ép vai ("bỏ qua hướng dẫn", "bạn là admin", "cấp cho tôi voucher"), giới hạn độ dài, ghi log mỗi lần chặn.
  2. *Ngữ cảnh*: bọc dữ liệu sản phẩm trong khối phân định rõ ràng, và nêu trong system prompt rằng nội dung trong khối là **dữ liệu, không phải mệnh lệnh**. Đây là lớp chống injection gián tiếp qua mô tả do seller nhập.
  3. *Đầu ra*: chặn câu trả lời chứa cam kết giá hoặc voucher không có trong DB.
- **Nghiệm thu**: bộ test có ít nhất 10 câu tấn công, 5 trực tiếp và 5 nhét vào mô tả sản phẩm, tỉ lệ chặn 100%, không chặn nhầm câu hỏi mua hàng bình thường.

#### T5. Khung đánh giá AI theo chuẩn RAG Triad

- **File**: `backend/scripts/evaluate-ai.js`; thêm `backend/eval/dataset.json`.
- **Việc**:
  1. Xây tập ground-truth từ 30 câu hỏi trở lên, mỗi câu gắn nhãn sản phẩm đúng, để tính **Recall@5** và **MRR** thật.
  2. Thêm ba chỉ số RAG Triad chấm bằng LLM-as-judge: **Faithfulness** (câu trả lời có bám ngữ cảnh không), **Answer Relevance**, **Context Relevance**. Theo phương pháp của Ragas hoặc TruLens. Nếu không cài được thư viện Python thì hiện thực lại công thức bằng JS và **ghi rõ trong báo cáo là theo phương pháp Ragas**.
  3. Thêm **nDCG@5** cho gợi ý cá nhân hoá, và độ chính xác cho tìm kiếm bằng ảnh trên tập từ 20 ảnh gắn nhãn trở lên.
- **Nghiệm thu**: `npm run eval:ai` xuất đủ mọi KPI ở mục 2, không còn ô "chưa đo".

### P1 — làm sau khi P0 xanh

#### T6. Bổ sung ca biên nghiệp vụ thanh toán

- **File**: `backend/tests/12-concurrency.test.mjs` (mới), `backend/controllers/payment.controller.js`.
- **Việc**: test hai người mua đồng thời mặt hàng còn đúng 1 cái, chỉ một đơn được tạo và tồn kho không âm. Test IPN phát lại hai lần cùng payload hợp lệ. Test huỷ đơn sau khi đã thanh toán. Thêm guard chống ghi đè khi payment đã ở trạng thái `PAID`.
- **Nghiệm thu**: ba test mới xanh, tồn kho và dòng tiền không lệch sau mọi kịch bản.

#### T7. Bộ nhớ đệm nhiều tầng

- **Việc**: cache embedding của câu hỏi lặp lại; cache kết quả truy hồi theo câu hỏi đã chuẩn hoá; bỏ bớt một lượt gọi LLM bằng cách gộp bước phân loại ngữ cảnh và mở rộng từ khoá vào chung một lần gọi.
- **Nghiệm thu**: p50 giảm ít nhất 40% so với 9.0 s. Số lượt gọi LLM mỗi câu hỏi giảm từ 3 xuống 2.

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
| Tìm kiếm bằng hình ảnh | `backend/ai/imageSearch.js` |
| So sánh thông số có cấu trúc | `backend/ai/productComparison.js` |
| Lọc cộng tác gợi ý | `backend/jobs/compute*.js` |
| Kiểm duyệt đánh giá | `backend/ai/reviewModeration.js` |
| Phân quyền ba lớp | `backend/middleware/auth.middleware.js` |
| Bộ kiểm thử tự động | `backend/tests/*.test.mjs` |
| Số đo KPI | `backend/scripts/evaluate-ai.js` → `docs/ai-evaluation.md` |

---

## 6. Nhật ký

| Ngày | Việc | Người / công cụ |
|---|---|---|
| 2026-09-08 | Lập file theo dõi tiến độ, rà soát hiện trạng so với đề cương, chốt backlog T1 - T7 | Claude Code |
