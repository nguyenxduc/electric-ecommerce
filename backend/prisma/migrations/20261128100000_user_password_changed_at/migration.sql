-- Thu hoi JWT cu khi doi/reset mat khau
ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMP(3);
