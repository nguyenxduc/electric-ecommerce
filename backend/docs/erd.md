# So do quan he thuc the (ERD)

> Sinh tu `prisma/schema.prisma` bang `npm run docs:erd`.
> **Khong sua tay file nay** — sua schema roi chay lai lenh tren.

Tong cong 47 bang nghiep vu (chua tinh 2 bang ha tang cua
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
    string pickup_province
    string pickup_district
    string pickup_ward
    string pickup_address
    string tax_code
    string tax_entity_type
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
    bool is_active
    string takedown_reason
    datetime taken_down_at
    int weight_grams
    decimal flash_discount
    datetime flash_starts_at
    datetime flash_ends_at
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
  ProductVariant {
    bigint id "PK"
    bigint product_id
    string sku "UK"
    string name
    json attributes
    decimal price_delta
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
  ProductReport {
    bigint id "PK"
    bigint product_id
    bigint reporter_id
    string reason
    string detail
    string status
    bigint resolved_by
    datetime resolved_at
    datetime created_at
  }
  ProductQuestion {
    bigint id "PK"
    bigint product_id
    bigint user_id
    string question
    string answer
    datetime answered_at
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
  Product ||--o{ ProductVariant : ""
  Product ||--o{ ProductReport : ""
  Product ||--o{ ProductQuestion : ""
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
    datetime phone_verified_at
    string address
    string avatar
    int loyalty_points
    string segment
    datetime created_at
    datetime updated_at
    datetime deleted_at
    datetime suspended_at
    string suspend_reason
  }
  UserAddress {
    bigint id "PK"
    bigint user_id
    string name
    string phone
    string province
    string district
    string ward
    string street
    bool is_default
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  Cart {
    bigint id "PK"
    bigint user_id "UK"
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
    bigint variant_id
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
  ShopFollow {
    bigint id "PK"
    bigint user_id
    bigint shop_id
    datetime created_at
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
    datetime starts_at
    datetime expires_at
    bool is_active
    decimal max_discount
    int per_user_limit
    datetime created_at
    datetime updated_at
    datetime deleted_at
  }
  CouponClaim {
    bigint id "PK"
    bigint user_id
    bigint coupon_id
    datetime claimed_at
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
  User ||--o{ UserAddress : ""
  User ||--o{ CouponClaim : ""
  User ||--o{ Cart : ""
  User ||--o{ Wishlist : ""
  User ||--o{ Coupon : ""
  User ||--o{ ShopFollow : ""
  Cart ||--o{ CartItem : ""
  Coupon ||--o{ CouponClaim : ""
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
    json invoice_request
    string client_ip
    string device_id
    int risk_score
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
    bigint variant_id
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
    string images
    string seller_reply
    datetime seller_reply_at
    string client_ip
    string device_id
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
    string link
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

## 6. Van chuyen, chong gian lan, hoa don va thue

Moi Order co toi da mot Shipment (van don cua GHN/GHTK/mock) va mot Invoice; CodSettlement gom cac van don da thu COD khi doi soat; FraudFlag la hang doi nghi van cho admin.

```mermaid
erDiagram
  Shipment {
    bigint id "PK"
    bigint order_id "UK"
    string carrier
    string tracking_code "UK"
    string status
    int fee_vnd
    int cod_amount_vnd
    int weight_grams
    string label_url
    json raw
    datetime cod_collected_at
    bigint cod_settlement_id
    datetime created_at
    datetime updated_at
  }
  ShipmentEvent {
    bigint id "PK"
    bigint shipment_id
    string status
    string description
    datetime occurred_at
    json raw
    datetime created_at
  }
  CodSettlement {
    bigint id "PK"
    string carrier
    string reference
    int expected_amount_vnd
    int received_amount_vnd
    int difference_vnd
    string note
    bigint created_by
    datetime created_at
  }
  OtpCode {
    bigint id "PK"
    bigint user_id
    string phone
    string purpose
    string code_hash
    int attempts
    datetime expires_at
    datetime consumed_at
    datetime created_at
  }
  FraudFlag {
    bigint id "PK"
    string type
    string subject
    bigint subject_id
    bigint user_id
    int score
    json reasons
    json details
    string status
    bigint resolved_by
    datetime resolved_at
    datetime created_at
  }
  Invoice {
    bigint id "PK"
    bigint order_id "UK"
    bigint shop_id
    string invoice_number "UK"
    string series
    string provider
    string provider_ref
    json seller
    json buyer
    json items
    decimal subtotal
    decimal vat_rate
    decimal vat_amount
    decimal total
    string currency
    string status
    datetime issued_at
    datetime cancelled_at
    datetime created_at
  }
  TaxWithholding {
    bigint id "PK"
    bigint order_id "UK"
    bigint shop_id
    string period
    decimal base_amount
    decimal vat_rate
    decimal vat_amount
    decimal pit_rate
    decimal pit_amount
    datetime reversed_at
    datetime created_at
  }
  Shipment ||--o{ ShipmentEvent : ""
  Shipment }o--|| CodSettlement : ""
```
