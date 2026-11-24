# 📚 Livraria Saber & Arte - Aplicativo Mobile com SQLite Local

> **Atividade 2 - Programação para Dispositivos Móveis II**  
> Aplicativo mobile nativo desenvolvido com **React Native**, **Expo (SDK 58)** e banco de dados **SQLite embarcado (Offline-First)** com CRUD completo, paginação nativa e carga de demonstração.

---

## 👥 Integrantes e Divisão de Responsabilidades

O projeto foi planejado e desenvolvido em conjunto por **João Victor** e **Ana Laura**, dividindo de forma equilibrada as três camadas da aplicação (**Banco de Dados**, **Lógica/Backend** e **Interface/Frontend**):

### 👨‍💻 João Victor — Entrada de Dados, Leitura e Paginação
* **Banco de Dados (SQLite):**
  * `getDbConnection`: Conexão com o banco local embarcado (`LivrariaApp.db`).
  * `initDatabase`: Criação da tabela `LIVRO` com chave primária autoincrementada e ativação do modo de alta performance `PRAGMA journal_mode = WAL`.
  * `insertLivro`: Inserção parametrizada utilizando *placeholders* (`?`) contra ataques de SQL Injection.
  * `selectLivrosPaginados`: Consulta paginada nativa no banco utilizando comandos `LIMIT 3` e `OFFSET` para não sobrecarregar a memória do smartphone.
  * `countLivros`: Consulta agregada `SELECT COUNT(*)` para cálculo dinâmico da quantidade total de páginas.
* **Frontend e Interface (UI/UX):**
  * Estruturação visual com tema escuro profissional (*Dark Theme*).
  * Cabeçalho temático da Livraria.
  * Formulário de cadastro de livros com validação de campos obrigatórios e sanitização de dados numéricos.
  * Configuração de teclados nativos para dispositivos móveis (`decimal-pad` para o preço e `numeric` para o ano de publicação).
  * Controles de paginação nativos (**◀ Anterior** e **Próxima ▶**) com bloqueio automático na primeira e na última página, além de indicador visual da página atual.

---

### 👩‍💻 Ana Laura — Edição, Exclusão e Carga de Demonstração
* **Banco de Dados (SQLite):**
  * `updateLivro`: Atualização seletiva com `UPDATE LIVRO SET ... WHERE id = ?` garantindo que apenas a obra selecionada seja alterada.
  * `deleteLivro`: Remoção física de registro no celular via `DELETE FROM LIVRO WHERE id = ?`.
  * `popularLivrosIniciais`: Carga automática (*Seed*) contendo 10 obras clássicas da literatura mundial, com trava de segurança para não duplicar dados caso o catálogo já possua 10 ou mais registros.
* **Frontend e Interface (UI/UX):**
  * Cartões estilizados (*Cards*) para exibição de cada livro com tipografia destacada, preço formatado em Real (`R$`) e etiquetas coloridas (*Badges*) para gênero literário e ano.
  * Botão de demonstração no topo da tela: `⚡ Inserir 10 Livros de Exemplo (Demonstração)` para carga com apenas 1 clique durante a apresentação.
  * Fluxo de edição interativo: botão **Editar** em cada cartão que preenche os campos do formulário automaticamente, altera o botão principal para *"Atualizar Livro"* e exibe o botão *"Cancelar"*.
  * Exclusão segura: botão **Excluir** integrado ao diálogo nativo do sistema operacional (`Alert.alert`), exigindo confirmação do usuário antes de deletar fisicamente o registro.

---

## 🧠 Como o SQLite Funciona no Smartphone (Arquitetura)

### 1. O SQLite precisa de uma connection string ou servidor remoto?
**Não!** Ao contrário de bancos de dados cliente-servidor (como MongoDB, MySQL ou PostgreSQL), o SQLite é **Serverless** (não depende de servidores ou portas de rede) e **Embarcado (Embedded)**. Ele roda 100% local dentro do próprio smartphone, operando de maneira totalmente offline (sem necessidade de internet).

A sua conexão é direta ao arquivo físico criado no armazenamento interno do celular:
```typescript
const db = await SQLite.openDatabaseAsync('LivrariaApp.db');
```

### 2. Existe criação de usuário e senha no banco?
**Não há usuários nem senhas dentro do SQLite!**  
Em bancos remotos na nuvem, múltiplos usuários se conectam simultaneamente via rede, exigindo autenticação e controle de permissões. No ambiente mobile, a segurança é garantida pelo próprio **Sistema Operacional (Android / iOS)** por meio do conceito de **Sandbox (Caixa de Areia)**: cada aplicativo possui um diretório privativo isolado, impedindo que outros aplicativos acessem o arquivo `LivrariaApp.db`.

### 3. O que acontece ao fechar o app ou desligar o smartphone?
Os dados permanecem **100% salvos e persistidos**. Graças à cláusula `CREATE TABLE IF NOT EXISTS LIVRO (...)` e ao arquivo físico `.db` na memória flash do aparelho, o estado do acervo é mantido intacto.

### 4. Como visualizar o que está gravado no banco?
* **Pela própria interface do aplicativo:** A tela com paginação reflete em tempo real o estado exato da tabela.
* **Pelo Terminal do Expo:** Consultas via `console.log` exibem os objetos formatados no terminal de desenvolvimento.
* **Por visualizadores gráficos externos:** O arquivo `.db` pode ser visualizado diretamente no VS Code com a extensão **SQLite Viewer** (veja a seção detalhada abaixo).

---

## 🔍 Como Visualizar o Banco SQLite no VS Code (SQLite Viewer)

Para inspecionar o arquivo SQLite com interface gráfica diretamente dentro do VS Code, siga os passos abaixo:

### 1. Instalar a Extensão no VS Code
1. Abra a aba de extensões no VS Code (`Ctrl + Shift + X`).
2. Pesquise por **SQLite Viewer** (por *Florian Klampfl* ou *qwtel*).
3. Clique em **Install**.

### 2. Gerar ou Sincronizar o Arquivo `LivrariaApp.db`

Você tem **duas formas** fáceis de ter o banco de dados na raiz do projeto:

* **Opção A — Pelo Script Local (Mais rápido, não precisa de celular/emulador ligado):**
  Execute no terminal:
  ```bash
  npm run exportar-banco
  ```
  Isso cria instantaneamente o arquivo `LivrariaApp.db` na raiz com a tabela `LIVRO` e os 10 livros cadastrados.

* **Opção B — Pelo Próprio Aplicativo Aberto no Celular/Emulador:**
  No aplicativo em execução, clique no botão verde:
  ```text
  💾 Sincronizar Banco com VS Code (SQLite Viewer)
  ```
  O app serializará os dados do dispositivo e salvará diretamente no arquivo `LivrariaApp.db` na raiz do projeto.

### 3. Abrir e Visualizar no VS Code
* No explorador de arquivos do VS Code, clique no arquivo **`LivrariaApp.db`**.
* A interface visual do **SQLite Viewer** será aberta na aba do editor, exibindo a tabela `LIVRO` com todas as colunas (`id`, `titulo`, `autor`, `genero`, `preco`, `ano`) e os registros em formato de planilha interativa!

---

## 🛠️ Tecnologias Utilizadas

* **Linguagem:** JavaScript (ES6+) e TypeScript
* **Framework Mobile:** [React Native](https://reactnative.dev/)
* **Plataforma:** [Expo](https://expo.dev/) (SDK 58)
* **Banco de Dados Local:** `expo-sqlite` (v58)
* **Bundler & Otimizações:** Metro Bundler com script de correção para compatibilidade com pastas Windows/OneDrive (`patch-metro.js`)

---

## 📁 Estrutura de Arquivos

```text
Mobile2_Atividade_2/
├── Banco/
│   └── Config.tsx         # Conexão, criação da tabela, CRUD e Seed dos 10 livros
├── App.js                 # Telas, formulários, cards, paginação e diálogos
├── metro.config.js        # Configuração do Metro Bundler (WASM, caminhos absolutos)
├── patch-metro.js         # Script de compatibilidade de caminhos e leitura no Windows
├── package.json           # Dependências do Expo SDK 58 e scripts do projeto
├── tsconfig.json          # Configuração do TypeScript
├── app.json               # Metadados e configurações do aplicativo no Expo
└── README.md              # Documentação completa do projeto
```

---

## 🚀 Como Baixar e Executar o Projeto

### Pré-requisitos
* Ter o **Node.js** instalado (versão 18 ou superior).
* Para rodar no celular físico: ter o aplicativo **Expo Go** instalado no smartphone (Android / iOS).
* Para rodar no computador: ter o **Android Studio** com emulador configurado.

### Passo 1: Clonar o Repositório
```bash
git clone https://github.com/JoaoQuaresma01/Mobile2_Atividade_2.git
cd Mobile2_Atividade_2
```

### Passo 2: Instalar as Dependências
Execute o comando abaixo no terminal da pasta do projeto:
```bash
npm install
```
*(O script `patch-metro.js` será acionado automaticamente no postinstall para garantir total compatibilidade com o Windows).*

### Passo 3: Iniciar o Servidor Metro
Inicie o projeto limpando o cache:
```bash
npx expo start -c
```

### Passo 4: Abrir o Aplicativo

* **No Emulador do Android Studio:** Com o emulador aberto, pressione a tecla **`a`** no terminal onde o Expo está rodando.
* **No Celular Físico:** Abra o aplicativo **Expo Go** no celular e escaneie o QR Code exibido no terminal *(certifique-se de que o computador e o celular estão conectados na mesma rede Wi-Fi)*.
* **Caso esteja em redes diferentes ou 4G:** Execute iniciando com túnel:
  ```bash
  npx expo start -c --tunnel
  ```

---

## 📋 Roteiro de Demonstração e Avaliação

Para testar todas as funcionalidades exigidas na atividade durante a apresentação, siga este roteiro:

1. **Carga Inicial dos 10 Livros (Requisito Obrigatório):**
   * Ao abrir o app, clique no botão superior **"⚡ Inserir 10 Livros de Exemplo (Demonstração)"**.
   * Uma mensagem de sucesso confirmará o cadastro das 10 obras clássicas.
   * Clique novamente no botão para verificar a trava de segurança que impede duplicação.
2. **Navegação com Paginação (LIMIT 3 e OFFSET):**
   * Observe que são exibidos exatamente 3 livros por página.
   * Utilize o botão **Próxima ▶** para navegar entre as páginas 1, 2, 3 e 4.
   * Note que o botão **◀ Anterior** fica desabilitado na primeira página e o botão **Próxima ▶** é desativado na última página.
3. **Cadastro de Novo Livro (CREATE):**
   * Preencha os campos (Título, Autor, Gênero, Preço e Ano) e clique em **"Salvar no Catálogo"**.
   * O livro será inserido via SQLite e o app retornará à página 1 exibindo o novo registro no topo.
   * Tente salvar com campos vazios ou letras no preço/ano para conferir as validações de entrada.
4. **Edição de Livro (UPDATE):**
   * Em qualquer cartão, clique no botão amarelo **"Editar"**.
   * Os dados serão carregados no formulário no topo, o título mudará para *"✏️ Editar Livro"* e os botões mudarão para *"Atualizar Livro"* e *"Cancelar"*.
   * Altere algum valor (ex: Preço) e clique em **"Atualizar Livro"**. O card será atualizado imediatamente no SQLite.
5. **Exclusão com Diálogo de Confirmação (DELETE):**
   * Clique no botão vermelho **"Excluir"** em qualquer cartão.
   * Uma janela nativa de alerta (`Alert.alert`) solicitará confirmação antes de apagar o registro.
   * Ao confirmar, o livro é removido fisicamente do SQLite e a paginação é recalculada.
6. **Comprovação de Persistência Offline:**
   * Feche completamente o aplicativo no celular/emulador e reabra.
   * Todos os dados cadastrados, editados ou excluídos estarão preservados exatamente como estavam.
