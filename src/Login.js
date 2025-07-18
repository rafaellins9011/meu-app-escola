// Arquivo: src/Login.js
// ATUALIZAÇÃO: A função onLogin agora envia a senha do usuário.
// NOVIDADE: Adicionada mensagem de boas-vindas e logo da escola na tela de login.

import React, { useState } from 'react';

const USUARIOS = [
  // Monitores
  { nome: "Denver", senha: "123@", tipo: "monitor" },
  { nome: "Rafael", senha: "123@", tipo: "monitor" },
  { nome: "Brito", senha: "123@", tipo: "monitor" },
  { nome: "Dias", senha: "123@", tipo: "monitor" },
  { nome: "Douglas", senha: "123@", tipo: "monitor" },
  { nome: "Fonseca", senha: "123@", tipo: "monitor" },
  { nome: "W. Mendes", senha: "123@", tipo: "monitor" },

  // Gestores
  { nome: "Cap. Roger", senha: "cap123@", tipo: "gestor" },
  { nome: "Cap. Gonzaga", senha: "cap123@", tipo: "gestor" },
  { nome: "admin", senha: "admin123@", tipo: "gestor" }
];

const Login = ({ onLogin }) => {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = USUARIOS.find(u => u.nome.toLowerCase() === nome.toLowerCase() && u.senha === senha);

    if (user) {
      // ======================= ÁREA MODIFICADA =======================
      // Agora, passamos a senha do usuário junto com o nome e o tipo.
      onLogin(user.nome, user.senha, user.tipo);
      // =================== FIM DA MODIFICAÇÃO ====================
    } else {
      setErro("Usuário ou senha inválidos");
    }
  };

  return (
    <div style={{ padding: 30, textAlign: 'center' }}>
      {/* NOVIDADE: Logo da escola adicionada aqui */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <img src="/logo-escola.png" alt="Logo da Escola" style={{ height: 80 }} />
      </div>

      {/* NOVIDADE: Mensagem de boas-vindas adicionada aqui */}
      <h1 style={{
        marginBottom: '20px', /* Espaço abaixo do título */
        fontSize: '1.5em', /* Tamanho da fonte, pode ajustar */
        fontWeight: 'bold', /* Negrito */
        color: '#333', /* Cor do texto */
        maxWidth: '600px', /* Limita a largura para melhor leitura */
        margin: '0 auto 30px auto', /* Centraliza e adiciona margem inferior */
        lineHeight: '1.4' /* Espaçamento entre linhas */
      }}>
        BEM-VINDO(A) À ÁREA VIRTUAL DA GESTÃO MILITAR DA ESCOLA ESTADUAL PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA.
      </h1>

      <h2>Login de Usuário</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nome do usuário"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ padding: 10, width: 250 }}
        /><br /><br />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{ padding: 10, width: 250 }}
        /><br /><br />

        <button type="submit" style={{ padding: '10px 30px' }}>Entrar</button>
      </form>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}
    </div>
  );
};

export default Login;