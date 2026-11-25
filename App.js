import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

import {
  getDbConnection,
  initDatabase,
  insertLivro,
  selectLivrosPaginados,
  countLivros,
  updateLivro,
  deleteLivro,
  popularLivrosIniciais,
  exportarBancoParaProjeto
} from './Banco/Config';

const ITENS_POR_PAGINA = 3;

export default function App() {
  const [db, setDb] = useState(null);
  const [livros, setLivros] = useState([]);

  // Estados
  const [titulo, setTitulo] = useState('');
  const [autor, setAutor] = useState('');
  const [genero, setGenero] = useState('');
  const [preco, setPreco] = useState('');
  const [ano, setAno] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Estado de Edição
  const [idLivroEdicao, setIdLivroEdicao] = useState(null);

  // Inicialização Mobile
  useEffect(() => {
    async function inicializar() {
      try {
        const conexao = await getDbConnection();
        await initDatabase(conexao);
        setDb(conexao);
        await carregarPagina(conexao, 1);
      } catch (err) {
        Alert.alert('Erro', 'Falha ao inicializar o banco no celular.');
      }
    }
    inicializar();
  }, []);

  // Leitura com Paginação
  async function carregarPagina(dbInstancia, numPagina) {
    const dbAtivo = dbInstancia || db;
    if (!dbAtivo) return;

    const total = await countLivros(dbAtivo);
    setTotalRegistros(total);

    const lista = await selectLivrosPaginados(dbAtivo, numPagina, ITENS_POR_PAGINA);
    setLivros(lista);
    setPaginaAtual(numPagina);
  }

  function limparFormulario() {
    setIdLivroEdicao(null);
    setTitulo('');
    setAutor('');
    setGenero('');
    setPreco('');
    setAno('');
    setQuantidade('');
  }

  // Salvar (Create ou Update)
  async function handleSalvar() {
    if (!titulo.trim() || !autor.trim() || !genero.trim() || !preco.trim() || !ano.trim() || !quantidade.trim()) {
      Alert.alert('Aviso', 'Preencha todos os campos, incluindo a Quantidade.');
      return;
    }

    const valorPreco = parseFloat(preco.replace(',', '.'));
    const valorAno = parseInt(ano, 10);
    const valorQuantidade = parseInt(quantidade, 10);

    if (isNaN(valorPreco) || isNaN(valorAno) || isNaN(valorQuantidade) || valorQuantidade < 0) {
      Alert.alert('Aviso', 'Preço, Ano e Quantidade devem ser números válidos.');
      return;
    }

    const dados = {
      titulo: titulo.trim(),
      autor: autor.trim(),
      genero: genero.trim(),
      preco: valorPreco,
      ano: valorAno,
      quantidade: valorQuantidade
    };

    if (idLivroEdicao) {
      // Update
      await updateLivro(db, { ...dados, id: idLivroEdicao });
      Alert.alert('Sucesso', 'Livro atualizado no catálogo!');
    } else {
      // Create
      await insertLivro(db, dados);
      Alert.alert('Sucesso', 'Livro cadastrado com sucesso!');
    }

    limparFormulario();
    await carregarPagina(db, idLivroEdicao ? paginaAtual : 1);
  }

  // Ações de Editar e Excluir
  function handleEditar(livro) {
    setIdLivroEdicao(livro.id);
    setTitulo(livro.titulo);
    setAutor(livro.autor);
    setGenero(livro.genero);
    setPreco(String(livro.preco));
    setAno(String(livro.ano));
    setQuantidade(String(livro.quantidade ?? 1));
  }

  function handleExcluir(id) {
    Alert.alert('Confirmar Exclusão', 'Deseja remover este livro do catálogo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteLivro(db, id);
          const novoTotal = totalRegistros - 1;
          const maxPag = Math.ceil(novoTotal / ITENS_POR_PAGINA) || 1;
          const pagDestino = paginaAtual > maxPag ? maxPag : paginaAtual;
          await carregarPagina(db, pagDestino);
        }
      }
    ]);
  }

  // Carga de 10 Livros
  async function handlePopular() {
    const res = await popularLivrosIniciais(db);
    Alert.alert('Demonstração', res.mensagem);
    await carregarPagina(db, 1);
  }

  // Sincronizar com SQLite Viewer
  async function handleSincronizarSQLite() {
    if (!db) return;
    const res = await exportarBancoParaProjeto(db);
    Alert.alert('SQLite Viewer', res.mensagem);
  }

  const totalPaginas = Math.ceil(totalRegistros / ITENS_POR_PAGINA) || 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Text style={styles.logo}>📚</Text>
            <Text style={styles.tituloApp}>Livraria Saber & Arte</Text>
            <Text style={styles.subtituloApp}>Desenvolvido por João Victor & Ana Laura</Text>
          </View>

          {/* Botão dos 10 Livros */}
          <TouchableOpacity 
            style={styles.seedButton} 
            onPress={handlePopular}
            activeOpacity={0.7}
          >
            <Text style={styles.seedText}>⚡ Inserir 10 Livros de Exemplo</Text>
          </TouchableOpacity>

          {/* Formulário */}
          <View style={styles.cardForm}>
            <Text style={styles.formTitle}>
              {idLivroEdicao ? '✏️ Editar Livro' : '➕ Novo Livro'}
            </Text>

            <TextInput style={styles.input} placeholder="Título da Obra" placeholderTextColor="#94a3b8" value={titulo} onChangeText={setTitulo} />
            <TextInput style={styles.input} placeholder="Autor" placeholderTextColor="#94a3b8" value={autor} onChangeText={setAutor} />
            <TextInput style={styles.input} placeholder="Gênero" placeholderTextColor="#94a3b8" value={genero} onChangeText={setGenero} />

            <View style={styles.rowInputs}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Preço" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" value={preco} onChangeText={setPreco} />
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Ano" placeholderTextColor="#94a3b8" keyboardType="numeric" value={ano} onChangeText={setAno} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Qtd" placeholderTextColor="#94a3b8" keyboardType="numeric" value={quantidade} onChangeText={setQuantidade} />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
                <Text style={styles.btnSalvarTexto}>{idLivroEdicao ? 'Atualizar Livro' : 'Salvar no Catálogo'}</Text>
              </TouchableOpacity>
              {idLivroEdicao && (
                <TouchableOpacity style={styles.btnCancelar} onPress={limparFormulario}>
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Cards de Livros */}
          <View style={styles.secaoLista}>
            <View style={styles.topoLista}>
              <Text style={styles.tituloSecao}>Catálogo de Livros</Text>
              <Text style={styles.badge}>Total: {totalRegistros}</Text>
            </View>

            {livros.length === 0 ? (
              <View style={styles.cardVazio}>
                <Text style={styles.textoVazio}>Nenhum livro cadastrado nesta página.</Text>
              </View>
            ) : (
              livros.map((livro) => (
                <View key={livro.id} style={styles.cardLivro}>
                  <Text style={styles.cardTitulo}>{livro.titulo}</Text>
                  <Text style={styles.cardAutor}>Autor: {livro.autor}</Text>
                  <View style={styles.tags}>
                    <Text style={styles.tag}>{livro.genero}</Text>
                    <Text style={styles.tag}>Ano: {livro.ano}</Text>
                    <Text style={styles.tag}>Qtd: {livro.quantidade ?? 1}</Text>
                  </View>
                  <Text style={styles.cardPreco}>R$ {Number(livro.preco).toFixed(2)}</Text>

                  <View style={styles.acoesCard}>
                    <TouchableOpacity style={styles.btnEditar} onPress={() => handleEditar(livro)}>
                      <Text style={styles.btnEditarTexto}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnExcluir} onPress={() => handleExcluir(livro.id)}>
                      <Text style={styles.btnExcluirTexto}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Paginação */}
            {totalRegistros > 0 && (
              <View style={styles.paginacao}>
                <TouchableOpacity
                  style={[styles.btnPag, paginaAtual === 1 && styles.btnPagDesabilitado]}
                  disabled={paginaAtual === 1}
                  onPress={() => carregarPagina(db, paginaAtual - 1)}
                >
                  <Text style={styles.btnPagTexto}>◀ Anterior</Text>
                </TouchableOpacity>

                <Text style={styles.indicadorPag}>Página {paginaAtual} de {totalPaginas}</Text>

                <TouchableOpacity
                  style={[styles.btnPag, paginaAtual === totalPaginas && styles.btnPagDesabilitado]}
                  disabled={paginaAtual === totalPaginas}
                  onPress={() => carregarPagina(db, paginaAtual + 1)}
                >
                  <Text style={styles.btnPagTexto}>Próxima ▶</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginVertical: 12 },
  logo: { fontSize: 40, marginBottom: 4 },
  tituloApp: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  subtituloApp: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  seedButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  seedText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  cardForm: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12 },
  input: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14
  },
  rowInputs: { flexDirection: 'row' },
  formActions: { flexDirection: 'row', marginTop: 6 },
  btnSalvar: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnSalvarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  btnCancelar: { marginLeft: 10, backgroundColor: '#475569', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  btnCancelarTexto: { color: '#fff', fontWeight: '600' },
  secaoLista: { marginTop: 8 },
  topoLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tituloSecao: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
  badge: { color: '#38bdf8', backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold' },
  cardVazio: { backgroundColor: '#1e293b', padding: 24, borderRadius: 8, alignItems: 'center' },
  textoVazio: { color: '#94a3b8', fontSize: 14 },
  cardLivro: { backgroundColor: '#1e293b', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardTitulo: { fontSize: 17, fontWeight: 'bold', color: '#f8fafc' },
  cardAutor: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  tags: { flexDirection: 'row', marginVertical: 6 },
  tag: { backgroundColor: '#0f172a', color: '#38bdf8', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6, fontWeight: '600' },
  cardPreco: { fontSize: 16, fontWeight: 'bold', color: '#4ade80', marginTop: 4 },
  acoesCard: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10, marginTop: 8 },
  btnEditar: { backgroundColor: '#eab308', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, marginRight: 8 },
  btnEditarTexto: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },
  btnExcluir: { backgroundColor: '#ef4444', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  btnExcluirTexto: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  paginacao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  btnPag: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  btnPagDesabilitado: { backgroundColor: '#334155', opacity: 0.5 },
  btnPagTexto: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  indicadorPag: { color: '#94a3b8', fontWeight: '600', fontSize: 13 }
});
