# MGV Message Handler

Distribuidor de leads de WhatsApp para imobiliária com sistema de fila de corretores.

## Funcionalidades

- **Recebimento de leads**: Webhook para receber mensagens do WhatsApp via Evolution API
- **Sistema de fila**: Gerenciamento automático de fila de corretores
- **Timeout inteligente**: Sistema de timeout de 5 minutos para respostas
- **Distribuição automática**: Atribuição automática de leads para corretores disponíveis

## Fluxo de Funcionamento

1. **Lead envia mensagem** para o número monitorado
2. **Sistema consulta fila** de corretores e seleciona o próximo
3. **Envia pergunta** para o corretor sobre disponibilidade
4. **Corretor tem 5 minutos** para responder:
   - ✅ **SIM** → Recebe dados do lead
   - ❌ **NÃO** → Passa para próximo na fila
   - ⏰ **Timeout** → Passa para próximo na fila
5. **Sistema notifica** o corretor escolhido com os dados do lead

## Tecnologias

- **NestJS**: Framework Node.js
- **Prisma ORM**: Para banco de dados
- **PostgreSQL**: Banco de dados
- **Evolution API**: Integração com WhatsApp
- **TypeScript**: Linguagem de programação

## Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Aplicar schema do banco
npx prisma db push

# Gerar Prisma Client
npx prisma generate
```

## Configuração

Configure as variáveis no arquivo `.env`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mgv_msg_handler"

# Evolution API
EVOLUTION_API_URL="http://your-evolution-api-url"
EVOLUTION_API_KEY="your-evolution-api-key"
EVOLUTION_INSTANCE_NAME="your-instance-name"

# Application
PORT="3000"
TIMEOUT_MINUTES="5"
```

## Execução

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## Documentação da API

A aplicação roda na porta configurada no `.env` (padrão: 4444).
Base URL: `http://localhost:4444`

### 📋 Corretores

#### `GET /corretores`
Lista todos os corretores ordenados por posição na fila.

**Resposta:**
```json
[
  {
    "id": "uuid",
    "nome": "João Silva",
    "telefone": "11999999999",
    "ativo": true,
    "posicaoFila": 1,
    "createdAt": "2025-01-11T14:30:00.000Z",
    "updatedAt": "2025-01-11T14:30:00.000Z"
  }
]
```

#### `GET /corretores/status-fila`
Retorna o status atual da fila de corretores.

**Resposta:**
```json
{
  "total": 5,
  "ativos": 3,
  "inativos": 2,
  "fila": [
    {
      "id": "uuid",
      "nome": "João Silva",
      "telefone": "11999999999",
      "posicao": 1
    }
  ]
}
```

#### `GET /corretores/:id`
Busca um corretor específico pelo ID.

**Resposta:**
```json
{
  "id": "uuid",
  "nome": "João Silva",
  "telefone": "11999999999",
  "ativo": true,
  "posicaoFila": 1,
  "createdAt": "2025-01-11T14:30:00.000Z",
  "updatedAt": "2025-01-11T14:30:00.000Z"
}
```

**Erros:**
- `404`: Corretor não encontrado

#### `POST /corretores`
Cria um novo corretor.

**Requisição:**
```json
{
  "nome": "João Silva",
  "telefone": "11999999999"
}
```

**Resposta:**
```json
{
  "id": "uuid",
  "nome": "João Silva",
  "telefone": "11999999999",
  "ativo": true,
  "posicaoFila": 3,
  "createdAt": "2025-01-11T14:30:00.000Z",
  "updatedAt": "2025-01-11T14:30:00.000Z"
}
```

**Erros:**
- `400`: Nome e telefone são obrigatórios
- `409`: Telefone já cadastrado

#### `PUT /corretores/:id`
Atualiza dados de um corretor.

**Requisição:**
```json
{
  "nome": "João Silva Santos",
  "telefone": "11888888888"
}
```

**Resposta:**
```json
{
  "id": "uuid",
  "nome": "João Silva Santos",
  "telefone": "11888888888",
  "ativo": true,
  "posicaoFila": 1,
  "createdAt": "2025-01-11T14:30:00.000Z",
  "updatedAt": "2025-01-11T15:30:00.000Z"
}
```

**Erros:**
- `404`: Corretor não encontrado

#### `PUT /corretores/:id/toggle-ativo`
Ativa/desativa um corretor.

**Resposta:**
```json
{
  "id": "uuid",
  "nome": "João Silva",
  "telefone": "11999999999",
  "ativo": false,
  "posicaoFila": 1,
  "createdAt": "2025-01-11T14:30:00.000Z",
  "updatedAt": "2025-01-11T15:30:00.000Z"
}
```

#### `PUT /corretores/:id/mover-para-final`
Move um corretor para o final da fila.

**Resposta:**
```json
{
  "message": "Corretor movido para o final da fila"
}
```

#### `DELETE /corretores/:id`
Remove um corretor.

**Resposta:**
```json
{
  "message": "Corretor removido com sucesso"
}
```

**Erros:**
- `404`: Corretor não encontrado

### 🎯 Leads

#### `GET /leads`
Lista todos os leads com informações completas.

**Resposta:**
```json
[
  {
    "id": "uuid",
    "nome": "Maria Cliente",
    "telefone": "11777777777",
    "status": "atribuido",
    "corretorId": "uuid",
    "createdAt": "2025-01-11T14:30:00.000Z",
    "updatedAt": "2025-01-11T15:00:00.000Z",
    "corretor": {
      "id": "uuid",
      "nome": "João Silva",
      "telefone": "11999999999"
    },
    "interacoes": [
      {
        "id": "uuid",
        "status": "respondido_sim",
        "enviadoEm": "2025-01-11T14:45:00.000Z",
        "respondidoEm": "2025-01-11T14:47:00.000Z"
      }
    ]
  }
]
```

#### `GET /leads/estatisticas`
Retorna estatísticas dos leads e interações.

**Resposta:**
```json
{
  "leads": {
    "total": 25,
    "pendentes": 3,
    "atribuidos": 18,
    "finalizados": 4
  },
  "interacoes": {
    "enviado": 5,
    "respondido_sim": 18,
    "respondido_nao": 12,
    "timeout": 3
  }
}
```

#### `GET /leads/:id`
Busca um lead específico pelo ID.

**Resposta:**
```json
{
  "id": "uuid",
  "nome": "Maria Cliente",
  "telefone": "11777777777",
  "status": "atribuido",
  "corretorId": "uuid",
  "createdAt": "2025-01-11T14:30:00.000Z",
  "updatedAt": "2025-01-11T15:00:00.000Z",
  "corretor": {
    "id": "uuid",
    "nome": "João Silva",
    "telefone": "11999999999"
  },
  "interacoes": []
}
```

**Erros:**
- `404`: Lead não encontrado

#### `POST /leads/:id/processar`
Processa um lead manualmente (inicia distribuição).

**Resposta:**
```json
{
  "message": "Lead processado com sucesso"
}
```

#### `POST /leads/processar-resposta`
Processa resposta de um corretor manualmente.

**Requisição:**
```json
{
  "telefone": "11999999999",
  "resposta": "sim"
}
```

**Resposta:**
```json
{
  "message": "Resposta processada com sucesso"
}
```

**Erros:**
- `400`: Telefone e resposta são obrigatórios

### 📱 WhatsApp

#### `GET /whatsapp/status`
Verifica o status da instância Evolution API.

**Resposta:**
```json
{
  "instance": {
    "instanceName": "mgv-instance",
    "status": "open"
  }
}
```

#### `POST /whatsapp/configure-webhook`
Configura o webhook na Evolution API.

**Requisição:**
```json
{
  "webhookUrl": "https://seu-dominio.com/webhook/messages"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Webhook configurado com sucesso"
}
```

#### `POST /whatsapp/send-message`
Envia mensagem via WhatsApp.

**Requisição:**
```json
{
  "to": "11999999999",
  "message": "Olá! Esta é uma mensagem de teste."
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso"
}
```

### 🔗 Webhook

#### `POST /webhook/messages`
Endpoint para receber webhooks da Evolution API.

**Requisição (Evolution API):**
```json
{
  "data": {
    "message": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net"
      },
      "body": "Olá, tenho interesse em um imóvel",
      "fromMe": false
    }
  }
}
```

**Resposta:**
```json
{
  "status": "success",
  "message": "Mensagem processada com sucesso"
}
```

## Códigos de Status HTTP

- `200`: Sucesso
- `400`: Erro de validação (dados obrigatórios)
- `404`: Recurso não encontrado
- `409`: Conflito (telefone já cadastrado)
- `500`: Erro interno do servidor

## Estrutura do Banco

### Corretor
- `id`: UUID único
- `nome`: Nome do corretor
- `telefone`: Telefone (único)
- `ativo`: Status ativo/inativo
- `posicaoFila`: Posição na fila
- `createdAt`: Data de criação
- `updatedAt`: Data de atualização

### Lead
- `id`: UUID único
- `nome`: Nome do lead (opcional)
- `telefone`: Telefone (único)
- `status`: Status (pendente, atribuido, finalizado)
- `corretorId`: ID do corretor atribuído
- `createdAt`: Data de criação
- `updatedAt`: Data de atualização

### Interacao
- `id`: UUID único
- `leadId`: ID do lead
- `corretorId`: ID do corretor
- `status`: Status (enviado, respondido_sim, respondido_nao, timeout)
- `enviadoEm`: Data do envio
- `respondidoEm`: Data da resposta
- `timeoutEm`: Data do timeout

## Configuração da Evolution API

1. Configure o webhook na Evolution API apontando para: `http://seu-dominio/webhook/messages`
2. Certifique-se de que o evento `MESSAGES_UPSERT` esteja habilitado
3. Configure as credenciais no arquivo `.env`

## Monitoramento

O sistema possui logs detalhados para monitoramento:
- Recebimento de mensagens
- Processamento de leads
- Timeouts e redistribuições
- Erros de comunicação

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request