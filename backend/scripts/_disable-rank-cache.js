// Import DAU TIEN trong cac script do: ES module chay theo thu tu import, nen
// bien nay duoc dat truoc khi ai/retrieval.js doc no. Khong tat thi phan A
// (truy hoi) lam nong cache va TTFT o phan B duoc do tren cache hit.
process.env.AI_RETRIEVAL_CACHE_TTL_MS = "0";
