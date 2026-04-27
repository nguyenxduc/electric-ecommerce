# Hướng Dẫn Hệ Thống Filter

## Tổng Quan

Hệ thống filter được thiết kế với 2 bảng chính:

- `FilterKey`: Định nghĩa các loại filter (brand, price, RAM, etc.)
- `FilterOption`: Các tùy chọn cụ thể cho mỗi FilterKey

## 1. FilterKey - Các Loại Filter

### Cấu trúc FilterKey:

```javascript
{
  key: "brand",           // Unique identifier
  label: "Thương hiệu",   // Tên hiển thị
  data_type: "string",    // Loại dữ liệu: string, number, boolean, range
  is_active: true,        // Có hoạt động không
  order: 1               // Thứ tự hiển thị
}
```

### Các Data Types Hỗ Trợ:

#### 1. `string` - Chuỗi văn bản

Dùng cho: brand, color, category, etc.

```javascript
{
  key: "brand",
  label: "Thương hiệu",
  data_type: "string"
}
```

#### 2. `number` - Số

Dùng cho: RAM size, storage capacity, etc.

```javascript
{
  key: "ram_size",
  label: "Dung lượng RAM",
  data_type: "number"
}
```

#### 3. `range` - Khoảng giá trị

Dùng cho: price range, rating range, etc.

```javascript
{
  key: "price_range",
  label: "Khoảng giá",
  data_type: "range"
}
```

#### 4. `boolean` - True/False

Dùng cho: on sale, in stock, etc.

```javascript
{
  key: "on_sale",
  label: "Đang giảm giá",
  data_type: "boolean"
}
```

## 2. FilterOption - Các Tùy Chọn Filter

### Cấu trúc FilterOption:

```javascript
{
  filter_key_id: 1,           // ID của FilterKey
  value: "apple",             // Giá trị gốc (legacy)
  display_value: "Apple",     // Giá trị hiển thị cho user
  query_value: "apple",       // Giá trị dùng để query database
  category_id: null,          // Optional: chỉ áp dụng cho category này
  order: 1,                   // Thứ tự hiển thị
  is_active: true            // Có hoạt động không
}
```

## 3. Logic Filter - Cách Hoạt Động

### 3.1 OR Logic trong cùng Filter Key

Khi chọn nhiều options trong cùng một filter key, hệ thống sẽ áp dụng OR logic:

- **Brand**: Apple HOẶC Samsung HOẶC Xiaomi
- **RAM**: 8GB HOẶC 16GB
- **Price Range**: 500k-1M HOẶC 1M-2M

### 3.2 AND Logic giữa các Filter Keys khác nhau

Khi chọn filters từ nhiều keys khác nhau, hệ thống sẽ áp dụng AND logic:

- **Brand** = (Apple HOẶC Samsung) VÀ **RAM** = (8GB HOẶC 16GB) VÀ **Price** = (500k-1M)

### 3.3 Ví dụ thực tế:

```
Filters được chọn:
- Brand: Apple, Samsung
- RAM: 8GB, 16GB
- Price: 500k-1M

Kết quả:
(Brand = Apple OR Brand = Samsung)
AND
(RAM = 8GB OR RAM = 16GB)
AND
(Price >= 500k AND Price <= 1M)
```

### 3.4 Cách gửi Multiple Values qua API:

```javascript
// Cách 1: Comma-separated values
GET /api/products?brand=apple,samsung&ram=8,16

// Cách 2: Multiple parameters (cũng được hỗ trợ)
GET /api/products?brand=apple&brand=samsung&ram=8&ram=16
```

## 4. Query Value - Cú Pháp Hợp Lệ

### 3.1 String Filters

#### Exact Match (Khớp chính xác):

```javascript
{
  value: "apple",
  display_value: "Apple",
  query_value: "apple"
}
```

#### Multiple Values (Nhiều giá trị):

```javascript
{
  value: "apple,samsung",
  display_value: "Apple & Samsung",
  query_value: "apple,samsung"
}
```

#### Contains (Chứa từ khóa):

```javascript
{
  value: "pro",
  display_value: "Dòng Pro",
  query_value: "*pro*"
}
```

### 3.2 Number Filters

#### Exact Number:

```javascript
{
  value: "8",
  display_value: "8GB",
  query_value: "8"
}
```

#### Greater Than:

```javascript
{
  value: "16+",
  display_value: "16GB trở lên",
  query_value: ">=16"
}
```

#### Less Than:

```javascript
{
  value: "8-",
  display_value: "Dưới 8GB",
  query_value: "<8"
}
```

### 3.3 Range Filters

#### Price Range:

```javascript
{
  value: "500-1000",
  display_value: "500.000đ - 1.000.000đ",
  query_value: ">=500000,<=1000000"
}
```

#### Under Price:

```javascript
{
  value: "under-500",
  display_value: "Dưới 500.000đ",
  query_value: "<500000"
}
```

#### Over Price:

```javascript
{
  value: "over-2000",
  display_value: "Trên 2.000.000đ",
  query_value: ">2000000"
}
```

#### Rating Range:

```javascript
{
  value: "4-5",
  display_value: "4-5 sao",
  query_value: ">=4,<=5"
}
```

### 3.4 Boolean Filters

#### True Value:

```javascript
{
  value: "true",
  display_value: "Đang giảm giá",
  query_value: "discount>0"
}
```

#### False Value:

```javascript
{
  value: "false",
  display_value: "Giá gốc",
  query_value: "discount=0"
}
```

## 4. Các Toán Tử Query Hỗ Trợ

### Comparison Operators:

- `=` : Bằng
- `!=` : Khác
- `>` : Lớn hơn
- `>=` : Lớn hơn hoặc bằng
- `<` : Nhỏ hơn
- `<=` : Nhỏ hơn hoặc bằng

### String Operators:

- `*value*` : Chứa value
- `value*` : Bắt đầu bằng value
- `*value` : Kết thúc bằng value

### Multiple Values:

- `value1,value2` : OR condition (value1 HOẶC value2)
- `value1&value2` : AND condition (value1 VÀ value2)

### Range Operators:

- `>=min,<=max` : Trong khoảng min đến max
- `>min,<max` : Trong khoảng min đến max (không bao gồm biên)

## 5. Ví Dụ Thực Tế

### Brand Filter:

```javascript
// FilterKey
{
  key: "brand",
  label: "Thương hiệu",
  data_type: "string"
}

// FilterOptions
[
  {
    filter_key_id: 1,
    value: "apple",
    display_value: "Apple",
    query_value: "apple"
  },
  {
    filter_key_id: 1,
    value: "samsung",
    display_value: "Samsung",
    query_value: "samsung"
  },
  {
    filter_key_id: 1,
    value: "xiaomi",
    display_value: "Xiaomi",
    query_value: "xiaomi"
  }
]
```

### Price Range Filter:

```javascript
// FilterKey
{
  key: "price_range",
  label: "Khoảng giá",
  data_type: "range"
}

// FilterOptions
[
  {
    filter_key_id: 2,
    value: "0-500",
    display_value: "Dưới 500.000đ",
    query_value: "<500000"
  },
  {
    filter_key_id: 2,
    value: "500-1000",
    display_value: "500.000đ - 1.000.000đ",
    query_value: ">=500000,<=1000000"
  },
  {
    filter_key_id: 2,
    value: "1000-2000",
    display_value: "1.000.000đ - 2.000.000đ",
    query_value: ">=1000000,<=2000000"
  },
  {
    filter_key_id: 2,
    value: "2000+",
    display_value: "Trên 2.000.000đ",
    query_value: ">2000000"
  }
]
```

### RAM Filter:

```javascript
// FilterKey
{
  key: "ram",
  label: "RAM",
  data_type: "number"
}

// FilterOptions
[
  {
    filter_key_id: 3,
    value: "4",
    display_value: "4GB",
    query_value: "4"
  },
  {
    filter_key_id: 3,
    value: "8",
    display_value: "8GB",
    query_value: "8"
  },
  {
    filter_key_id: 3,
    value: "16",
    display_value: "16GB",
    query_value: "16"
  },
  {
    filter_key_id: 3,
    value: "16+",
    display_value: "16GB trở lên",
    query_value: ">=16"
  }
]
```

### Rating Filter:

```javascript
// FilterKey
{
  key: "rating",
  label: "Đánh giá",
  data_type: "range"
}

// FilterOptions
[
  {
    filter_key_id: 4,
    value: "5",
    display_value: "5 sao",
    query_value: ">=4.5"
  },
  {
    filter_key_id: 4,
    value: "4+",
    display_value: "4 sao trở lên",
    query_value: ">=4"
  },
  {
    filter_key_id: 4,
    value: "3+",
    display_value: "3 sao trở lên",
    query_value: ">=3"
  }
]
```

### Discount Filter:

```javascript
// FilterKey
{
  key: "discount",
  label: "Khuyến mãi",
  data_type: "boolean"
}

// FilterOptions
[
  {
    filter_key_id: 5,
    value: "on_sale",
    display_value: "Đang giảm giá",
    query_value: "discount>0"
  },
  {
    filter_key_id: 5,
    value: "free_shipping",
    display_value: "Miễn phí vận chuyển",
    query_value: "free_shipping=true"
  }
]
```

## 6. Lưu Ý Quan Trọng

### 6.1 Validation Rules:

- `query_value` không được để trống
- Toán tử phải hợp lệ theo data_type
- Giá trị số phải là số hợp lệ
- Range phải có min <= max

### 6.2 Performance Tips:

- Tạo index cho các trường thường được filter
- Sử dụng `category_id` để giới hạn filter theo danh mục
- Đặt `order` hợp lý để hiển thị filter quan trọng trước

### 6.3 Best Practices:

- `display_value` nên thân thiện với người dùng
- `query_value` nên tối ưu cho database query
- Sử dụng `is_active` để tạm thời ẩn filter không cần thiết
- Nhóm các filter liên quan bằng `order`

## 7. API Usage

### Tạo FilterKey:

```javascript
POST /api/admin/filter-keys
{
  "key": "screen_size",
  "label": "Kích thước màn hình",
  "data_type": "range",
  "order": 5
}
```

### Tạo FilterOption:

```javascript
POST /api/admin/filter-options
{
  "filter_key_id": 6,
  "value": "6-7",
  "display_value": "6-7 inch",
  "query_value": ">=6,<=7",
  "order": 1
}
```

### Query Products với Filter:

```javascript
// OR logic trong cùng key, AND logic giữa các keys
GET /api/products?brand=apple,samsung&ram=8,16&price_range=500-1000

// Tương đương với:
// (brand = apple OR brand = samsung)
// AND (ram = 8 OR ram = 16)
// AND (price_range = 500-1000)

// Các ví dụ khác:
GET /api/products?brand=apple&rating=4+&discount=true
GET /api/products?category=smartphones&brand=samsung,xiaomi&ram=8,16,32
```
