const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Verificando usuário no banco...');
    
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'raphael@supremamkt.com.br' }
    });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado!');
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`ID: ${usuario.id}`);
    console.log(`Nome: ${usuario.nome}`);
    console.log(`Email: ${usuario.email}`);
    console.log(`Cargo: ${usuario.cargo}`);
    console.log(`Ativo: ${usuario.ativo}`);
    console.log(`Senha hash: ${usuario.senha}`);
    
    // Testar se a senha confere
    const senhaCorreta = await bcrypt.compare('Teste@123', usuario.senha);
    console.log(`🔐 Senha 'Teste@123' confere: ${senhaCorreta ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();