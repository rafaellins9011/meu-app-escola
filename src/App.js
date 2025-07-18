// Arquivo: src/App.js
// ATUALIZAÇÃO: Adicionada a gestão do estado da senha do usuário.

import React, { useState, useEffect } from 'react';
import Login from './Login';
import Painel from './components/Painel';

function App() {
  const [usuarioLogado, setUsuarioLogado] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState('');
  // ======================= ÁREA MODIFICADA 1: NOVO ESTADO PARA SENHA =======================
  const [senhaUsuario, setSenhaUsuario] = useState('');
  // =================================== FIM DA MODIFICAÇÃO 1 ===================================

  useEffect(() => {
    const salvo = localStorage.getItem('monitor');
    const tipo = localStorage.getItem('tipo');
    // Carrega a senha salva também
    const senhaSalva = localStorage.getItem('senhaUsuario'); 

    if (salvo && tipo && senhaSalva) {
      setUsuarioLogado(salvo);
      setTipoUsuario(tipo);
      setSenhaUsuario(senhaSalva);
    }
  }, []);

  // ======================= ÁREA MODIFICADA 2: FUNÇÃO LOGIN ATUALIZADA =======================
  const login = (nome, senha, tipo) => {
    setUsuarioLogado(nome);
    setTipoUsuario(tipo);
    setSenhaUsuario(senha); // Guarda a senha no estado
    localStorage.setItem('monitor', nome);
    localStorage.setItem('tipo', tipo);
    localStorage.setItem('senhaUsuario', senha); // Guarda a senha no localStorage
  };
  // =================================== FIM DA MODIFICAÇÃO 2 ===================================

  const logout = () => {
    setUsuarioLogado('');
    setTipoUsuario('');
    setSenhaUsuario(''); // Limpa a senha do estado
    localStorage.removeItem('monitor');
    localStorage.removeItem('tipo');
    localStorage.removeItem('senhaUsuario'); // Remove a senha do localStorage
  };

  return (
    <div>
      {usuarioLogado ? (
        // ======================= ÁREA MODIFICADA 3: PASSANDO A SENHA PARA O PAINEL =======================
        <Painel 
          usuarioLogado={usuarioLogado} 
          tipoUsuario={tipoUsuario} 
          onLogout={logout} 
          senhaUsuario={senhaUsuario} 
        />
        // =================================== FIM DA MODIFICAÇÃO 3 ===================================
      ) : (
        <Login onLogin={login} />
      )}
    </div>
  );
}

export default App;
