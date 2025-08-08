const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🔍 Testando autenticação diretamente...');
    
    const email = 'raphael@supremamkt.com.br';
    const senha = 'Teste@123';
    
    console.log(`Email: ${email}`);
    console.log(`Senha: ${senha}`);
    
    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });
    
    if (!usuario) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:', {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      cargo: usuario.cargo,
      ativo: usuario.ativo
    });
    
    // Validar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    console.log(`🔐 Senha válida: ${senhaValida ? '✅' : '❌'}`);
    
    if (senhaValida) {
      console.log('🎉 Autenticação deve funcionar!');
    } else {
      console.log('❌ Problema com a senha');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();