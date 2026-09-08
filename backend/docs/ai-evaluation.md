# Ket qua do luong cac tinh nang AI

> Sinh tu `npm run eval:ai` luc 2026-08-21 14:45. Moi con so deu do truc tiep tren
> he thong dang chay, khong phai uoc luong.

## 1. Truy hoi RAG cua chatbot tu van

Bo cau hoi: 8 cau tieng Viet mo phong cach nguoi mua hoi that.
Moi cau duoc cham hai tieu chi: cau tra loi co dinh kem link san pham that
khong, va san pham do co dung nhom hang nguoi dung hoi khong.

| Chi so | Gia tri |
|---|---|
| So cau hoi | 8 |
| Tra loi thanh cong | 7/8 (87.5%) |
| Co trich dan san pham | 7/8 (87.5%) |
| Trich dan dung nhom hang | 5/8 (62.5%) |
| Do tre trung vi (p50) | 9005ms |
| Do tre p95 | 11607ms |

<details><summary>Chi tiet tung cau hoi</summary>

| Cau hoi | Trich dan | Dung nhom | Do tre |
|---|---|---|---|
| Tu van cho toi mot chiec dien thoai chup anh dep | co | dung | 5427ms |
| Toi can laptop de lam do hoa | co | dung | 5904ms |
| Co tai nghe chong on nao tot khong | co | dung | 8869ms |
| Goi y dong ho thong minh theo doi suc khoe | co | sai | 11607ms |
| May tinh bang nao phu hop de hoc online | co | dung | 7872ms |
| Toi muon mua may anh chup chuyen nghiep | co | dung | 11329ms |
| Ban phim co nao go game tot | khong | sai | 9884ms |
| Dien thoai tam gia duoi 500 do la | co | sai | 9005ms |

</details>

## 2. Kiem duyet danh gia tu dong

Bo mau: 10 binh luan da gan nhan thu cong (sach / doc hai).
Lop "duong tinh" la binh luan doc hai bi chan.

| Chi so | Gia tri |
|---|---|
| Do chinh xac (accuracy) | 100.0% |
| Precision | 100.0% |
| Recall | 100.0% |
| F1 | 100.0% |

Ma tran nham lan:

| | Du doan: chan | Du doan: cho qua |
|---|---|---|
| **That: doc hai** | 4 (dung) | 0 (lot luoi) |
| **That: sach** | 0 (chan oan) | 6 (dung) |

## 3. Goi y san pham

Danh muc dang ban: 20 san pham thuoc cac gian hang dang hoat dong.

| Truong hop | So goi y | Chien luoc | Tu shop active | Bi lot shop khoa | Khong trung lap |
|---|---|---|---|---|---|
| Khach chua dang nhap | 5 | cold_start_best_seller_newest | 5 | 0 | 5/5 |
| Da dang nhap | 5 | cold_start_best_seller_newest | 5 | 0 | 5/5 |

Cot **Bi lot shop khoa** phai luon bang 0: san pham cua gian hang bi dinh chi
khong duoc xuat hien trong goi y.
