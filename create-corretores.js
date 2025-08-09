const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const corretores = [
  { nome: 'Thiago', telefone: '5562995477417' },
  { nome: 'Felipe', telefone: '5562981809319' },
  { nome: 'Sebastião', telefone: '5562993717170' },
  { nome: 'Carol', telefone: '5562992681997' },
  { nome: 'Luciele', telefone: '5562986221562' },
  { nome: 'Edson', telefone: '5562992590500' },
  { nome: 'Sirley', telefone: '5562992302395' },
];

async function createCorretores() {
  try {
    console.log('🔄 Iniciando cadastro de corretores...');
    console.log(`📋 Total de corretores para cadastrar: ${corretores.length}`);

    let sucessos = 0;
    let duplicatas = 0;

    for (let i = 0; i < corretores.length; i++) {
      const corretor = corretores[i];
      const posicaoFila = i + 1;

      try {
        // Verificar se corretor já existe
        const existingCorretor = await prisma.corretor.findFirst({
          where: { telefone: corretor.telefone }
        });

        if (existingCorretor) {
          console.log(`⚠️  ${corretor.nome} (${corretor.telefone}) já existe - pulando...`);
          duplicatas++;
          continue;
        }

        // Criar corretor
        const novoCorretor = await prisma.corretor.create({
          data: {
            nome: corretor.nome,
            telefone: corretor.telefone,
            ativo: true,
            posicaoFila: posicaoFila
          }
        });

        console.log(`✅ ${corretor.nome} criado com sucesso!`);
        console.log(`   📱 Telefone: ${novoCorretor.telefone}`);
        console.log(`   📍 Posição na fila: ${novoCorretor.posicaoFila}`);
        console.log(`   🆔 ID: ${novoCorretor.id}`);
        console.log('');

        sucessos++;

      } catch (error) {
        console.error(`❌ Erro ao criar corretor ${corretor.nome}:`, error.message);
      }
    }

    console.log('📊 RESUMO DA EXECUÇÃO:');
    console.log(`✅ Corretores criados com sucesso: ${sucessos}`);
    console.log(`⚠️  Corretores já existentes (pulados): ${duplicatas}`);
    console.log(`❌ Erros: ${corretores.length - sucessos - duplicatas}`);

    if (sucessos > 0) {
      console.log('\n🎉 Cadastro concluído! Os corretores estão prontos para receber leads.');
    }

    // Mostrar fila atual
    console.log('\n📋 FILA ATUAL DE CORRETORES:');
    const filaAtual = await prisma.corretor.findMany({
      where: { ativo: true },
      orderBy: { posicaoFila: 'asc' }
    });

    filaAtual.forEach((corretor, index) => {
      console.log(`${index + 1}. ${corretor.nome} (${corretor.telefone}) - Posição: ${corretor.posicaoFila}`);
    });

  } catch (error) {
    console.error('❌ Erro geral durante o cadastro:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexão com banco encerrada.');
  }
}

createCorretores();