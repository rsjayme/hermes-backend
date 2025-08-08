const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
  try {
    console.log('🔄 Criando usuário...');

    // Verificar se usuário já existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email: 'raphael@supremamkt.com.br' }
    });

    if (existingUser) {
      console.log('❌ Usuário já existe com este email!');
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash('Teste@123', 10);

    // Criar usuário
    const user = await prisma.usuario.create({
      data: {
        nome: 'Raphael',
        email: 'raphael@supremamkt.com.br',
        senha: hashedPassword,
        cargo: 'ADMIN',
        ativo: true
      }
    });

    console.log('✅ Usuário criado com sucesso!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Nome: ${user.nome}`);
    console.log(`🔑 Cargo: ${user.cargo}`);
    console.log(`🔒 Senha: Teste@123`);
    console.log(`📅 Criado em: ${user.createdAt}`);

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();