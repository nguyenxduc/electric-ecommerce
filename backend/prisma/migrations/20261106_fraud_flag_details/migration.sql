-- So lieu phat hien, ghi chu nguoi mua va nhan dinh AI cho FraudFlag.
ALTER TABLE "fraud_flags" ADD COLUMN "details" JSONB NOT NULL DEFAULT '{}';
