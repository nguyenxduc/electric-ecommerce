# ĐỀ CƯƠNG CHI TIẾT — BẢN 2

> Bản này đã chỉnh theo góp ý của cán bộ hướng dẫn. Toàn văn dưới đây dùng để
> dán vào file Word theo mẫu của trường. Phần tiêu đề trường, quốc hiệu và khối
> ký tên giữ nguyên như bản gốc.
>
> Xem [`de-cuong-revision.md`](./de-cuong-revision.md) để biết chỗ nào đã đổi và vì sao.

---

**ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH**
**TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN**

**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**
**Độc Lập - Tự Do - Hạnh Phúc**

## ĐỀ CƯƠNG CHI TIẾT

**TÊN ĐỀ TÀI TIẾNG VIỆT:** Hệ thống sàn thương mại điện tử thiết bị điện tử đa gian hàng tích hợp Trí tuệ nhân tạo hỗ trợ tư vấn và cá nhân hóa

**TÊN ĐỀ TÀI TIẾNG ANH:** An AI-powered Multi-vendor E-commerce System for Electronics Featuring Retrieval-Augmented Recommendation and Personalization

**Cán bộ hướng dẫn:** TS. Lê Văn Tuấn

**Thời gian thực hiện:** Từ ngày 07/09/2026 đến ngày 17/01/2027

**Sinh viên thực hiện:** Cao Tùng Dương – 23520343, Nguyễn Công Đức – 23520307

---

## Nội dung đề tài

### 1. Lý do chọn đề tài

- Trong bối cảnh bùng nổ của nền kinh tế số hiện nay, thương mại điện tử nói chung và thị trường kinh doanh thiết bị điện tử nói riêng đang phát triển với tốc độ vượt bậc. Xu hướng mua sắm trực tuyến dịch chuyển mạnh mẽ sang mô hình sàn đa gian hàng, nơi người tiêu dùng có thể tiếp cận hàng nghìn thương hiệu và nhà bán lẻ khác nhau trên cùng một nền tảng. Tuy nhiên, việc mua sắm từ nhiều gian hàng trong cùng một giao dịch đặt ra thách thức lớn về mặt kỹ thuật trong quản trị vận hành: hệ thống cần xử lý bài toán tách đơn hàng tự động từ một nhóm đơn chung thành các đơn con độc lập, áp dụng voucher hai cấp của sàn và của từng shop, đồng thời bảo toàn tính bất biến về dòng tiền và quy trình xử lý đơn riêng biệt cho từng người bán.

- Độ khó thực sự của mô hình này nằm ở tính đúng đắn khi có tương tranh. Một mặt hàng chỉ còn vài đơn vị tồn kho có thể được nhiều người mua bấm thanh toán trong cùng một khoảnh khắc; một mã giảm giá giới hạn số lượt có thể bị nhiều giao dịch cùng tranh nhau. Nếu hệ thống chỉ kiểm tra điều kiện rồi mới ghi dữ liệu, mọi giao dịch đồng thời đều đọc thấy trạng thái còn hàng và cùng đi lọt, dẫn tới bán vượt kho hoặc phát vượt hạn mức khuyến mãi. Bên cạnh đó, khi một lần thanh toán được tách thành nhiều đơn con thuộc nhiều gian hàng, tổng tiền các đơn con phải khớp tuyệt đối với số tiền người mua đã trả, kể cả sau khi phân bổ khuyến mãi theo tỉ lệ và làm tròn. Đây là các bài toán về nhất quán giao dịch, không phải bài toán về khối lượng mã nguồn.

- Mặt khác, thiết bị điện tử là nhóm sản phẩm có độ phức tạp cao về mặt thông số kỹ thuật, biến thể và mức giá. Khi mua sắm, người tiêu dùng thường gặp rào cản lớn trong việc tra cứu, đối chiếu cấu hình hay tìm kiếm đúng thiết bị khi chỉ có hình ảnh thực tế. Đa số các nền tảng thương mại điện tử hiện nay mới dừng lại ở việc tìm kiếm từ khóa truyền thống và hiển thị danh mục tĩnh, chưa khai thác hiệu quả sức mạnh của Trí tuệ nhân tạo. Việc tích hợp các mô hình ngôn ngữ lớn và kỹ thuật truy hồi tăng cường sinh kết hợp với cơ sở dữ liệu vector sẽ cho phép hệ thống tư vấn sản phẩm trực tiếp theo ngữ cảnh thực tế của sàn, hỗ trợ tìm kiếm bằng thị giác máy tính và tự động sinh bảng so sánh thông số kỹ thuật một cách chuẩn xác.

- Tuy nhiên, áp dụng truy hồi tăng cường sinh vào thương mại điện tử có đặc thù riêng so với các miền dữ liệu tĩnh thường thấy. Giá bán, tồn kho và trạng thái hoạt động của gian hàng thay đổi liên tục, trong khi vector nhúng chỉ được sinh lại theo chu kỳ; mã sản phẩm và số hiệu dòng máy lại là loại thông tin mà tìm kiếm theo ngữ nghĩa nắm bắt kém. Ngoài ra, do người bán tự nhập mô tả sản phẩm và mô tả đó tham gia vào ngữ cảnh của trợ lý ảo, hệ thống phải đối mặt với nguy cơ tiêm lệnh gián tiếp, tức một gian hàng nhúng câu lệnh vào nội dung đăng bán để thao túng câu trả lời dành cho người mua khác. Những đặc thù này đòi hỏi các giải pháp kỹ thuật chuyên biệt chứ không thể dùng kiến trúc truy hồi cơ bản.

- Bên cạnh đó, trải nghiệm mua sắm hiện đại đòi hỏi mức độ cá nhân hóa sâu sắc và các cơ chế giữ chân khách hàng dài hạn. Khách hàng cần nhận được các gợi ý sản phẩm phù hợp dựa trên hành vi duyệt web và lịch sử giao dịch thông qua các thuật toán lọc cộng tác. Đồng thời, việc chuẩn hóa chương trình khách hàng thân thiết với hệ thống tích điểm và thăng hạng thành viên rõ ràng gồm các hạng Đồng, Bạc, Vàng và Bạch Kim kết hợp hệ số nhân quyền lợi sẽ tạo động lực tương tác mạnh mẽ, giúp tối ưu hóa giá trị vòng đời khách hàng và thúc đẩy tăng trưởng bền vững cho toàn sàn.

- Xuất phát từ những yêu cầu thực tiễn và thách thức công nghệ trên, đề tài "Hệ thống sàn thương mại điện tử thiết bị điện tử đa gian hàng tích hợp Trí tuệ nhân tạo hỗ trợ tư vấn và cá nhân hóa" được lựa chọn nhằm nghiên cứu, hiện thực hóa một nền tảng thương mại điện tử đa gian hàng hoàn chỉnh. Trong bối cảnh các công cụ lập trình hỗ trợ bởi trí tuệ nhân tạo đã đảm nhiệm phần lớn công việc viết mã cho các chức năng nền, nhóm xác định trọng tâm nghiên cứu của đề tài đặt vào kiến trúc hệ thống, tính đúng đắn của giao dịch và chiều sâu của các giải pháp trí tuệ nhân tạo, thay vì đặt vào khối lượng mã nguồn của các chức năng quản lý dữ liệu thông thường.

### 2. Mục tiêu

- **Xây dựng sàn thương mại điện tử đa gian hàng chuyên về thiết bị điện tử:** Cung cấp giao diện trực quan cho người mua, người bán và quản trị viên; hỗ trợ giỏ hàng gom nhiều shop, áp dụng voucher hai cấp và thanh toán tách đơn tự động chính xác về dòng tiền.

- **Bảo đảm tính đúng đắn của nghiệp vụ khi có tương tranh:** Thiết kế cơ chế kiểm soát truy cập đồng thời để hệ thống không bán vượt tồn kho và không phát vượt hạn mức mã giảm giá khi nhiều người dùng thao tác cùng lúc, đồng thời giữ bất biến dòng tiền khi một lần thanh toán được tách thành nhiều đơn con.

- **Tích hợp các mô hình trí tuệ nhân tạo hỗ trợ mua sắm:** Triển khai chatbot tư vấn truy hồi trên cơ sở dữ liệu vector kết hợp tìm kiếm toàn văn, cho phép mô hình tự truy vấn giá và tồn kho thời gian thực trước khi trả lời; tìm kiếm bằng hình ảnh; tự động sinh bảng so sánh thông số kỹ thuật; lọc đánh giá tự động và gợi ý sản phẩm cá nhân hóa.

- **Bảo đảm an toàn và chất lượng trải nghiệm cho tầng trí tuệ nhân tạo:** Xây dựng cơ chế phòng thủ chống tiêm lệnh ở cả đầu vào của người dùng lẫn nội dung do gian hàng đăng, và hiển thị câu trả lời theo luồng để giảm độ trễ cảm nhận được.

- **Quản lý vận hành và chăm sóc khách hàng hiệu quả:** Cung cấp bảng điều khiển xử lý đơn và doanh thu riêng cho từng shop; hỗ trợ quản trị viên duyệt, đình chỉ gian hàng đồng bộ; vận hành hệ thống tích điểm và thăng hạng thành viên bốn cấp độ.

- **Thiết lập nền tảng kỹ thuật an toàn và dễ mở rộng:** Xây dựng hệ thống giao diện lập trình ứng dụng RESTful, cơ chế phân quyền ba lớp chặt chẽ, giao tiếp thời gian thực ổn định, bộ kiểm thử tự động toàn diện và khung đánh giá định lượng cho các module trí tuệ nhân tạo.

### 3. Phạm vi

- **Nền tảng hỗ trợ:** Triển khai trên Website.

#### Bài toán kỹ thuật trọng tâm

- **Nhất quán giao dịch và xử lý tương tranh:** Áp dụng cơ chế cập nhật có điều kiện thay cho quy trình đọc rồi ghi. Điều kiện về tồn kho và về số lượt còn lại của mã giảm giá được đặt ngay trong mệnh đề lọc của câu lệnh cập nhật, để hệ quản trị cơ sở dữ liệu đánh giá lại điều kiện sau khi giao dịch trước hoàn tất. Giao dịch đến sau nhận kết quả không khớp và bị hủy, thay vì cả hai cùng được ghi nhận.

- **Bất biến dòng tiền khi tách đơn:** Một lần thanh toán sinh ra một nhóm đơn và nhiều đơn con thuộc nhiều gian hàng. Khuyến mãi được phân bổ theo tỉ lệ giá trị hàng của từng shop, mỗi khoản giảm giá chỉ làm tròn một lần duy nhất tại điểm tính, và đơn con cuối cùng hấp thụ phần sai số làm tròn để tổng các đơn con luôn bằng đúng số tiền đã thanh toán.

- **Truy hồi trên dữ liệu biến động:** Tách bạch vai trò giữa hai tầng. Truy hồi lai gồm tìm kiếm toàn văn có xếp hạng kết hợp tìm kiếm tương đồng vector chịu trách nhiệm tìm đúng sản phẩm; còn số liệu về giá, tồn kho và chính sách vận chuyển được mô hình lấy trực tiếp từ cơ sở dữ liệu thông qua cơ chế gọi hàm tại thời điểm trả lời.

- **An toàn cho tầng trí tuệ nhân tạo trên nền dữ liệu nhiều bên cùng ghi:** Phòng thủ hai lớp trước tấn công tiêm lệnh trực tiếp từ người dùng và tiêm lệnh gián tiếp qua mô tả sản phẩm do người bán đăng, nhằm ngăn việc trợ lý ảo bị lừa để đưa ra cam kết giảm giá hoặc cấp mã ưu đãi không tồn tại trong hệ thống.

#### Chức năng dành cho người dùng

- **Quản lý tài khoản và hồ sơ:** Đăng ký, đăng nhập bảo mật, xác thực qua thư điện tử, quản lý thông tin cá nhân và nộp đơn đăng ký mở gian hàng.
- **Tìm kiếm và bộ lọc động:** Tìm kiếm văn bản hỗ trợ sửa lỗi chính tả nhẹ, tìm kiếm bằng hình ảnh và lọc sản phẩm theo các thông số kỹ thuật được cấu hình linh hoạt.
- **Chi tiết sản phẩm và danh sách yêu thích:** Thư viện ảnh, biến thể màu sắc, thông số cấu hình, lưu sản phẩm quan tâm và chọn danh sách để so sánh.
- **Giỏ hàng và thanh toán đa gian hàng:** Gom sản phẩm theo từng shop, áp dụng đồng thời mã giảm giá của sàn và của shop, tự động tách đơn con khi thanh toán với các cổng thanh toán trực tuyến hoặc khi nhận hàng.
- **Quản lý đơn hàng và đổi trả:** Theo dõi tiến trình xử lý đơn, hủy đơn chưa xử lý và gửi yêu cầu đổi trả kèm lý do đối với đơn hàng đã giao thành công.
- **Tư vấn bằng trợ lý ảo:** Hỏi đáp theo ngữ cảnh sản phẩm thực tế của sàn, nhận câu trả lời hiển thị dần theo luồng để không phải chờ toàn bộ nội dung, và đánh giá mức hữu ích của từng câu trả lời.
- **Đánh giá và tương tác:** Chấm điểm, viết nhận xét sản phẩm, nhắn tin thời gian thực với quản trị viên sàn hoặc với từng gian hàng riêng biệt.
- **Chương trình khách hàng thân thiết:** Tích lũy điểm thưởng theo giá trị đơn hàng, nâng hạng thành viên qua bốn cấp độ từ Đồng đến Bạch Kim để nhận ưu đãi lũy tiến.
- **Trung tâm thông báo:** Nhận cập nhật thời gian thực về biến động trạng thái đơn hàng, kết quả duyệt mở shop và thông báo chung từ hệ thống.

#### Chức năng dành cho người bán

- **Quản lý gian hàng:** Thiết lập hồ sơ shop, cập nhật thông tin liên hệ, tùy chỉnh mức phí vận chuyển và ngưỡng miễn phí ship riêng biệt.
- **Quản lý sản phẩm:** Thêm mới, cập nhật, xóa mềm sản phẩm, thiết lập giá bán, giá ưu đãi, thư viện hình ảnh và bảng thông số kỹ thuật.
- **Xử lý đơn hàng độc lập:** Quản lý danh sách đơn con thuộc gian hàng, cập nhật các trạng thái từ tiếp nhận, đóng gói, vận chuyển đến giao hàng.
- **Khuyến mãi và đổi trả:** Tự tạo mã giảm giá áp dụng riêng cho gian hàng, tiếp nhận và duyệt hoặc từ chối các yêu cầu đổi trả từ người mua.
- **Báo cáo và chăm sóc khách hàng:** Theo dõi biểu đồ doanh thu, số đơn chờ xử lý, số tiền thực nhận sau khi trừ phí sàn và trao đổi trực tiếp với khách hàng.

#### Chức năng dành cho người quản trị

- **Bảng điều khiển tổng quan:** Thống kê doanh thu, lưu lượng đơn hàng, số lượng khách hàng và các sản phẩm bán chạy trên toàn hệ thống.
- **Kiểm duyệt gian hàng:** Tiếp nhận hồ sơ mở shop, phê duyệt, từ chối hoặc đình chỉ hoạt động gian hàng kèm cơ chế tự động ẩn toàn diện sản phẩm trên sàn.
- **Quản lý danh mục và bộ lọc:** Thiết lập danh mục đa cấp, cấu hình danh sách khóa lọc và đồng bộ tự động giá trị lọc từ dữ liệu sản phẩm.
- **Kiểm soát dữ liệu toàn sàn:** Can thiệp quản lý sản phẩm, đơn hàng, khách hàng, điều chỉnh điểm tích lũy và ban hành mã giảm giá cấp sàn.
- **Giám sát chất lượng trí tuệ nhân tạo:** Theo dõi thống kê phản hồi của người dùng về câu trả lời của trợ lý ảo và nhật ký các lượt bị chặn do nghi ngờ tấn công tiêm lệnh.
- **Vận hành và giám sát:** Cấu hình tham số vận hành chung, phát thông báo toàn sàn, xử lý khiếu nại khách hàng và theo dõi nhật ký thao tác để đảm bảo an toàn hệ thống.

### 4. Đối tượng sử dụng

- **Người dùng:** Duyệt và tìm kiếm sản phẩm qua danh mục, từ khóa hoặc hình ảnh; gom sản phẩm từ nhiều shop vào chung giỏ hàng; áp dụng mã giảm giá của sàn cùng shop và thanh toán tách đơn; theo dõi lịch sử đơn, thực hiện yêu cầu đổi trả; tương tác với trợ lý ảo tư vấn, so sánh thông số kỹ thuật; tích lũy điểm thưởng theo bốn hạng thành viên từ Đồng đến Bạch Kim; trao đổi qua tin nhắn với sàn hoặc từng gian hàng; đăng ký mở gian hàng mới.

- **Người bán:** Quản lý thông tin hồ sơ và chính sách phí vận chuyển riêng; thêm, sửa, quản lý tồn kho và biến thể sản phẩm; xử lý trạng thái đơn hàng con độc lập; tự phát hành mã giảm giá của shop; duyệt hoặc từ chối các yêu cầu đổi trả hàng; theo dõi doanh thu thực nhận sau khi trừ phí sàn và trao đổi trực tiếp với khách hàng.

- **Quản trị viên:** Phê duyệt hồ sơ mở shop, từ chối hoặc đình chỉ gian hàng vi phạm; quản lý danh mục và cấu hình bộ lọc; kiểm soát sản phẩm, đơn hàng, tài khoản người dùng trên toàn hệ thống; tạo voucher cấp sàn, phát thông báo chung; giám sát nhật ký thao tác và xem thống kê đánh giá phản hồi trợ lý ảo.

### 5. Phương pháp thực hiện

- **Tìm hiểu công nghệ:** React, TypeScript, Tailwind CSS, Node.js, Express.

- **Tìm hiểu các công cụ hỗ trợ:** Figma, PostgreSQL, pgvector, Prisma ORM, LangChain, Google Gemini.

- **Quản lý mã nguồn:** GitHub.

- **Sử dụng công cụ lập trình hỗ trợ bởi trí tuệ nhân tạo:** Áp dụng các trợ lý lập trình để rút ngắn giai đoạn hiện thực các chức năng nền và các tác vụ lặp lại như dựng giao diện, sinh lớp truy cập dữ liệu và viết kịch bản kiểm thử. Thời lượng tiết kiệm được chuyển sang các hạng mục kỹ thuật chiều sâu gồm xử lý tương tranh, tối ưu truy hồi, an toàn tầng trí tuệ nhân tạo và kiểm thử kịch bản biên. Mọi mã nguồn sinh ra đều được nhóm rà soát và kiểm chứng bằng bộ kiểm thử tự động trước khi tích hợp.

- **Thu thập yêu cầu thông qua:**
  - Tạo phiếu khảo sát nhu cầu người dùng.
  - Tìm hiểu các ứng dụng hiện có trên thị trường.

- **Phân tích và xác định yêu cầu.**

- **Thiết kế:**
  - Thiết kế đối tượng.
  - Thiết kế dữ liệu.
  - Thiết kế giao diện.

- **Cài đặt.**

- **Kiểm thử và đánh giá:**
  - Kiểm thử đầu cuối tự động, bao phủ xác thực, phân quyền ba lớp, luồng thanh toán tách đơn, tích điểm và các kịch bản biên về tương tranh như hai người mua tranh nhau mặt hàng cuối cùng, callback thanh toán bị phát lại hoặc bị sửa nội dung sau khi ký.
  - Đánh giá chất lượng hệ truy hồi tăng cường sinh theo bộ ba chỉ số RAG Triad của khung Ragas và TruLens, gồm Faithfulness đo mức trung thành của câu trả lời với ngữ cảnh truy hồi được, Answer Relevance đo mức bám sát câu hỏi, và Context Relevance đo mức liên quan của ngữ cảnh được truy hồi.
  - Xây dựng tập dữ liệu đánh giá gắn nhãn thủ công gồm các câu hỏi mua sắm tiếng Việt kèm sản phẩm đúng, dùng để tính Recall@5 và MRR cho truy hồi, cùng nDCG@5 cho danh sách gợi ý cá nhân hóa.
  - Kiểm thử an toàn cho trợ lý ảo bằng tập câu tấn công tiêm lệnh, gồm cả tấn công trực tiếp từ người dùng và tấn công gián tiếp nhúng trong mô tả sản phẩm.
  - Đo hiệu năng theo hai mốc tách biệt là thời gian tới ký tự đầu tiên và thời gian hoàn tất câu trả lời.

- **Hoàn thiện sản phẩm.**

### 6. Nền tảng công nghệ

- **Công cụ thiết kế giao diện và trải nghiệm:** Figma.
- **Ngôn ngữ sử dụng:** TypeScript, JavaScript.
- **Cơ sở dữ liệu:** PostgreSQL.
- **Backend:** Node.js.
- **Frontend:** ReactJS, TailwindCSS, Shadcn.
- **Thư viện sử dụng:** Các thư viện và công nghệ trong hệ sinh thái React.

**Công nghệ cho tính năng nâng cao:**

- **Trợ lý ảo tư vấn mua hàng:** Kết hợp mô hình ngôn ngữ lớn và thư viện điều phối luồng để trả lời tự nhiên theo ngữ cảnh thực tế của sản phẩm trên sàn.

- **Mô hình nhúng và cơ sở dữ liệu vector:** Nhúng thông tin sản phẩm và câu hỏi thành vector để truy vấn độ tương đồng trực tiếp trong cơ sở dữ liệu.

- **Truy hồi lai:** Kết hợp tìm kiếm toàn văn có xếp hạng của hệ quản trị cơ sở dữ liệu với tìm kiếm tương đồng vector, hợp nhất hai bảng kết quả bằng thuật toán Reciprocal Rank Fusion để khắc phục điểm yếu của tìm kiếm ngữ nghĩa đối với mã sản phẩm và số hiệu dòng máy.

- **Gọi hàm cho mô hình ngôn ngữ:** Cấp cho mô hình một bộ công cụ đọc cơ sở dữ liệu gồm tra cứu sản phẩm, kiểm tra tồn kho và tra chính sách vận chuyển của gian hàng. Mô hình tự quyết định gọi công cụ nào trước khi tổng hợp câu trả lời, nhờ đó giá và tồn kho nêu ra luôn là số liệu tại thời điểm hỏi chứ không phải dữ liệu đã nhúng từ trước.

- **Phản hồi theo luồng:** Máy chủ đẩy dần từng phần câu trả lời tới trình duyệt qua kênh sự kiện một chiều, giúp người dùng bắt đầu đọc ngay thay vì chờ mô hình sinh xong toàn bộ nội dung.

- **Phòng thủ tiêm lệnh:** Lọc mẫu câu thao túng ở đầu vào; phân định rõ ranh giới giữa dữ liệu và mệnh lệnh trong ngữ cảnh để vô hiệu hóa tiêm lệnh gián tiếp qua nội dung do gian hàng đăng; kiểm tra đầu ra nhằm chặn các cam kết về giá hoặc ưu đãi không tồn tại trong cơ sở dữ liệu.

- **Ghi nhớ ngữ cảnh đa phiên:** Lưu trữ lịch sử trao đổi theo từng phiên và tự động đưa các lượt gần nhất vào ngữ cảnh câu hỏi nối tiếp.

- **Thị giác máy tính tìm kiếm bằng hình ảnh:** Ứng dụng mô hình nhận diện đa phương thức để trích xuất đặc điểm thiết bị từ ảnh tải lên và khớp với sản phẩm trên sàn.

- **Tìm kiếm văn bản gần đúng:** Áp dụng kỹ thuật tách chuỗi ba ký tự trong cơ sở dữ liệu để tìm kiếm chính xác khi người dùng gõ sai chính tả nhẹ.

- **So sánh sản phẩm có cấu trúc:** Ràng buộc mô hình trả về đối tượng dữ liệu chuẩn hóa gồm thông số, ưu nhược điểm và khuyến nghị mua sắm.

- **Gợi ý cá nhân hóa:** Chạy tác vụ nền định kỳ tính ma trận đồng mua sản phẩm dựa trên hành vi người dùng theo thuật toán lọc cộng tác.

- **Kiểm duyệt đánh giá tự động:** Sử dụng mô hình ngôn ngữ chấm điểm và lọc nội dung độc hại hoặc spam trước khi lưu trữ đánh giá.

- **Khung đánh giá chất lượng trí tuệ nhân tạo:** Sử dụng phương pháp của Ragas và TruLens để đo bộ ba chỉ số RAG Triad, kết hợp tập dữ liệu gắn nhãn thủ công để đo độ chính xác truy hồi và chất lượng xếp hạng gợi ý.

- **Đo lường phản hồi chất lượng:** Thu thập đánh giá hữu ích của người dùng cho từng câu trả lời để thống kê và tối ưu hóa hệ thống.

### 7. Kết quả mong đợi

**Về chức năng:**

- Vận hành hoàn chỉnh sàn thương mại điện tử đa gian hàng với ba phân hệ tách biệt cho người mua, người bán và quản trị viên.
- Thực hiện chính xác quy trình giỏ hàng gom nhiều shop, mã giảm giá hai cấp và thanh toán tách đơn bảo toàn tuyệt đối dòng tiền.
- Bảo đảm không bán vượt tồn kho và không phát vượt hạn mức mã giảm giá trong kịch bản nhiều người mua thao tác đồng thời, được chứng minh bằng bộ kiểm thử tương tranh tự động.
- Tích hợp đồng bộ năm module trí tuệ nhân tạo gồm trợ lý ảo truy hồi trên cơ sở dữ liệu vector, tìm kiếm bằng hình ảnh, so sánh thông số, lọc cộng tác gợi ý và kiểm duyệt đánh giá tự động.
- Trợ lý ảo truy vấn được giá và tồn kho thời gian thực qua cơ chế gọi hàm, và trả lời theo luồng.
- Quản lý toàn diện vòng đời gian hàng với cơ chế đình chỉ shop tự động ẩn sản phẩm trên toàn hệ thống.
- Hỗ trợ tương tác thời gian thực qua tin nhắn hai kênh, phát thông báo trong ứng dụng và ghi nhận nhật ký thao tác kiểm toán.

**Về hiệu suất:**

- Tối ưu hóa thời gian phản hồi giao diện lập trình ứng dụng dưới 500ms cho các tác vụ thông thường và tải trang dưới 3 giây.
- Hệ thống duy trì trạng thái ổn định khi phục vụ đồng thời 200 đến 300 người dùng truy cập.
- Tách biệt tính toán gợi ý cá nhân hóa thành các tác vụ nền định kỳ để giảm tải cho máy chủ khi truy cập thời gian thực.
- Đóng gói hoàn chỉnh mã nguồn, cơ sở dữ liệu và dữ liệu khởi tạo mẫu bằng công cụ container hóa giúp dễ dàng triển khai lại.

**Về chất lượng:**

- Vượt qua toàn bộ các bộ kiểm thử đầu cuối tự động, bao phủ từ xác thực, phân quyền ba lớp, luồng thanh toán và tích điểm cho tới các kịch bản biên về tương tranh và về tính hợp lệ của callback thanh toán.
- Thu thập và duy trì tỷ lệ phản hồi tích cực đối với câu trả lời của trợ lý ảo đạt trên 80% từ người dùng trải nghiệm.

**Về hiệu năng và độ chính xác các module trí tuệ nhân tạo:**

- Tỷ lệ truy hồi đúng sản phẩm liên quan trong top 5 kết quả đạt trên 75% trên tập dữ liệu thử nghiệm.
- Độ chính xác thông tin đạt trên 85% câu trả lời khớp đúng giá và tồn kho thực tế của gian hàng đang hoạt động.
- Điểm Faithfulness và Answer Relevance theo khung Ragas đạt trên 0.75 trên tập đánh giá gắn nhãn.
- Thời gian tới ký tự đầu tiên của câu trả lời dưới 1.5 giây; thời gian hoàn tất toàn bộ câu trả lời dưới 8 giây ở phân vị 95.
- Tỷ lệ chặn thành công tập câu tấn công tiêm lệnh đạt 100%, đồng thời không chặn nhầm các câu hỏi mua sắm thông thường.
- Tỷ lệ nhận diện đúng dòng máy hoặc thương hiệu của module tìm kiếm ảnh đạt trên 70%.
- Chất lượng xếp hạng danh sách gợi ý cá nhân hóa đạt trên 0.60 theo chỉ số nDCG trên tập kiểm thử.
- Tỷ lệ phát hiện chính xác bình luận vi phạm hoặc spam đạt trên 80% với tỷ lệ chặn nhầm dưới 5%.

### 8. Hướng phát triển đề tài

**Ngắn hạn:**

- Thu thập và phân tích dữ liệu tương tác thực tế từ người dùng để tái tinh chỉnh các tham số lọc cộng tác và cải thiện độ chính xác của mô hình nhúng vector.
- Thiết lập cơ chế bộ nhớ đệm đa tầng cho các truy vấn dữ liệu và vector thường gặp nhằm giảm tải cho máy chủ và hạ thấp chi phí gọi mô hình ngôn ngữ lớn.
- Mở rộng tập dữ liệu mẫu kiểm thử tự động để bao phủ thêm các kịch bản biên trong quy trình xử lý thanh toán và hủy đơn hàng phức tạp.
- Mở rộng tập câu tấn công tiêm lệnh và tự động hóa việc chạy lại tập này mỗi khi thay đổi câu lệnh hệ thống của trợ lý ảo.
- Bổ sung bảng phân tích chuyên sâu các chỉ số giữ chân người dùng và tỷ lệ chuyển đổi giỏ hàng vào bảng điều khiển quản trị sàn.
- Thực hiện khảo sát trải nghiệm người dùng diện rộng sau triển khai để tinh chỉnh luồng thao tác trên thiết bị di động và tối ưu khả năng phản hồi của giao diện.
- Thiết lập hệ thống giám sát thời gian thực để tự động cảnh báo lỗi hệ thống, đo lường độ trễ API và quản lý hạn mức gọi các dịch vụ trí tuệ nhân tạo bên ngoài.

**Dài hạn:**

- Phát triển ứng dụng di động đa nền tảng đồng bộ dữ liệu thời gian thực với phiên bản web.
- Mở rộng kết nối các đơn vị vận chuyển thực tế để tự động hóa tính toán chi phí và lộ trình giao hàng.
- Nâng cấp mô hình phân tích chuỗi hành vi để dự báo nhu cầu nhập hàng và tối ưu tồn kho cho từng gian hàng.
- Ứng dụng mô hình không gian ba chiều giúp khách hàng xem trước thiết bị trực quan trước khi quyết định mua sắm.
- Mở rộng hệ sinh thái khuyến khích tương tác thông qua các cơ chế nhiệm vụ và thử thách tích điểm nhận quà.

### 9. Bảng kế hoạch thực hiện

| Giai đoạn | Thời gian | Công việc | Kết quả |
|---|---|---|---|
| Lên kế hoạch | 07/09 – 19/09 | Xác định phạm vi, mục tiêu, yêu cầu; phân công công việc; lập kế hoạch | Phạm vi, mục tiêu, kế hoạch dự án |
| Khảo sát hệ thống | 20/09 – 27/09 | Khảo sát các website thương mại điện tử, thu thập yêu cầu người dùng | Tài liệu khảo sát, danh sách yêu cầu |
| Phân tích yêu cầu | 28/09 – 07/10 | Xây dựng sơ đồ use case, đặc tả chức năng, sơ đồ dữ liệu | Use case, ERD, đặc tả yêu cầu |
| Thiết kế giao diện | 08/10 – 18/10 | Thiết kế wireframe, prototype bằng Figma | Giao diện mẫu, prototype |
| Thiết kế CSDL & API | 19/10 – 29/10 | Thiết kế cơ sở dữ liệu, mô hình ERD, tài liệu API | ERD, tài liệu thiết kế dữ liệu & API |
| Hiện thực nền tảng | 30/10 – 12/11 | Xây dựng frontend ReactJS và backend Node.js kết nối PostgreSQL qua Prisma cho các chức năng nền, sử dụng công cụ lập trình hỗ trợ bởi trí tuệ nhân tạo để rút ngắn thời gian | Ba phân hệ chạy được đầu cuối |
| Kỹ thuật lõi và kiểm thử nghiệp vụ thanh toán | 13/11 – 20/11 | Tách đơn đa gian hàng, voucher hai cấp, cập nhật có điều kiện chống bán vượt kho và vượt hạn mức voucher, bảo toàn bất biến dòng tiền; viết kiểm thử đầu cuối cho các kịch bản biên của nghiệp vụ thanh toán | Luồng thanh toán đúng về dòng tiền, có bộ kiểm thử tương tranh và kịch bản biên |
| An toàn và trải nghiệm tầng trí tuệ nhân tạo | 21/11 – 27/11 | Xây dựng phòng thủ chống tiêm lệnh hai lớp, ngăn trợ lý ảo bị lừa đưa ra cam kết giảm giá hoặc cấp mã ưu đãi trái phép; triển khai phản hồi theo luồng để giảm độ trễ trải nghiệm | Trợ lý ảo an toàn trước tấn công tiêm lệnh, phản hồi hiển thị dần |
| Tích hợp chức năng nâng cao | 28/11 – 18/12 | Truy hồi lai kết hợp gọi hàm truy vấn giá và tồn kho, tìm kiếm bằng hình ảnh, so sánh thông số, gợi ý cá nhân hóa, kiểm duyệt đánh giá | Hoàn thiện năm module trí tuệ nhân tạo |
| Xây dựng khung đánh giá AI | 19/12 – 25/12 | Xây tập dữ liệu gắn nhãn, đo bộ ba chỉ số RAG Triad theo Ragas, đo Recall@5, nDCG@5 và độ chính xác tìm kiếm bằng ảnh | Báo cáo số đo định lượng cho toàn bộ chỉ tiêu |
| Kiểm thử | 26/12 – 05/01 | Kiểm thử đơn vị, tích hợp, giao diện và hiệu năng | Hệ thống ổn định, hoạt động trơn tru |
| Hoàn thiện & triển khai | 06/01 – 11/01 | Hoàn thiện chức năng, tối ưu hiệu năng, deploy website lên môi trường demo | Website triển khai thành công |
| Báo cáo & bảo vệ | 12/01 – 17/01 | Viết báo cáo, chuẩn bị slide thuyết trình, demo hệ thống | Báo cáo hoàn chỉnh, demo hệ thống |

---

TP. HCM, ngày 06 tháng 09 năm 2026

| Xác nhận của CBHD | Sinh viên 1 | Sinh viên 2 |
|---|---|---|
| (Ký tên và ghi rõ họ tên) | (Ký tên và ghi rõ họ tên) | (Ký tên và ghi rõ họ tên) |
| | | |
| **TS. Lê Văn Tuấn** | **Cao Tùng Dương** | **Nguyễn Công Đức** |
