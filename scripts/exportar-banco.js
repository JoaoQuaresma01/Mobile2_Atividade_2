const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.resolve(__dirname, '..', 'LivrariaApp.db');

console.log(`[exportar-banco] Criando/atualizando banco SQLite em: ${dbPath}`);

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS LIVRO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    autor TEXT NOT NULL,
    genero TEXT NOT NULL,
    preco REAL NOT NULL,
    ano INTEGER NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1
  );
`);

// Verificar quantidade atual
const countStmt = db.prepare('SELECT COUNT(*) as total FROM LIVRO');
const { total } = countStmt.get();

if (total === 0) {
  const insertStmt = db.prepare(`
    INSERT INTO LIVRO (titulo, autor, genero, preco, ano, quantidade)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const livrosIniciais = [
    ['Dom Casmurro', 'Machado de Assis', 'Romance', 39.9, 1899, 5],
    ['O Hobbit', 'J.R.R. Tolkien', 'Fantasia', 59.9, 1937, 8],
    ['1984', 'George Orwell', 'Ficção Científica', 44.5, 1949, 12],
    ['A Revolução dos Bichos', 'George Orwell', 'Sátira', 29.9, 1945, 7],
    ['O Alquimista', 'Paulo Coelho', 'Ficção', 35.0, 1988, 10],
    ['Clean Code', 'Robert C. Martin', 'Tecnologia', 89.9, 2008, 4],
    ['O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Infantil', 25.0, 1943, 15],
    ['Cem Anos de Solidão', 'Gabriel García Márquez', 'Realismo', 62.0, 1967, 6],
    ['A Metamorfose', 'Franz Kafka', 'Clássico', 22.9, 1915, 9],
    ['Sapiens', 'Yuval Noah Harari', 'História', 69.9, 2011, 11]
  ];

  for (const livro of livrosIniciais) {
    insertStmt.run(...livro);
  }
  console.log(`[exportar-banco] 10 livros cadastrados com sucesso!`);
} else {
  console.log(`[exportar-banco] Banco já possui ${total} livros.`);
}

db.close();

console.log(`\n======================================================`);
console.log(`✅ Banco de dados exportado com sucesso!`);
console.log(`📁 Arquivo: LivrariaApp.db na raiz do projeto`);
console.log(`🔍 Como visualizar no VS Code:`);
console.log(`   1. Instale a extensão "SQLite Viewer" no VS Code`);
console.log(`   2. No explorador de arquivos, clique em 'LivrariaApp.db'`);
console.log(`   3. A tabela LIVRO e seus registros abrirão imediatamente!`);
console.log(`======================================================\n`);
