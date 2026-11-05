# Tiến độ & việc cần làm — NGX E-Commerce

> Cập nhật: 2026-11-05. File này là **nguồn sự thật duy nhất** về "đang tới đâu".
> Đọc hết mục 0 → 4 trước khi viết dòng code nào. Xong việc thì ghi vào mục 6.

---

## 0. Dành cho AI coding agent (Cursor / Claude Code)

**Quy ước bắt buộc:**

- Database dev chạy ở **port 55432** (không phải 5432) vì máy dev đã có PostgreSQL 18 chiếm 5432. Xem `README.md` mục 1.
- Sau khi seed lại: dùng `npm run seed:full` (seed + sinh embedding). Nếu chỉ chạy `npm run seed`, bảng `product_embeddings` rỗng và chatbot RAG **âm thầm** tụt về tìm theo từ khoá — mọi số đo AI sẽ sai.
- **Quy tắc phân tầng**: route → controller → service → dữ liệu, một chiều. Controller **không được import controller khác**; service **không được biết `req`/`res`**. Xem `backend/docs/architecture.md` mục 1.
- Trước khi commit: `cd backend && npm test` (18 bộ test + `demo-readiness`, 140 ca). Test HTTP cần server đang chạy: mở một terminal khác chạy `node server.js` trước. Không commit khi test đỏ. Lệnh này **seed lại DB**, chạy xong nhớ `npm run embed:products`.
- Đo lại AI: `npm run eval:ai` → `backend/docs/ai-evaluation.md`.
- Đo truy hồi và RAG Triad: `npm run eval:rag` → `backend/docs/rag-evaluation.md`. Thêm `-- --quick` để chạy nhanh. Bản miễn phí của Gemini giới hạn 15 lượt/phút nên script tự giãn nhịp, chạy đầy đủ mất khoảng 4 phút.
- Đo tìm kiếm bằng ảnh: `npm run eval:image` — cần server đang chạy (`node server.js`), dùng thẳng ảnh có sẵn của sản phẩm seed, không cần chuẩn bị gì thêm.
- Đo nDCG gợi ý cá nhân hoá: `npm run eval:reco` — tự tạo dữ liệu giả lập cô lập rồi dọn sạch. **Chạy ngay sau `npm run seed:full`**: độ tương đồng tính trên toàn bộ đơn, nên đơn do `npm test` để lại (mua ngẫu nhiên) kéo nDCG từ 0.660 xuống 0.568; script in cảnh báo `[!]` khi phát hiện. Nếu script bị ngắt giữa chừng, chạy lại một lần sẽ tự dọn phần dữ liệu giả lập còn sót trước khi đo tiếp.
- Đo tải: khởi động backend với `RATE_LIMIT_ENABLED=0 node server.js` (chỉ khi đo, **không** ghi vào `.env`), rồi `npm run eval:load` → `backend/docs/load-test.md`. Thêm `LOAD_CONCURRENCY=300` để đo mức 300.
- Đo kiểm duyệt khi Gemini chậm: `REVIEW_MODERATION_TIMEOUT_MS=60000 npm run eval:ai`. Script từ chối ghi kết quả nếu có mẫu bị skip.
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
| Tìm kiếm bằng hình ảnh | Xong, đã đo | `ai/imageSearch.js`, `controllers/productImageSearch.controller.js` | `scripts/evaluate-image-search.js`, 100% (20/20) |
| So sánh sản phẩm bằng AI (trả JSON có cấu trúc) | Xong | `ai/productComparison.js` | — |
| Kiểm duyệt đánh giá tự động | Xong | `ai/reviewModeration.js` | `docs/ai-evaluation.md` mục 2 |
| Thu thập phản hồi chất lượng trả lời AI | Xong | `controllers/aiFeedback.controller.js` | — |
| Gợi ý cá nhân hoá (lọc cộng tác chạy nền) | Xong, đã đo | `jobs/computeProductSimilarity.js`, `jobs/computeUserRecommendations.js`, `jobs/scheduler.js` | `scripts/evaluate-recommendations.js`, nDCG@5 0.610 |
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
| Faithfulness (Ragas) | > 0.75 | chưa đo | **1.0** | Đạt |
| Answer Relevance (Ragas) | > 0.75 | chưa đo | **0.925** (2026-11-05, cỡ mẫu 8; các lần trong ngày 0.725-1.0) | Đạt |
| Context Relevance (Ragas) | - | chưa đo | **0.625** (2026-11-05; từ 0.275 ban đầu, 0.425 trước khi sửa nội dung embedding, xem T9) | Đạt mốc tự đặt 0.5 |
| Thời gian tới ký tự đầu tiên | < 1.5 s | không có streaming | **1.17-1.87 s** trung vị 30 câu qua 3 lần đo cùng mã (2026-11-05; một lần 3.06 s lúc Gemini quá tải). Phần do hệ thống: truy hồi ~2 ms ở 13/30 câu hỏi theo tên (bỏ embedding), ~0.5 s ở câu còn lại; phần LLM Gemini 0.9-2.8 s mỗi lượt | Đạt khi Gemini bình thường, không ổn định |
| Thời gian hoàn tất | < 8 s | p50 = 9.0 s | **1.4-2.2 s** trung vị 30 câu (2026-11-05) | Đạt |
| Độ chính xác giá / tồn kho | > 85% | chưa đo được | khớp tuyệt đối với DB | Đạt, xem ghi chú |
| Chặn tấn công tiêm lệnh | 100% | chưa có | **11/11**, chặn nhầm 0/10 | Đạt |
| Phát hiện bình luận vi phạm | > 80% | 100% (n = 10) | 100% (4/4) | Đạt, cỡ mẫu độc hại nhỏ |
| Chặn nhầm bình luận sạch | < 5% | chưa đo | **0%** (0/30, `npm run eval:ai`, 2026-11-05) | Đạt |
| API danh sách sản phẩm, 200 người đồng thời | p95 < 500 ms | 594 ms | **424 ms** (0 lỗi; `/products/:id` 191 ms, `/categories` 101 ms; lần đo trước 431 ms) | Đạt |
| Ổn định ở 300 người đồng thời | 0 lỗi | chưa đo | **0 lỗi / 4500 request**, p95 danh sách 650 ms | Ổn định, độ trễ vượt 500 ms |
| Nhận diện đúng khi tìm bằng ảnh | > 70% | chưa đo | **95%** (19/20, `npm run eval:image`, 2026-11-05; ca trượt là Gemini Vision không trả lời, lần trước 20/20) | Đạt |
| nDCG của gợi ý cá nhân hoá | > 0.60 | chưa đo | **0.660-0.675** (13 ca, `npm run eval:reco` ngay sau `seed:full`, 2026-11-05; 0.568 nếu đo sau `npm test`) | Đạt trên DB sạch |

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
| G3 | Tìm kiếm không chịu lỗi chính tả | Nhánh trigram dùng `word_similarity` thay vì `similarity`. **Ngày 09/09 mới chỉ sửa đường của chatbot**; ô tìm kiếm sản phẩm vẫn kẹt ở `contains` cho tới khi chuyển khả năng tìm kiếm sang `lib/productSearch.js` để cả hai dùng chung | `tests/13`; kiểm tra thực tế: `iphon`, `macbok pro`, `dell xsp 15`, `playstaton` đều ra đúng sản phẩm ở vị trí đầu |
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

### Đã đóng (2026-10-27)

| Mã | Vấn đề | Đã xử lý thế nào | Bằng chứng |
|---|---|---|---|
| G8 | Chưa có bộ nhớ đệm, TTFT chưa đạt | Cache thứ hạng RRF (id + điểm, KHÔNG cache giá/tồn kho — luôn đọc lại tươi qua `fetchRowsByIds`); chỉ `bindTools()` khi cần; cổng từ khoá bỏ lượt gọi embedding (~0.5 s) khi full-text + trigram cùng chọn một sản phẩm và tên khớp ≥ 2 token, chiếm ≥ 1/2 token có nghĩa, không phải câu phụ kiện/so sánh. TTFT 4.0 s → 1.17-1.87 s trung vị 30 câu; phần còn lại là độ trễ Gemini | `ai/retrieval.js` (rankCache, `isLexicalDecisive`), `ai/agent.js` (`needsTools`), `tests/16-retrieval-cache.test.mjs`, `npm run eval:rag` |
| G9 | Hai KPI vẫn chưa có phép đo | Tìm ảnh: dùng chính ảnh thứ hai trong thư viện sản phẩm seed (đã có sẵn, nhiều CDN thật) làm ảnh truy vấn, không cần gán nhãn tay — `scripts/evaluate-image-search.js`, **100% (20/20)**. Gợi ý cá nhân hoá: vì seed thật không có tín hiệu đồng mua/hành vi, dựng tập giả lập CÔ LẬP (4 nhóm sản phẩm cùng gu từ 20 sản phẩm seed thật, xoay vòng giấu 1 sản phẩm làm ground-truth), chạy qua đúng thuật toán CF thật rồi dọn sạch + tính lại `product_similarity` từ dữ liệu thật sau khi đo — `scripts/evaluate-recommendations.js`, **nDCG@5 = 0.610** (13 ca, sát ngưỡng) | `npm run eval:image`, `npm run eval:reco` |
| — (một phần của T9/G2) | Context Relevance thấp (0.275) | Chỉ giữ 1-2 ứng viên trong ngữ cảnh LLM khi cả 3 nhánh tìm kiếm cùng đồng ý hạng 1 (tín hiệu "hỏi đích danh sản phẩm"); **không** đụng vào `retrieveHybrid` vì Recall@5 đo trực tiếp trên hàm đó. Context Relevance tăng 0.275 → 0.425, Recall@5 không đổi (100%) | `ai/retrieval.js` (`pickConfidentSubset`), `npm run eval:rag` |

### Còn lại

**T7 — phần hệ thống đã gần sàn, phần còn lại thuộc Gemini.** Đo tách
(2026-11-05): full-text + trigram ~2 ms, gọi embedding ~0.5 s, LLM tới token
đầu 0.9-2.8 s tuỳ tải phía Google. Tắt "thinking" (`thinkingLevel: LOW`,
`thinkingBudget: 0`, có từ `@langchain/google-genai` 2.x) không nhanh hơn trên
`gemini-3.1-flash-lite`. Cổng từ khoá bỏ embedding ở 13/30 câu. Muốn chắc
dưới 1.5 s thì phải đổi model/nhà cung cấp hoặc đặt máy gần region của API.

**nDCG 0.660-0.675 trên DB vừa seed, nhưng nhạy với dữ liệu đơn hàng khác** (0.568 sau `npm test`). Nếu
thay đổi thuật toán CF (`jobs/computeUserRecommendations.js`,
`jobs/computeProductSimilarity.js`) thì chạy lại `npm run eval:reco` để biết
có tụt dưới ngưỡng hay không.

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

### Đã làm 2026-10-27 (một phần)

#### T7. Hạ thời gian tới ký tự đầu tiên xuống dưới 1.5 s — đạt khi Gemini bình thường

- **Đã làm**: (1) chỉ bind tool khi ngữ cảnh rỗng hoặc câu hỏi chạm màu/ship
  (`needsTools` trong `ai/agent.js`); (2) cache thứ hạng RRF theo câu hỏi đã
  chuẩn hoá, KHÔNG cache giá/tồn kho (`ai/retrieval.js`, `fetchRowsByIds`
  trong `lib/productSearch.js` đọc lại tươi mỗi lần).
- **Việc 3 (2026-11-05)**: tắt chế độ suy nghĩ — đã đo, không nhanh hơn trên
  `gemini-3.1-flash-lite`, không áp dụng. (4) Cổng từ khoá bỏ embedding ở câu
  hỏi theo tên (`isLexicalDecisive`).
- **Kết quả đo**: TTFT 4.0s → ~2.5-3.6s. Faithfulness không tụt (lên 1.0).
  **Chưa đạt 1.5s** — xem phân tích ở mục 3.
- **Nghiệm thu gốc**: TTFT trung vị dưới 1.5s trên tập 30 câu — `eval:rag` nay đo
  đủ 30 câu; đạt 1.17 s ở lần Gemini bình thường, 1.59-1.87 s ở các lần khác.

#### T8. Đo hai KPI còn thiếu — xong

- `scripts/evaluate-image-search.js` (`npm run eval:image`): dùng ảnh thứ hai
  trong thư viện mỗi sản phẩm seed làm ảnh truy vấn. **100% (20/20)**.
- `scripts/evaluate-recommendations.js` (`npm run eval:reco`): tập giả lập cô
  lập, dọn sạch sau khi đo. **nDCG@5 = 0.610**.
- **Nghiệm thu**: bảng ở mục 2 không còn ô "chưa đo". Đạt.

#### T9. Nâng Context Relevance — xong (2026-11-05)

- `pickConfidentSubset` trong `ai/retrieval.js`, áp dụng sau `retrieveHybrid`
  (không đụng chính hàm đó, vì Recall@5 đo trực tiếp trên nó). 0.275 → 0.425.
- **Lỗi gốc tìm thấy 2026-11-05**: `scripts/embed-products.js` đọc `specs_detail`
  (dạng nhóm `[{category, items}]`) như mảng phẳng, nên nội dung embedding của MỌI
  sản phẩm là `Specs: : "" | : ""`. Vector không biết thông số, và chatbot
  không thấy thông số trong ngữ cảnh (câu "laptop có card RTX 4060" bị chấm CR 0).
  Đã sửa + test; DB cũ cần `npm run embed:products:force`.
- Câu qua cổng từ khoá (tên đã khớp) chỉ đưa 1 ứng viên vào ngữ cảnh thay vì 2.
- **Kết quả đo**: Context Relevance **0.625**, Recall@5 100%, AR 0.925, F 1.0.
  `eval:rag` nay in điểm từng câu (mục 4 của `docs/rag-evaluation.md`).

### P2 — nếu còn thời gian

- **Xong (2026-11-05)** — Giữ chân + phễu chuyển đổi: `GET /api/dashboard/behavior?days=30` (admin), khối "Retention & phễu chuyển đổi" ở `/admin`. Test: `tests/17-behavior-analytics`.
- **Xong (2026-11-05)** — Tỉ lệ phản hồi tích cực so với mốc 80%: trang `/admin/ai-feedback`, hiện "Chưa đủ mẫu" khi n < 20 thay vì một tỉ lệ vô nghĩa.
- **Xong (2026-11-05)** — Nhật ký lượt bị chặn do nghi tiêm lệnh: lọc `AI_GUARD_BLOCK` ở `/admin/audit`.
- **Xong (2026-11-05)** — Giám sát: `middleware/metrics.middleware.js` đo p50/p95/5xx theo mẫu route (không đọc body/query/header), cảnh báo `console.error` có throttle 60s khi p95 > 500 ms hoặc ≥ 5 lỗi 5xx; `GET /api/health` (admin) trả số đo + số lượt gọi Gemini trong ngày. Test: `tests/18-metrics`. Màn hình `/admin/health` (menu System Health) hiện uptime, tổng 5xx, số route p95 > 500 ms, lượt gọi Gemini trong ngày và bảng route xếp theo p95, tự làm mới 15 s. Kênh thứ hai: thông báo in-app cho từng admin (`notifyAdmins`, không broadcast) khi một route vừa vượt ngưỡng, throttle chung 10 phút.

---


## 5. Bản đồ đề cương → thư mục code

| Mục đề cương | Nơi hiện thực |
|---|---|
| Tách đơn, voucher hai cấp, bất biến dòng tiền | `backend/controllers/order.controller.js` và `docs/architecture.md` mục 2 |
| Chatbot RAG trên cơ sở dữ liệu vector | `backend/ai/agent.js`, bảng `product_embeddings` |
| Quy tắc tính tiền, phân bổ, bất biến dòng tiền | `backend/services/pricing.service.js` |
| Tích điểm, hạng thành viên, voucher thăng hạng | `backend/services/loyalty.service.js` |
| Ghi nhật ký thao tác | `backend/services/audit.service.js` |
| Phân trang và chặn trên `limit` | `backend/lib/pagination.js` |
| Tìm kiếm sản phẩm (full-text, trigram, RRF) | `backend/lib/productSearch.js` |
| Đồng bộ bộ lọc từ thông số sản phẩm | `backend/services/filterSync.service.js` |
| Giải bộ lọc động ra danh sách sản phẩm | `backend/services/productFilter.service.js` |
| Xử lý lỗi tập trung, ánh xạ mã lỗi Prisma | `backend/middleware/error.middleware.js` |
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
| 2026-09-09 | Dọn kiến trúc: lập tầng `services/`, gỡ 8 chỗ controller import controller. Tách quy tắc tính tiền khỏi `createOrder` thành `pricing.service.js`, nhờ đó bất biến dòng tiền kiểm thử được bằng 1100 giỏ hàng ngẫu nhiên trong 5ms thay vì phải đặt đơn thật qua HTTP | Claude Code |
| 2026-09-09 | 12/14 endpoint danh sách vốn bỏ qua `lib/pagination.js` và tự tính phân trang, nên `?limit=999999` kéo được cả bảng. Bổ sung `take` và `clampLimit` vào helper rồi đưa toàn bộ về dùng chung | Claude Code |
| 2026-09-09 | Bọc 129 handler bằng `asyncHandler`, gỡ 129 khối `try/catch` chỉ để log rồi trả 500. Hạ tầng xử lý lỗi đã viết sẵn từ trước nhưng chưa nơi nào dùng. Lỗi Prisma giờ được ánh xạ sang status có nghĩa thay vì 500 cho tất cả | Claude Code |
| 2026-09-09 | Chuyển khả năng tìm kiếm từ `ai/retrieval.js` sang `lib/productSearch.js`. Nhờ đó ô tìm kiếm sản phẩm dùng chung full-text + trigram với chatbot, đóng nốt phần còn lại của G3. Thêm `fetchRankedProducts` vì `where id in [...]` làm mất thứ hạng RRF | Claude Code |
| 2026-09-09 | Tách `syncFilterOptionsFromProducts` (179 dòng) và bộ giải bộ lọc động (186 dòng) ra khỏi controller thành `services/filterSync.service.js` và `services/productFilter.service.js` | Claude Code |
| 2026-10-27 | T7 (một phần): cache thứ hạng RRF (không cache giá/tồn kho) + chỉ bind tool khi cần. TTFT 4.0s → ~2.5-3.6s, chưa đạt 1.5s. `ai/retrieval.js`, `ai/agent.js`, `lib/productSearch.js` (`fetchRowsByIds`), `tests/16-retrieval-cache.test.mjs` | Claude Code |
| 2026-10-27 | T9: `pickConfidentSubset` giảm ngữ cảnh LLM còn 1-2 ứng viên khi cả 3 nhánh tìm kiếm đồng ý hạng 1 (tách khỏi `retrieveHybrid` để không ảnh hưởng Recall@5). Context Relevance 0.275 → 0.425, Recall@5 không đổi | Claude Code |
| 2026-10-27 | T8: đo xong 2 KPI còn thiếu. Tìm ảnh dùng ảnh thứ hai có sẵn của từng sản phẩm seed, không cần gán nhãn tay — 100% (20/20). nDCG@5 dùng tập giả lập cô lập, dọn sạch sau khi đo — 0.610. `scripts/evaluate-image-search.js`, `scripts/evaluate-recommendations.js`, export + guard `main()` trong `jobs/computeUserRecommendations.js` để eval import được mà không chạy nhầm job thật | Claude Code |
| 2026-11-05 | Đo tải 200 người đồng thời: danh sách sản phẩm p95 594 ms, vượt mốc 500 ms. CPU profile cho thấy nút cổ chai là parse kết quả Prisma + `JSON.stringify` trên một thread, không phải DB (nâng pool lên 60 còn tệ hơn). Bỏ `specs_detail` khỏi các endpoint danh sách (`lib/productQuery.js`, chỉ trang chi tiết đọc cột này qua `/products/:id`): payload 62 KB → 52 KB, p95 594 → 431 ms. Ở 300 người: 0 lỗi, p95 650 ms | Claude Code |
| 2026-11-05 | Review code + bảo mật diff chưa commit. Sửa trong `ai/retrieval.js`: cache thứ hạng có trần 1000 khoá (trước đó tăng vô hạn theo câu hỏi người dùng), khoá cache tách có/không nhánh vector, không cache khi một nhánh lỗi, cache hit bỏ sản phẩm đã xoá thay vì trả mục rỗng (từng sinh `product_id: NaN` trong công cụ). Sửa `getBehaviorAnalytics`: tử số giỏ hàng → đơn chỉ đếm người mua nằm trong tập đã thêm giỏ (trước đó có thể > 100%), bỏ khoá `sess:unknown` gộp mọi khách vô danh thành một | Claude Code |
| 2026-11-05 | `eval:rag` từng đo TTFT khi cache thứ hạng đã nóng từ phần A của chính script, nên con số ~2.5-3.6 s có thể thấp hơn thực tế. Thêm `scripts/_disable-rank-cache.js` (import đầu tiên), `AI_RETRIEVAL_CACHE_TTL_MS<=0` tắt hẳn cache. `eval:ai` và `eval:rag` chưa chạy lại được vì Gemini trả `503 Service Unavailable` (high demand) | Claude Code |
| 2026-11-05 | Đo lại sau khi Gemini hết 503. `eval:ai`: kiểm duyệt 34 mẫu (30 sạch, 4 độc hại), chặn nhầm 0/30, recall 4/4; mẫu lỗi gọi model được gọi lại tối đa 2 lần, cùng mẫu cùng nhãn. `eval:rag` (đã tắt cache): Recall@5 100%, MRR 0.919, F 1.0, AR 0.85, CR 0.363, TTFT 1.61 s, tổng 1.88 s. TTFT vẫn trên mốc 1.5 s; độ trễ phụ thuộc mạnh vào tải phía Gemini (cùng ngày có lúc một lượt kiểm duyệt mất 21 s) | Claude Code |
| 2026-11-05 | Dọn nợ: (1) màn hình `/admin/health`. (2) `tsc -b` frontend từ 27 lỗi về 0; xoá `PriceRangeFilter`/`ToggleFilter` không ai dùng; hook `useAdminFilterOption` trước trả `AxiosResponse` nên form sửa filter đọc nhầm lớp và để trống, nay unwrap `.data` trong hook. (3) `npm audit`: frontend 0 lỗ hổng (`audit fix` + `overrides` ép `minimatch ^11.0.4` cho `typescript-estree`/`glob`); backend nâng `@langchain/core` 1.3, `@langchain/google-genai` 2.3, `nodemailer` 10, còn 3 lỗ hổng high trong chuỗi CLI `prisma` 6 (`@prisma/config`, `effect`, `deepmerge-ts`), chỉ hết khi lên Prisma 7 (driver adapter + `prisma.config.ts`), để quyết riêng. Test 139/140 (ca đỏ vẫn là MoMo sandbox). `eval:rag` sau nâng cấp: Recall@5 100%, MRR 0.919, F 1, AR 0.875, CR 0.425, TTFT 1.42 s, tổng 1.81 s | Claude Code |
| 2026-11-05 | T7: đo tách TTFT (truy hồi từ khoá ~2 ms, embedding ~0.5 s, LLM 0.9-2.8 s). Tắt thinking không giúp. Thêm cổng từ khoá trong `retrieveHybrid`: bỏ embedding khi full-text + trigram cùng chọn hạng 1 và tên khớp đủ token (13/30 câu, Recall@5 vẫn 100%, MRR 0.919). Bản đầu chỉ xét đồng thuận đã mở nhầm cho "sạc nhanh cho iPhone" và làm AR tụt 0.725; siết thêm điều kiện tên + chặn câu phụ kiện/so sánh. `eval:rag` đo TTFT trên đủ 30 câu. Cảnh báo hiệu năng gửi in-app cho admin, chỉ khi route vừa vượt ngưỡng (c5xx là bộ đếm trọn đời, báo theo trạng thái sẽ lặp mãi). Test 144/145 | Claude Code |
| 2026-11-05 | T9: bảng điểm theo câu cho thấy câu hỏi theo thông số có CR 0. Nguyên nhân: nội dung embedding bỏ trống toàn bộ thông số (`buildContent` đọc sai dạng nhóm của `specs_detail`). Sửa + test + embed lại. Câu đã qua cổng tên chỉ giữ 1 ứng viên. CR 0.425 → 0.625, AR 0.925, TTFT 1.43 s trung vị 30 câu. Test 145/146 + 1 bỏ qua có chủ đích (bảng embedding rỗng ngay sau reseed) | Claude Code |
| 2026-11-05 | Đo lại sau khi sửa embedding: tìm bằng ảnh 19/20 (ca trượt do Gemini Vision lỗi). nDCG ra 0.568 < 0.60; thuật toán không đổi, nguyên nhân là 20 đơn ngẫu nhiên do `npm test` để lại làm nhiễu `product_similarity`. Sau `seed:full`: 0.660 và 0.675. `eval:reco` nay cảnh báo khi có đơn ngoài seed | Claude Code |
