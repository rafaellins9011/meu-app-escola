// Arquivo: src/components/Tabela.js
// ATUALIZAÇÃO: Adicionado o botão de recomposição de faltas.

import React from 'react';

const normalizeTurmaChar = (turma) => {
  return String(turma).replace(/°/g, 'º');
};

// ======================= ÁREA MODIFICADA 1: RECEBENDO A NOVA PROP =======================
const Tabela = ({ registros, onAtualizar, onWhatsapp, onEditar, onExcluir, dataSelecionada, onOpenObservationDropdown, onAbrirRelatorio, linhaSelecionada, onSelecionarLinha, onAbrirModalRecomposicao }) => {
// =================================== FIM DA MODIFICAÇÃO 1 ===================================

  const opcoesJustificativa = [
    "Selecione",
    "Problema de saúde",
    "Ônibus não passou",
    "Viagem",
    "Sem retorno",
    "Falta não justificada",
    "Luto",
    "Outros"
  ];

  const handleJustificativa = (aluno, originalIndex, justificativaSelecionada) => {
    let motivoFinal = justificativaSelecionada;

    if (justificativaSelecionada === "Outros") {
      const textoOutros = prompt("Por favor, digite a justificativa:");
      if (textoOutros !== null && textoOutros.trim() !== "") {
        motivoFinal = `Outros: ${textoOutros.trim()}`;
      } else {
        motivoFinal = "Selecione";
      }
    } else if (justificativaSelecionada === "Selecione") {
        motivoFinal = "";
    }

    const chave = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
    
    const atualizado = {
      ...aluno,
      justificativas: {
        ...aluno.justificativas,
        [chave]: motivoFinal
      }
    };

    if (motivoFinal === "") {
        delete atualizado.justificativas[chave];
    }

    onAtualizar(originalIndex, atualizado);
  };

  return (
    <div className="overflow-x-auto mt-8 shadow-lg rounded-lg">
      <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Nº</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Nome</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Turma</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Contato</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Responsável</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Justificativa</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Observação</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {registros.length === 0 ? (
            <tr>
              <td colSpan="8" className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
                Nenhum aluno encontrado para esta turma ou data.
              </td>
            </tr>
          ) : (
            registros.map((aluno, index) => {
              const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
              const justificativaAtualCompleta = aluno.justificativas?.[chaveJustificativa] || '';
              
              let justificativaDropdown = justificativaAtualCompleta;
              if (justificativaAtualCompleta.startsWith("Outros: ")) {
                  justificativaDropdown = "Outros";
              } else if (justificativaAtualCompleta === "") {
                  justificativaDropdown = "Selecione";
              }

              const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
              const observacaoAtualArray = aluno.observacoes?.[chaveObservacao] || [];
              const observacaoAtualDisplay = Array.isArray(observacaoAtualArray) ? observacaoAtualArray : (observacaoAtualArray ? [observacaoAtualArray] : []);
              
              const isSelected = linhaSelecionada === aluno.originalIndex;

              return (
                <tr 
                  key={aluno.originalIndex} 
                  onClick={() => onSelecionarLinha(aluno.originalIndex)}
                  className={`border-b border-gray-200 dark:border-gray-700 transition-colors duration-150 cursor-pointer 
                    ${isSelected 
                      ? 'bg-green-200 dark:bg-green-800' 
                      : 'even:bg-gray-100 dark:even:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`
                  }
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{index + 1}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.nome}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{normalizeTurmaChar(aluno.turma)}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.contato}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.responsavel}</td>
                  <td className="py-3 px-4 text-sm">
                    <select
                      value={justificativaDropdown}
                      onChange={(e) => {
                        e.stopPropagation(); 
                        handleJustificativa(aluno, aluno.originalIndex, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()} 
                      className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    >
                      {opcoesJustificativa.map((opcao, i) => (
                        <option key={i} value={opcao}>{opcao}</option>
                      ))}
                    </select>
                    {justificativaAtualCompleta.startsWith("Outros: ") && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {justificativaAtualCompleta.replace("Outros: ", "")}
                        </p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm relative">
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenObservationDropdown(aluno, aluno.originalIndex, e)
                          }}
                          className={`observation-button p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 w-full text-left ${observacaoAtualDisplay.length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}
                          title="Adicionar/Editar Observação"
                      >
                          {observacaoAtualDisplay.length > 0 ? "Observação" : "Selecione"}
                      </button>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {/* ======================= ÁREA MODIFICADA 2: ADICIONADO BOTÃO DE RECOMPOSIÇÃO ======================= */}
                    <div className="flex flex-nowrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAbrirModalRecomposicao(aluno)}
                        className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs hover:bg-orange-600 transition-colors duration-200 shadow-sm"
                        title="Recompor Faltas (Limpar Justificativas no Período)"
                      >
                        🔄 Recompor
                      </button>
                      <button
                        onClick={() => onAbrirRelatorio(aluno)}
                        className="px-3 py-1 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-700 transition-colors duration-200 shadow-sm"
                        title="Gerar Relatório Completo"
                      >
                        📄 Relatório
                      </button>
                      <button
                        onClick={() => onWhatsapp(aluno)}
                        className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors duration-200 shadow-sm"
                        title="Enviar WhatsApp"
                      >
                        📲 WhatsApp
                      </button>
                      <button
                        onClick={() => onEditar(aluno.originalIndex)}
                        className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-xs hover:bg-yellow-600 transition-colors duration-200 shadow-sm"
                        title="Editar Aluno"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => onExcluir(aluno.originalIndex)}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors duration-200 shadow-sm"
                        title="Excluir Aluno"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                    {/* =================================== FIM DA MODIFICAÇÃO 2 =================================== */}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Tabela;
