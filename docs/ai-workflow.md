# Làm việc với AI coding (Claude Code) trong repo này

## Ba lớp cấu hình

| Lớp | File | Tác dụng |
|---|---|---|
| Ngữ cảnh luôn nạp | `CLAUDE.md`, `PROGRESS.md` mục 0 | Lệnh, quy tắc phân tầng, quy ước git. AI đọc mỗi phiên. |
| Skill (quy trình theo việc) | `.claude/skills/<ten>/SKILL.md` | Checklist từng loại task. Gõ `/<ten>` hoặc AI tự chọn theo mô tả. |
| Luật cứng | `.claude/settings.json` → `permissions.deny` | Chặn hẳn lệnh nguy hiểm (`gh pr create`, force push). CLAUDE.md chỉ là lời khuyên; cái gì *bắt buộc* thì đặt ở đây. |

## Skill có sẵn

| Lệnh | Khi nào |
|---|---|
| `/feature <mô tả>` | Thêm tính năng: khám phá → kế hoạch → code theo tầng → test → ship |
| `/bugfix <triệu chứng>` | Sửa lỗi: viết test tái hiện (đỏ) → tìm gốc → sửa → xanh |
| `/db-change <mô tả>` | Đổi schema Prisma: migration, kiểm SQL, seed, ERD |
| `/ship` | Chạy test/lint/build liên quan, commit, push thẳng `main` |

## Vòng làm việc nên theo

1. **Một task một phiên.** Xong task thì `/clear` để ngữ cảnh không lẫn.
2. **Nói rõ đích.** Tốt: "`/feature` seller xuất CSV đơn hàng theo khoảng ngày, chỉ đơn của shop mình". Kém: "làm cái export".
3. **Task lớn → xem kế hoạch trước.** Bật Plan Mode (Shift+Tab), duyệt kế hoạch rồi mới cho code.
4. **AI phải tự kiểm chứng.** Skill bắt chạy test; nếu AI nói "xong" mà không có output test, hỏi lại.
5. **Đọc diff trước khi push** khi đụng tiền, quyền, xoá dữ liệu.
6. **Sửa AI một lần, ghi lại mãi.** AI làm sai cùng một kiểu hai lần → thêm một dòng vào `CLAUDE.md` hoặc skill liên quan.

## Thêm skill mới

Tạo `.claude/skills/<ten>/SKILL.md`:

```markdown
---
name: <ten>
description: Làm gì + khi nào dùng (kèm từ khoá user hay nói).
---

# Các bước
1. ...
```

Giữ mỗi skill một việc, dưới ~100 dòng. Commit vào git để cả nhóm dùng chung.

## Nguồn tham khảo

- Tài liệu chính thức: <https://code.claude.com/docs/en/skills>
- Tổng hợp best practice: <https://the-prompt-shelf.pages.dev/blog/claude-code-best-practices-2026>, <https://aiengineerinsights.com/blog/claude-code-best-practices/>
