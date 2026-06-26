# Weekly Dashboard — Alliance Laundry Systems (Google Ads via Windsor.ai)

Dashboard "ao vivo" no visual do relatório `Weekly 24.06 — Alliance Laundry Systems`,
puxando dados em tempo real do Google Ads (conta **LATAM Brasil**, ID `313434459904767`)
através do Windsor.ai.

## Estrutura do projeto

```
.
├── index.html                     → o dashboard (login + 5 painéis do relatório)
├── app.js                         → toda a lógica: datas, fetch, cálculos, gráficos
├── netlify.toml                   → configuração da Netlify (redirect /api/* → functions)
├── package.json
└── netlify/
    └── functions/
        └── windsor.js             → backend que fala com a API do Windsor.ai (sua chave fica só aqui)
```

## Por que existe um backend (Netlify Function)?

A API key do Windsor.ai **nunca** pode aparecer no HTML/JS que roda no navegador do
cliente — qualquer pessoa que abrisse o "Ver código fonte" da página conseguiria
copiá-la e acessar todas as suas contas conectadas no Windsor.

Por isso, o dashboard (`app.js`) nunca chama o Windsor.ai diretamente. Ele chama
`/api/windsor?...`, que é resolvido pela Netlify Function `netlify/functions/windsor.js`.
Essa function roda no servidor da Netlify, lê sua chave de uma variável de ambiente
protegida, busca os dados no Windsor.ai e devolve só o resultado para o navegador.

```
Navegador (app.js)  →  /api/windsor?...  →  Netlify Function  →  Windsor.ai API
                                                  ↑
                                     WINDSOR_API_KEY (variável de ambiente,
                                     nunca aparece no código nem no navegador)
```

## Passo a passo — colocar no ar na Netlify

### 1. Pegue sua API key do Windsor.ai
No painel do Windsor.ai: **Configurações → API Keys** (ou a URL `/app/api-keys`,
dependendo da versão da interface). Copie a chave.

### 2. Suba este projeto para um repositório Git
Crie um repositório (GitHub/GitLab/Bitbucket) e suba esta pasta inteira, com a
mesma estrutura de arquivos acima.

### 3. Crie o site na Netlify
1. Acesse [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Conecte o repositório que você criou no passo 2.
3. Build settings:
   - **Build command:** deixe vazio (não há build — é HTML/JS estático + functions)
   - **Publish directory:** `.` (raiz)
   - A Netlify detecta automaticamente a pasta `netlify/functions` graças ao `netlify.toml`.

### 4. Configure a variável de ambiente com sua API key
No painel do site na Netlify: **Site configuration → Environment variables → Add a variable**
- Key: `WINDSOR_API_KEY`
- Value: *(cole sua chave do Windsor.ai aqui)*
- Scopes: marque "Functions"

Depois de salvar, faça um **novo deploy** (Deploys → Trigger deploy → Deploy site)
para a function carregar a variável.

### 5. Teste o endpoint
Depois do deploy, acesse:
```
https://SEU-SITE.netlify.app/api/windsor?connector=google_ads&date_from=2026-06-01&date_to=2026-06-23&account=313434459904767
```
Se aparecer um JSON com `"rows": [...]`, está funcionando. Se aparecer
`{"error":"WINDSOR_API_KEY não configurada..."}`, confirme o passo 4 e refaça o deploy.

### 6. Acesse o dashboard
```
https://SEU-SITE.netlify.app/
```

## Login

| Perfil   | Usuário     | Senha           |
|----------|-------------|------------------|
| Agência  | `modesto`   | `modesto@2026`   |
| Cliente  | `alliance`  | `alliance@2026`  |

⚠️ Este login é só uma trava simples no front-end (mesmo modelo do dashboard
anterior da Amakha Paris) — não é autenticação real de servidor. Para esconder
o dashboard de pessoas não autorizadas de forma mais séria, ative o recurso
**Visitor access / Password protection** nas configurações do próprio site Netlify,
ou troque os usuários/senhas em `app.js` (constante `USERS`).

## Trocar a conta do Windsor ou o conector

No topo do arquivo `app.js`:
```js
const GOOGLE_ADS_ACCOUNT = '313434459904767'; // conta LATAM Brasil
const CPL_GOAL = 35; // meta de CPL em USD usada nos KPIs e no gráfico
```

Se no futuro você quiser somar Meta Ads, a function `netlify/functions/windsor.js`
já tem um `FIELD_SETS.facebook` pronto — é só chamar `fetchW('facebook', ...)` em
`app.js` como já é feito com `google_ads`.

## Período e atualização dos dados

- Os botões **7 / 14 / 23 / 30 dias** e os campos de data no topo do dashboard
  controlam o período do painel **01 · Big Numbers** e **04 · Campanhas**.
- O painel **02 · Maio × Junho** sempre compara automaticamente o **mês corrente
  (do dia 1 até a data final escolhida)** contra o **mês anterior completo** —
  não precisa selecionar nada à parte.
- Toda vez que o cliente (ou você) clicar em **Aplicar**, o dashboard busca os
  dados mais recentes diretamente do Windsor.ai. Não há necessidade de gerar um
  novo PPTX a cada semana — esta página *é* o relatório, sempre atualizado.

## Painel 03 · Otimizações e 05 · Plano de Ação

Esses dois painéis (registro de otimizações feitas e próximos passos) são,
no relatório original, texto editado manualmente pela equipe a cada semana —
não vêm de uma métrica do Windsor. Aqui eles continuam como blocos de HTML
fáceis de editar direto em `index.html` (procure por `id="opt-container"` e
`id="actions-container"`). Se quiser, depois podemos conectar isso a uma
planilha ou a um pequeno banco de dados para editar sem precisar tocar no HTML.
