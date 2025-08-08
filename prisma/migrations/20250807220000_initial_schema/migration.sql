-- CreateTable
CREATE TABLE "corretores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "posicao_fila" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corretores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT,
    "telefone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "corretor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacoes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "corretor_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondido_em" TIMESTAMP(3),
    "timeout_em" TIMESTAMP(3),

    CONSTRAINT "interacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_telefone_key" ON "leads"("telefone");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_corretor_id_fkey" FOREIGN KEY ("corretor_id") REFERENCES "corretores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;