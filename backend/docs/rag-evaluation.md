# Do luong he truy hoi tang cuong sinh

> Sinh tu dong bang `npm run eval:rag`. Cap nhat: 2026-09-09 08:47.
> Tap du lieu gan nhan: `eval/dataset.json` (30 cau hoi).

## 1. Truy hoi

| Chi so | Muc tieu de cuong | Do duoc |
|---|---|---|
| Recall@5 | > 75% | **100%** (30/30) |
| MRR | - | **0.919** |

### Theo nhom cau hoi

| Nhom | Dung / Tong | Ti le |
|---|---|---|
| ten-truc-tiep | 10/10 | 100% |
| sai-chinh-ta | 6/6 | 100% |
| theo-thong-so | 3/3 | 100% |
| theo-nhu-cau | 11/11 | 100% |

### Chi tiet cau tra sai

Khong co cau nao truot.

## 2. RAG Triad (phuong phap Ragas)

Cham bang LLM-as-judge tren mau 8 cau, rai deu qua cac nhom.

| Chi so | Y nghia | Diem |
|---|---|---|
| Faithfulness | Cau tra loi bam vao ngu canh, khong bia so lieu | **0.875** |
| Answer Relevance | Tra loi dung trong tam cau hoi | **0.825** |
| Context Relevance | Ngu canh lay ve co lien quan | **0.275** |

## 3. Do tre

| Chi so | Muc tieu de cuong | Do duoc |
|---|---|---|
| Thoi gian toi ky tu dau tien | < 1.5s | **4020ms** |
| Thoi gian hoan tat | < 8s | **4469ms** |

Tach lam hai moc vi streaming chi cai thien moc thu nhat. Bao cao mot con
so tong nhu truoc day che mat dung phan ma nguoi dung cam nhan duoc.
