# Kien truc he thong va cac luong chinh

Tai lieu nay mo ta *hanh vi* cua he thong. So do cau truc du lieu nam o
[`erd.md`](./erd.md) va duoc sinh tu dong tu schema.

Moi so do duoi day viet bang Mermaid nen hien thi truc tiep tren GitHub va
trong VS Code (extension Markdown Preview Mermaid Support).

---

## 1. Kien truc tong the

```mermaid
flowchart TB
  subgraph client["Trinh duyet"]
    buyer["Trang mua sam<br/>React + Vite"]
    seller["Trang nguoi ban"]
    admin["Trang quan tri"]
  end

  subgraph server["Backend — Node.js / Express"]
    mw["Middleware<br/>helmet · rate limit · JWT<br/>validate ID · error handler"]
    api["23 nhom route REST<br/>~150 endpoint"]
    ai["Module AI<br/>agent · imageSearch<br/>comparison · moderation"]
    jobs["Job chay nen<br/>similarity · recommendation<br/>rollup · prune"]
    io["Socket.IO<br/>chat & thong bao"]
  end

  subgraph data["Luu tru"]
    pg[("PostgreSQL<br/>34 bang")]
    vec[("pgvector<br/>product_embeddings")]
  end

  subgraph ext["Dich vu ngoai"]
    gemini["Google Gemini<br/>chat · embedding · vision"]
    cloud["Cloudinary<br/>anh"]
    pay["VNPay · MoMo"]
    smtp["SMTP<br/>email xac thuc"]
  end

  client --> mw --> api
  api --> ai
  api --> pg
  ai --> vec
  ai --> gemini
  api --> cloud
  api --> pay
  api --> smtp
  jobs --> pg
  io --> pg
  client <-.->|websocket| io
  pay -.->|IPN callback| api
```

**Diem dang chu y**: callback IPN tu cong thanh toan di *nguoc* vao backend
qua duong cong khai, khong co JWT — nen chu ky HMAC la lop xac thuc duy nhat
o day (xem muc 4).

---

## 2. Luong then chot: tach don khi thanh toan

Day la bai toan kho nhat cua mo hinh da gian hang. Mot lan bam mua tao ra
**mot `OrderGroup`** va **N `Order`** — moi shop mot don voi trang thai rieng —
nhung tong tien cac don con phai khop *tuyet doi* voi so tien thanh toan.

```mermaid
sequenceDiagram
  autonumber
  actor B as Nguoi mua
  participant API as POST /api/orders
  participant DB as PostgreSQL

  B->>API: items[] + dia chi + ma voucher
  API->>DB: doc san pham, ton kho, shop
  API->>API: kiem ton kho & mau cho tung mon
  API->>API: gom mon theo shop
  API->>API: tinh phi ship theo tung shop<br/>(phi rieng cua shop, neu khong co thi lay cua san)
  API->>API: giam gia hang thanh vien (lam tron 1 lan)
  API->>API: ap voucher — voucher shop chi giam hang shop do

  rect rgb(238, 246, 242)
    note over API,DB: Tat ca trong MOT transaction
    API->>DB: tao OrderGroup
    loop moi shop
      API->>DB: tao Order + OrderItem
      API->>DB: tru ton kho CO DIEU KIEN (quantity >= can)
      alt khong du hang
        DB-->>API: count = 0
        API-->>B: 400 — san pham vua het hang
      end
      API->>DB: cong diem thuong (tren tien hang, khong gom ship)
    end
    API->>DB: chiem luot voucher CO DIEU KIEN (used_count < usage_limit)
    alt voucher da het luot
      DB-->>API: count = 0
      API-->>B: 400 — voucher da het luot
    end
  end

  API-->>B: 201 — 1 ma checkout + N ma don
```

### Hai bat bien phai giu

**Tien phai khop.** Khuyen mai duoc chia theo ti le gia tri cua tung shop;
**don cuoi cung hap thu phan sai so lam tron** de tong cac don con luon bang
dung tong thanh toan. Ngoai ra moi khoan giam gia deu duoc lam tron *mot lan
tai diem tinh* — neu lam tron luc luu ma tinh tong tu gia tri chua lam tron
thi bang chi tiet se lech 1 xu so voi tong.

**Khong ban vuot kho.** Ca tru ton kho lan chiem luot voucher deu dung *cap
nhat co dieu kien* thay vi doc-roi-ghi. PostgreSQL danh gia lai menh de `WHERE`
sau khi giao dich truoc commit, nen nguoi den sau nhan `count = 0` va giao dich
cua ho bi huy — thay vi ca hai cung di lot.

---

## 3. Luong AI: chatbot tu van (RAG)

```mermaid
sequenceDiagram
  autonumber
  actor B as Nguoi mua
  participant API as /api/ai-assistant
  participant EMB as Gemini Embedding
  participant PG as pgvector
  participant LLM as Gemini Chat

  B->>API: cau hoi tieng Viet
  API->>API: lay 6 luot chat gan nhat lam ngu canh
  API->>EMB: nhung cau hoi thanh vector
  EMB-->>API: vector 768 chieu
  API->>PG: tim top-K san pham gan nhat<br/>(chi shop dang active)
  PG-->>API: danh sach san pham + mo ta
  API->>LLM: prompt he thong + ngu canh + lich su + cau hoi
  LLM-->>API: cau tra loi kem URL san pham
  API-->>B: hien thi kem card san pham
```

Truy hoi chay song song hai duong: **tu khoa** (LIKE, tham so hoa) va **vector**
(pgvector), roi hop nhat va xep hang. Neu chua co embedding thi he thong tu dong
lui ve tim theo tu khoa — chay duoc nhung chat luong giam ro, va **khong bao loi**,
nen `npm run test:demo` co han mot phep kiem tra bang `product_embeddings`.

---

## 4. Luong thanh toan MoMo va xac thuc callback

```mermaid
sequenceDiagram
  autonumber
  actor B as Nguoi mua
  participant API as Backend
  participant MoMo as Cong MoMo

  B->>API: chon thanh toan MoMo
  API->>API: tao Order + Payment (pending)
  API->>API: ky HMAC-SHA256 yeu cau
  API->>MoMo: tao giao dich
  MoMo-->>API: payUrl
  API-->>B: chuyen huong sang payUrl
  B->>MoMo: thanh toan

  rect rgb(253, 241, 229)
    note over MoMo,API: Callback cong khai — khong co JWT
    MoMo->>API: POST /payments/momo-ipn + signature
    API->>API: tinh lai HMAC tu cac truong nhan duoc
    alt chu ky khong khop
      API-->>MoMo: 400 — tu choi
    end
    API->>API: doi chieu so tien voi ban ghi Payment
    alt so tien khong khop
      API-->>MoMo: 400 — tu choi
    end
    API->>API: Payment = paid, moi don con pending -> processing
    API-->>MoMo: 200
  end
```

Buoc tinh lai chu ky la **bat buoc**: neu bo qua, bat ky ai doan duoc
`requestId` cung co the gui callback gia de danh dau don da thanh toan ma
khong tra dong nao. Suite `09-payment-security` khoa lai dung truong hop nay.

---

## 5. May trang thai don hang

```mermaid
stateDiagram-v2
  [*] --> pending: dat hang

  pending --> processing
  pending --> shipped
  pending --> delivered
  pending --> cancelled

  processing --> shipped
  processing --> delivered
  processing --> cancelled

  shipped --> delivered
  shipped --> cancelled

  delivered --> returned: seller duyet tra hang

  delivered --> [*]
  cancelled --> [*]
  returned --> [*]
```

Ba trang thai cuoi la `delivered`, `cancelled`, `returned`. Rieng `returned`
**khong** dat duoc bang cach doi trang thai truc tiep — chi luong duyet yeu cau
tra hang moi dua don sang do, dong thoi hoan kho va thu hoi diem thuong.

Nguoi mua chi tu huy duoc khi don con o `pending` hoac `processing`.

> Bang chuyen trang thai nay dat tai `constants/status.js` va la nguon su that
> duy nhat. Truoc day seed tung sinh trang thai `confirmed` khong co trong bang,
> khien nhung don do ket vinh vien — khong chuyen tiep duoc ma cung khong huy
> duoc. Suite `11-business-rules` kiem tra khong con trang thai la nao.

---

## 6. Vong doi gian hang

```mermaid
stateDiagram-v2
  [*] --> pending: nguoi dung nop don mo shop
  pending --> active: admin duyet
  pending --> rejected: admin tu choi kem ly do
  rejected --> pending: nop lai sau khi sua
  active --> suspended: admin dinh chi
  suspended --> active: admin go dinh chi
```

Khi shop roi khoi `active`, toan bo san pham cua shop bien mat khoi trang chu,
tim kiem, goi y AI va khong the them vao gio. Rang buoc nay ap o **tang truy
van du lieu** (`buyerVisibilityWhere` trong `lib/productQuery.js`) chu khong va
o tung man hinh — nen khong co duong nao lot.

---

## 7. Phan quyen ba lop

```mermaid
flowchart LR
  req["Request"] --> l1

  l1{"protectRoute<br/>JWT hop le?"}
  l1 -->|khong| e401["401"]
  l1 -->|co| l2

  l2{"adminRoute / sellerRoute<br/>dung vai tro?"}
  l2 -->|khong| e403["403"]
  l2 -->|co| l3

  l3{"requireShopOwnership<br/>dung shop so huu?"}
  l3 -->|khong| e403b["403"]
  l3 -->|co| ok["Controller"]
```

Lop thu ba la lop quan trong nhat va cung de quen nhat: no ngan seller A doc
don hang hay sua san pham cua seller B. Chi kiem tra vai tro thoi thi *chua du*,
vi ca hai deu co vai tro `seller`.
