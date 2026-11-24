import * as SQLite from 'expo-sqlite';

export interface Livro {
    id?: number;
    titulo: string;
    autor: string;
    genero: string;
    preco: number;
    ano: number;
}

// ==========================================
// [JOÃO VICTOR] CONEXÃO, TABELA, CREATE E READ
// ==========================================
export async function getDbConnection() {
    return await SQLite.openDatabaseAsync('LivrariaApp.db');
}

export async function initDatabase(db: SQLite.SQLiteDatabase) {
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS LIVRO (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            autor TEXT NOT NULL,
            genero TEXT NOT NULL,
            preco REAL NOT NULL,
            ano INTEGER NOT NULL
        );
    `);
}

export async function insertLivro(db: SQLite.SQLiteDatabase, livro: Livro) {
    return await db.runAsync(
        'INSERT INTO LIVRO (titulo, autor, genero, preco, ano) VALUES (?, ?, ?, ?, ?)',
        livro.titulo, livro.autor, livro.genero, livro.preco, livro.ano
    );
}

export async function selectLivrosPaginados(db: SQLite.SQLiteDatabase, pagina: number = 1, limite: number = 3): Promise<Livro[]> {
    const offset = (pagina - 1) * limite;
    return await db.getAllAsync<Livro>(
        'SELECT * FROM LIVRO ORDER BY id DESC LIMIT ? OFFSET ?',
        limite, offset
    );
}

export async function countLivros(db: SQLite.SQLiteDatabase): Promise<number> {
    const res = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM LIVRO');
    return res ? res.total : 0;
}

// ==========================================
// [ANA LAURA] UPDATE, DELETE E SEED (10 LIVROS)
// ==========================================
export async function updateLivro(db: SQLite.SQLiteDatabase, livro: Livro) {
    return await db.runAsync(
        'UPDATE LIVRO SET titulo = ?, autor = ?, genero = ?, preco = ?, ano = ? WHERE id = ?',
        livro.titulo, livro.autor, livro.genero, livro.preco, livro.ano, livro.id!
    );
}

export async function deleteLivro(db: SQLite.SQLiteDatabase, id: number) {
    return await db.runAsync('DELETE FROM LIVRO WHERE id = ?', id);
}

export async function popularLivrosIniciais(db: SQLite.SQLiteDatabase) {
    const total = await countLivros(db);
    if (total >= 10) return { mensagem: 'O catálogo já possui 10 ou mais livros cadastrados.' };

    const livros = [
        { titulo: 'Dom Casmurro', autor: 'Machado de Assis', genero: 'Romance', preco: 39.9, ano: 1899 },
        { titulo: 'O Hobbit', autor: 'J.R.R. Tolkien', genero: 'Fantasia', preco: 59.9, ano: 1937 },
        { titulo: '1984', autor: 'George Orwell', genero: 'Ficção Científica', preco: 44.5, ano: 1949 },
        { titulo: 'A Revolução dos Bichos', autor: 'George Orwell', genero: 'Sátira', preco: 29.9, ano: 1945 },
        { titulo: 'O Alquimista', autor: 'Paulo Coelho', genero: 'Ficção', preco: 35.0, ano: 1988 },
        { titulo: 'Clean Code', autor: 'Robert C. Martin', genero: 'Tecnologia', preco: 89.9, ano: 2008 },
        { titulo: 'O Pequeno Príncipe', autor: 'Antoine de Saint-Exupéry', genero: 'Infantil', preco: 25.0, ano: 1943 },
        { titulo: 'Cem Anos de Solidão', autor: 'Gabriel García Márquez', genero: 'Realismo', preco: 62.0, ano: 1967 },
        { titulo: 'A Metamorfose', autor: 'Franz Kafka', genero: 'Clássico', preco: 22.9, ano: 1915 },
        { titulo: 'Sapiens', autor: 'Yuval Noah Harari', genero: 'História', preco: 69.9, ano: 2011 }
    ];

    for (const l of livros) {
        await insertLivro(db, l);
    }
    return { mensagem: '10 livros cadastrados com sucesso!' };
}

// ==========================================
// EXPORTAÇÃO E SINCRONIZAÇÃO COM SQLITE VIEWER
// ==========================================
export async function exportarBancoParaProjeto(db: SQLite.SQLiteDatabase): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
        const bytes = await db.serializeAsync();

        let host = 'localhost';
        if (typeof window !== 'undefined' && window.location?.hostname) {
            host = window.location.hostname;
        } else {
            try {
                const { NativeModules } = require('react-native');
                const scriptURL = NativeModules?.SourceCode?.scriptURL;
                if (scriptURL) {
                    const m = scriptURL.match(/^https?:\/\/([^/:]+)/);
                    if (m) host = m[1];
                }
            } catch {}
        }

        const url = `http://${host}:8081/api/save-db`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: bytes as any,
        });

        if (response.ok) {
            return {
                sucesso: true,
                mensagem: 'Banco sincronizado com sucesso com LivrariaApp.db no projeto! Abra o arquivo no VS Code para ver via SQLite Viewer.'
            };
        } else {
            return {
                sucesso: false,
                mensagem: `Servidor retornou status ${response.status}.`
            };
        }
    } catch (err: any) {
        return {
            sucesso: false,
            mensagem: `Erro ao exportar banco: ${err.message}`
        };
    }
}
