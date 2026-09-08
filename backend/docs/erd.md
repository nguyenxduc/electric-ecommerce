# So do quan he thuc the (ERD)

> Sinh tu `prisma/schema.prisma` bang `npm run docs:erd`.
> **Khong sua tay file nay** — sua schema roi chay lai lenh tren.

Tong cong 34 bang nghiep vu (chua tinh 2 bang ha tang cua
cong cu migration). Chia theo mien de doc duoc; quan he bac cau giua cac
mien duoc noi trong phan mo ta cua tung muc.

## 1. Gian hang va danh muc san pham

Xuong song cua mo hinh da gian hang: mot nguoi dung so huu toi da mot Shop, moi Product thuoc dung mot Shop.

```mermaid
erDiagram
  Shop {
    bigint id "PK"
    bigint owner_id "UK"
    string name
    string slug "UK"
    string description
    string logo_url
    string banner_url
    string status
    string rejection_reason
    string contact_email
    string contact_phone
    string address
    decimal shipping_fee_override
    decimal free_shipping_threshold_override
    datetime approved_at
    bigint approved_by
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Product {
    bigint id "PK"
    string name
    decimal price
    decimal discount
    int quantity
    int sold
    string img
    json specs
    json specs_detail
    json color
    bigint shop_id
    bigint category_id
    bigint sub_category_id
    decimal rating
    datetime created_at
    datetime updated_at
    datetime deleted_at
    string description
  }
  Category {
    bigint id "PK"
    string name
    string slug "UK"
    string image_url
    string description
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  SubCategory {
    bigint id "PK"
    string name
    string image_url
    string description
    bigint category_id
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  ProductColor {
    bigint id "PK"
    bigint product_id
    string name
    string code
    int quantity
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  ProductSpec {
    bigint id "PK"
    string label
    json value
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  ProductFilterValue {
    bigint id "PK"
    bigint product_id
    bigint filter_key_id
    bigint option_id
    string raw_value
    datetime created_at
  }
  FilterKey {
    bigint id "PK"
    string key "UK"
    string label
    string description
    string data_type
    bool is_active
    int order
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  FilterOption {
    bigint id "PK"
    bigint filter_key_id
    string value
    string display_value
    string query_value
    bigint category_id
    int order
    bool is_active
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Shop ||--o{ Product : ""
  Product ||--o{ ProductColor : ""
  Product }|--|| Category : ""
  Product }o--|| SubCategory : ""
  Product ||--o{ ProductFilterValue : ""
  Category ||--o{ SubCategory : ""
  Category ||--o{ FilterOption : ""
  ProductFilterValue }|--|| FilterKey : ""
  ProductFilterValue }o--|| FilterOption : ""
  FilterKey ||--o{ FilterOption : ""
```

## 2. Nguoi dung, gio hang va uu dai

User la trung tam: vua la nguoi mua, vua co the la chu shop (quan he ShopOwner).

```mermaid
erDiagram
  User {
    bigint id "PK"
    string name
    string email "UK"
    string password_digest
    bool email_verified
    string verification_code
    datetime verification_expires_at
    string reset_code
    datetime reset_expires_at
    string role
    string phone
    string address
    string avatar
    int loyalty_points
    string segment
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Cart {
    bigint id "PK"
    bigint user_id
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  CartItem {
    bigint id "PK"
    bigint cart_id
    bigint product_id
    int quantity
    json color
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Wishlist {
    bigint id "PK"
    bigint user_id
    bigint product_id
    datetime created_at
    datetime deleted_at
  }
  Coupon {
    bigint id "PK"
    string code "UK"
    string description
    string discount_type
    decimal discount_value
    decimal min_order
    int usage_limit
    int used_count
    bigint shop_id
    datetime expires_at
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  LoyaltyPointTransaction {
    bigint id "PK"
    bigint user_id
    bigint order_id
    int points
    string type
    string description
    datetime created_at
  }
  User ||--o{ Cart : ""
  User ||--o{ Wishlist : ""
  User ||--o{ Coupon : ""
  Cart ||--o{ CartItem : ""
```

## 3. Don hang, thanh toan va doi tra

Diem then chot cua sang da gian hang: mot lan thanh toan tao ra mot OrderGroup, roi tach thanh N Order — moi shop mot don, tu quan trang thai rieng.

```mermaid
erDiagram
  OrderGroup {
    bigint id "PK"
    bigint user_id
    string group_number "UK"
    decimal subtotal_amount
    decimal tier_discount
    decimal coupon_discount
    decimal shipping_fee
    decimal total_amount
    bigint coupon_id
    string payment_method
    json shipping_address
    string receiver_name
    string receiver_phone
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Order {
    bigint id "PK"
    bigint user_id
    bigint shop_id
    bigint order_group_id
    string order_number "UK"
    decimal total_amount
    decimal shipping_fee
    string status
    json shipping_address
    string receiver_name
    string receiver_phone
    string payment_method
    bigint coupon_id
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  OrderItem {
    bigint id "PK"
    bigint order_id
    bigint product_id
    int quantity
    decimal unit_price
    decimal total_price
    string color
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Payment {
    bigint id "PK"
    bigint order_group_id
    string provider
    decimal amount
    string currency
    string status
    string momo_order_id
    string momo_request_id "UK"
    string momo_trans_id
    string pay_url
    string deeplink
    string qr_code_url
    string signature
    string extra_data
    int result_code
    string message
    datetime paid_at
    datetime expired_at
    json raw_response
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  ReturnRequest {
    bigint id "PK"
    bigint order_id "UK"
    bigint user_id
    bigint shop_id
    string reason
    string status
    string resolution_note
    datetime created_at
    datetime updated_at
  }
  Review {
    bigint id "PK"
    bigint user_id
    bigint product_id
    int rating
    string comment
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  OrderGroup ||--o{ Order : ""
  OrderGroup ||--o{ Payment : ""
  Order ||--o{ OrderItem : ""
  Order }o--|| ReturnRequest : ""
```

## 4. Tri tue nhan tao

ProductEmbedding luu vector pgvector phuc vu truy hoi RAG; UserBehavior va ProductSimilarity phuc vu loc cong tac.

```mermaid
erDiagram
  ProductEmbedding {
    bigint product_id "PK"
    string content
    datetime updated_at
  }
  AiChat {
    bigint id "PK"
    bigint user_id
    string title
    string thread_key "UK"
    datetime created_at
    datetime updated_at
  }
  AiMessage {
    bigint id "PK"
    bigint ai_chat_id
    string role
    string content
    json metadata
    datetime created_at
  }
  AiFeedback {
    bigint id "PK"
    bigint ai_message_id
    bigint user_id
    int rating
    string comment
    datetime created_at
  }
  UserBehavior {
    bigint id "PK"
    bigint user_id
    string session_id
    bigint product_id
    string event_type
    datetime event_time
    json metadata
  }
  UserBehaviorDaily {
    bigint id "PK"
    string visitor_key
    bigint product_id
    string event_type
    datetime day
    int event_count
    datetime updated_at
  }
  ProductSimilarity {
    bigint id "PK"
    bigint product_id
    bigint similar_product_id
    float score
    datetime updated_at
  }
  RecommendationLog {
    bigint id "PK"
    bigint user_id
    string session_id
    string strategy
    bigint product_ids
    datetime created_at
  }
  AiChat ||--o{ AiMessage : ""
```

## 5. Ho tro va van hanh

Chat hai kenh (buyer-san va buyer-shop), thong bao, nhat ky thao tac va tham so van hanh.

```mermaid
erDiagram
  Chat {
    bigint id "PK"
    bigint user_id
    bigint shop_id
    string status
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Message {
    bigint id "PK"
    bigint chat_id
    bigint sender_id
    string content
    bool is_read
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Notification {
    bigint id "PK"
    bigint user_id
    string title
    string message
    string type
    bool is_read
    datetime created_at
    datetime read_at
  }
  AuditLog {
    bigint id "PK"
    bigint user_id
    string action
    string resource
    bigint resource_id
    string ip
    string user_agent
    json metadata
    datetime created_at
  }
  Setting {
    bigint id "PK"
    string key "UK"
    string value
    string description
    string category
    string data_type
    bool is_public
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Chat ||--o{ Message : ""
```
