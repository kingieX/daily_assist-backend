ALTER TABLE "clients"
ADD COLUMN "client_code" TEXT;

CREATE UNIQUE INDEX "clients_client_code_key" ON "clients"("client_code");
