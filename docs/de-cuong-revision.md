# Đề cương — bản chỉnh sửa theo góp ý

> Soạn ngày 2026-09-08. Mỗi mục dưới đây là văn bản đã viết sẵn để dán thẳng vào
> file đề cương Word. Phần in nghiêng đầu mỗi mục giải thích lý do sửa, không dán vào.
>
> Mọi khẳng định kỹ thuật ở đây đều đã đối chiếu với mã nguồn hiện có. Xem
> [`PROGRESS.md`](../PROGRESS.md) để biết cái gì đã chạy và cái gì còn phải làm.

---

## 0. Bốn góp ý và tình trạng thực tế của hệ thống

| Góp ý | Tình trạng trong code | Việc cần làm |
|---|---|---|
| Nhấn mạnh concurrency và bất biến dòng tiền | **Đã hiện thực xong.** Trừ tồn kho, chiếm lượt voucher và chuyển trạng thái đơn đều dùng cập nhật có điều kiện (compare-and-set). Sai số làm tròn được đơn con cuối cùng hấp thụ. Đã có test đua voucher và test tổng tiền khớp. | Chỉ cần **viết vào đề cương và báo cáo**. Không phải code thêm. |
| Hybrid Search (BM25 + vector) | **Một nửa.** Nhánh vector pgvector đúng chuẩn; nhánh từ khoá còn là `LIKE %token%` không xếp hạng, hợp nhất bằng cộng điểm thủ công. | Nâng lên `tsvector` + `ts_rank`, hợp nhất bằng Reciprocal Rank Fusion. Task T2. |
| Function Calling để LLM tự truy giá / tồn kho | **Chưa có.** Giá đưa vào prompt là ảnh chụp lúc truy hồi; tồn kho không hề có trong ngữ cảnh. | Làm mới hoàn toàn. Task T1. Đây là việc quan trọng nhất. |
| Ragas / TruLens đo RAG Triad | **Chưa có.** Đã có harness tự viết (`npm run eval:ai`) đo tỉ lệ trích dẫn, đúng nhóm hàng, độ trễ, P/R/F1 kiểm duyệt. | Bổ sung Faithfulness, Answer Relevance, Context Relevance và tập ground-truth. Task T5. |

Hai đề xuất còn lại — chống prompt injection và streaming — đều chưa có trong code
và đều nên đưa vào đề cương. Riêng prompt injection, hệ thống đang có một lỗ hổng
đặc thù đáng viết hẳn một mục trong báo cáo: **mô tả sản phẩm do người bán tự nhập
được đưa thẳng vào ngữ cảnh của chatbot**, nên một gian hàng có thể nhét câu lệnh
vào mô tả để thao túng câu trả lời trong phiên của người mua khác. Đây là injection
gián tiếp, và nó chỉ tồn tại vì mô hình đa gian hàng cho phép nhiều bên cùng ghi dữ
liệu vào kho tri thức chung.

---

## 1. Bổ sung vào mục 3 — Phạm vi

*Lý do sửa: danh sách chức năng hiện tại đọc như danh mục CRUD. Thêm một khối
"Bài toán kỹ thuật trọng tâm" đặt trước phần liệt kê chức năng, để người đọc thấy
khối lượng công việc thật nằm ở đâu.*

**Bài toán kỹ thuật trọng tâm:**

- **Nhất quán giao dịch và xử lý tương tranh.** Khi nhiều người mua cùng đặt một
  mặt hàng sắp hết tồn, hoặc cùng dùng một mã giảm giá còn một lượt, hệ thống phải
  bảo đảm không bán vượt kho và không phát vượt lượt. Đề tài áp dụng cơ chế **cập
  nhật có điều kiện (optimistic concurrency)** thay cho đọc-rồi-ghi: điều kiện tồn
  kho và điều kiện số lượt được đặt ngay trong mệnh đề `WHERE` của câu lệnh cập
  nhật, để PostgreSQL đánh giá lại sau khi giao dịch trước commit. Giao dịch đến
  sau nhận kết quả không khớp và bị huỷ, thay vì cả hai cùng đi lọt.

- **Bất biến dòng tiền khi tách đơn.** Một lần thanh toán sinh ra một nhóm đơn và
  N đơn con thuộc N gian hàng. Tổng tiền các đơn con phải khớp tuyệt đối với số
  tiền người mua trả. Đề tài giải quyết bằng cách phân bổ khuyến mãi theo tỉ lệ giá
  trị từng shop, làm tròn một lần duy nhất tại điểm tính, và để đơn con cuối cùng
  hấp thụ phần sai số làm tròn.

- **Truy hồi trên dữ liệu biến động.** Giá và tồn kho của sàn thay đổi liên tục,
  trong khi vector nhúng chỉ được sinh lại theo chu kỳ. Đề tài tách vai trò: truy
  hồi vector chỉ chịu trách nhiệm *tìm đúng sản phẩm*, còn *số liệu giá và tồn kho*
  được mô hình lấy trực tiếp từ cơ sở dữ liệu qua cơ chế gọi hàm tại thời điểm trả
  lời.

- **An toàn cho tầng AI trên nền dữ liệu nhiều bên ghi.** Vì người bán tự nhập mô
  tả sản phẩm và mô tả đó tham gia vào ngữ cảnh của trợ lý ảo, hệ thống phải chống
  cả tấn công tiêm lệnh trực tiếp từ người dùng lẫn tiêm lệnh gián tiếp qua nội
  dung do gian hàng đăng.

**Bổ sung vào nhóm chức năng dành cho người dùng:**

- Trợ lý ảo trả lời theo lối hiển thị dần từng phần, cho phép người dùng đọc ngay
  những dòng đầu tiên thay vì chờ toàn bộ câu trả lời.

---

## 2. Bổ sung vào mục 5 — Phương pháp thực hiện

*Lý do sửa: đây là chỗ hội đồng tìm câu trả lời cho "đo bằng gì". Hiện đề cương
đưa KPI rất chi tiết nhưng không nói phương pháp đo.*

Thay đoạn "Kiểm thử" bằng:

- **Kiểm thử và đánh giá:**
  - Kiểm thử đầu cuối tự động trên `node:test`, bao phủ xác thực, phân quyền ba
    lớp, luồng thanh toán tách đơn, tích điểm, và các kịch bản biên về tương tranh.
  - Đánh giá chất lượng hệ truy hồi tăng cường sinh theo bộ ba chỉ số **RAG Triad**
    của khung **Ragas / TruLens**: **Faithfulness** (câu trả lời có trung thành với
    ngữ cảnh truy hồi được hay không), **Answer Relevance** (câu trả lời có đúng
    trọng tâm câu hỏi hay không), và **Context Relevance** (ngữ cảnh truy hồi được
    có liên quan tới câu hỏi hay không).
  - Xây tập dữ liệu đánh giá gắn nhãn thủ công gồm các câu hỏi mua sắm tiếng Việt
    kèm sản phẩm đúng, dùng để tính **Recall@5**, **MRR** cho truy hồi và **nDCG@5**
    cho danh sách gợi ý cá nhân hoá.
  - Đo hiệu năng theo hai mốc tách biệt: thời gian tới ký tự đầu tiên và thời gian
    hoàn tất câu trả lời.

- **Sử dụng công cụ lập trình hỗ trợ bởi trí tuệ nhân tạo** để rút ngắn giai đoạn
  hiện thực các chức năng nền, dành thời lượng tiết kiệm được cho các hạng mục kỹ
  thuật chiều sâu: xử lý tương tranh, tối ưu truy hồi, an toàn tầng AI và kiểm thử
  kịch bản biên.

---

## 3. Bổ sung vào mục 6 — Nền tảng công nghệ

*Lý do sửa: mục "Công nghệ cho tính năng nâng cao" đang mô tả kiến trúc RAG cơ bản.
Bổ sung bốn kỹ thuật để đủ sức nặng.*

- **Truy hồi lai (Hybrid Search):** kết hợp tìm kiếm toàn văn có xếp hạng của
  PostgreSQL với tìm kiếm tương đồng vector, hợp nhất hai bảng kết quả bằng thuật
  toán **Reciprocal Rank Fusion**. Bổ sung so khớp trigram làm lớp dự phòng để chịu
  được lỗi chính tả nhẹ.

- **Gọi hàm (Function Calling / Tool Use):** mô hình ngôn ngữ được cấp một bộ công
  cụ đọc cơ sở dữ liệu gồm tra cứu sản phẩm, kiểm tra tồn kho và tra chính sách vận
  chuyển của gian hàng. Mô hình tự quyết định gọi công cụ nào trước khi tổng hợp câu
  trả lời, nhờ đó giá và tồn kho nêu ra luôn là số liệu tại thời điểm hỏi.

- **Phản hồi theo luồng (Streaming Response):** máy chủ đẩy dần từng phần câu trả
  lời qua Server-Sent Events, giảm thời gian chờ cảm nhận được của người dùng.

- **Phòng thủ tiêm lệnh (Prompt Injection Defense):** lọc mẫu câu thao túng ở đầu
  vào, phân định rõ ranh giới giữa dữ liệu và mệnh lệnh trong ngữ cảnh để vô hiệu
  hoá tiêm lệnh gián tiếp qua nội dung do gian hàng đăng, và kiểm tra đầu ra để
  chặn các cam kết về giá hoặc ưu đãi không tồn tại trong cơ sở dữ liệu.

---

## 4. Chỉnh mục 7 — Kết quả mong đợi

*Lý do sửa: KPI hiện tại có hai chỉ số mà cách đo dễ bị chất vấn. "Thời gian phản
hồi dưới 6 giây" đo trên một cục trả lời hoàn chỉnh là bất lợi cho nhóm, trong khi
số đo hiện tại của hệ thống là p50 = 9.0 giây. Tách thành hai mốc vừa trung thực
vừa phản ánh đúng trải nghiệm.*

Thay hai gạch đầu dòng trong "Về hiệu năng và độ chính xác các module AI":

- Thời gian tới ký tự đầu tiên của câu trả lời dưới **1.5 giây**; thời gian hoàn tất
  toàn bộ câu trả lời dưới **8 giây** ở phân vị 95.
- Điểm **Faithfulness** và **Answer Relevance** theo khung Ragas đạt trên **0.75**
  trên tập đánh giá gắn nhãn.

Bổ sung một gạch đầu dòng vào "Về chức năng":

- Bảo đảm không bán vượt tồn kho và không phát vượt hạn mức mã giảm giá trong kịch
  bản nhiều người mua thao tác đồng thời, được chứng minh bằng bộ kiểm thử tương
  tranh tự động.

---

## 5. Bảng kế hoạch thực hiện — bản điều chỉnh

*Lý do sửa: gộp hai giai đoạn cài đặt giao diện và backend từ bốn tuần xuống hai
tuần nhờ công cụ lập trình hỗ trợ bởi AI, lấy hai tuần dôi ra cộng với việc sắp xếp
lại giai đoạn tích hợp để mở ba khối kỹ thuật chiều sâu. Các mốc từ 26/12 trở đi
giữ nguyên.*

| Giai đoạn | Thời gian | Công việc | Kết quả |
|---|---|---|---|
| Lên kế hoạch | 07/09 – 19/09 | Xác định phạm vi, mục tiêu, yêu cầu; phân công công việc | Phạm vi, mục tiêu, kế hoạch dự án |
| Khảo sát hệ thống | 20/09 – 27/09 | Khảo sát các website thương mại điện tử, thu thập yêu cầu người dùng | Tài liệu khảo sát, danh sách yêu cầu |
| Phân tích yêu cầu | 28/09 – 07/10 | Xây dựng sơ đồ use case, đặc tả chức năng, sơ đồ dữ liệu | Use case, ERD, đặc tả yêu cầu |
| Thiết kế giao diện | 08/10 – 18/10 | Thiết kế wireframe, prototype bằng Figma | Giao diện mẫu, prototype |
| Thiết kế CSDL & API | 19/10 – 29/10 | Thiết kế cơ sở dữ liệu, mô hình ERD, tài liệu API | ERD, tài liệu thiết kế dữ liệu & API |
| **Hiện thực nền tảng** | **30/10 – 12/11** | Dựng frontend React và backend Node.js/Prisma cho các chức năng nền, có hỗ trợ của công cụ lập trình AI | Ba phân hệ chạy được đầu cuối |
| **Kỹ thuật lõi: giao dịch & tương tranh** | **13/11 – 20/11** | Tách đơn đa gian hàng, voucher hai cấp, cập nhật có điều kiện chống bán vượt kho, bảo toàn bất biến dòng tiền | Luồng thanh toán đúng về tiền, có kiểm thử tương tranh |
| **Kỹ thuật AI nâng cao** | **21/11 – 04/12** | Truy hồi lai với Reciprocal Rank Fusion, gọi hàm truy vấn giá và tồn kho, phản hồi theo luồng, phòng thủ tiêm lệnh | Trợ lý ảo trả lời đúng số liệu thời gian thực và an toàn |
| Tích hợp & tối ưu | 05/12 – 18/12 | Tìm kiếm bằng ảnh, so sánh thông số, gợi ý cá nhân hoá, kiểm duyệt đánh giá, bộ nhớ đệm | Hoàn thiện năm module AI |
| **Xây dựng khung đánh giá AI** | **19/12 – 25/12** | Tập dữ liệu gắn nhãn, đo RAG Triad theo Ragas, Recall@5, nDCG@5, độ chính xác tìm kiếm ảnh | Báo cáo số đo cho toàn bộ KPI |
| Kiểm thử | 26/12 – 05/01 | Kiểm thử đơn vị, tích hợp, đầu cuối và hiệu năng, tập trung kịch bản biên của thanh toán | Hệ thống ổn định |
| Hoàn thiện & triển khai | 06/01 – 11/01 | Hoàn thiện chức năng, tối ưu hiệu năng, triển khai môi trường demo | Website triển khai thành công |
| Báo cáo & bảo vệ | 12/01 – 17/01 | Viết báo cáo, chuẩn bị slide, demo hệ thống | Báo cáo hoàn chỉnh, demo hệ thống |

---

## 6. Ghi chú khi viết báo cáo

Ba chỗ nên dành hẳn một mục riêng, vì đây là phần khó sao chép và dễ ghi điểm nhất:

1. **Cập nhật có điều kiện thay cho khoá bi quan.** Nên trình bày cả phương án đã
   cân nhắc rồi loại: `SELECT ... FOR UPDATE` giữ khoá suốt giao dịch nên nghẽn khi
   nhiều người cùng mua một sản phẩm nóng, trong khi cập nhật có điều kiện không
   giữ khoá đọc và cho kết quả đúng tương đương ở nghiệp vụ này. Kèm sơ đồ tuần tự
   hai người mua tranh nhau một sản phẩm còn một cái.

2. **Vì sao truy hồi vector một mình là không đủ cho thương mại điện tử.** Vector
   nắm ngữ nghĩa nhưng không nắm mã sản phẩm và số hiệu model; giá và tồn kho thì
   thay đổi nhanh hơn chu kỳ sinh nhúng. Đây chính là lập luận dẫn tới truy hồi lai
   và gọi hàm, hai kỹ thuật nên được trình bày như lời giải cho một vấn đề cụ thể
   chứ không phải như tính năng thêm vào cho đẹp.

3. **Tiêm lệnh gián tiếp trong mô hình đa gian hàng.** Nêu rõ đường tấn công: người
   bán nhập mô tả sản phẩm, mô tả được nhúng vào kho vector, kho vector cấp ngữ cảnh
   cho trợ lý ảo, trợ lý ảo trả lời người mua khác. Kèm ví dụ tấn công thật và kết
   quả trước và sau khi có lớp phòng thủ.
