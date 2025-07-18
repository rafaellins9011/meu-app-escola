import React, { useState } from 'react';

const Formulario = ({ onAdicionar }) => {
  const [dados, setDados] = useState({
    nome: '',
    turma: '',
    contato: '',
    responsavel: '',
    justificativa: '',
    outroMotivo: ''
  });

  const handleChange = (e) => {
    setDados({ ...dados, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (dados.nome.trim() === '' || dados.turma.trim() === '') {
      return alert('Preencha o nome e a turma!');
    }

    const justificativaFinal = dados.justificativa === 'outros'
      ? `Outros: ${dados.outroMotivo}`
      : dados.justificativa;

    onAdicionar({
      ...dados,
      justificativa: justificativaFinal
    });

    setDados({
      nome: '',
      turma: '',
      contato: '',
      responsavel: '',
      justificativa: '',
      outroMotivo: ''
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>
        <h3>📋 Registro de Aluno – ESCOLA EE CÍVICO-MILITAR ANA MARIA DAS GRAÇAS</h3>

        <input name="nome" placeholder="Nome do aluno" value={dados.nome} onChange={handleChange} /><br />
        <input name="turma" placeholder="Turma (ex: 9º B)" value={dados.turma} onChange={handleChange} /><br />
        <input name="contato" placeholder="Telefone do responsável" value={dados.contato} onChange={handleChange} /><br />
        <input name="responsavel" placeholder="Nome do responsável" value={dados.responsavel} onChange={handleChange} /><br />

        <label><strong>Justificativa da falta:</strong></label><br />
        <select name="justificativa" value={dados.justificativa} onChange={handleChange} required>
          <option value="">Selecione uma justificativa</option>
          <option value="Problema de saúde">Problema de saúde</option>
          <option value="Ônibus não passou">Ônibus não passou</option>
          <option value="Viagem">Viagem</option>
          <option value="Sem retorno">Sem retorno</option>
          <option value="Falta não justificada">Falta não justificada</option>
          <option value="Luto">Luto</option>
          <option value="outros">Outros</option>
        </select><br />

        {dados.justificativa === 'outros' && (
          <>
            <textarea
              name="outroMotivo"
              placeholder="Descreva o motivo"
              value={dados.outroMotivo}
              onChange={handleChange}
            /><br />
          </>
        )}

        <button type="submit">Salvar</button>
      </form>
    </>
  );
};

export default Formulario;
