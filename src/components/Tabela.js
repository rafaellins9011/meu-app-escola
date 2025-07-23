// Arquivo: src/components/Tabela.js
// ATUALIZAÇÃO: Adicionado o botão de recomposição de faltas.
// CORREÇÃO: Passando o objeto de evento corretamente para onOpenObservationDropdown.
// NOVIDADE FOTO: Adicionado gerenciamento de fotos (tirar, visualizar, excluir) na tabela.
// NOVIDADE LAYOUT: Coluna da foto movida para a esquerda do nome.
// NOVIDADE VISUALIZAÇÃO: Miniatura da foto abre em visualizador flutuante.
// ATUALIZAÇÃO LAYOUT: Botões de foto movidos para a coluna de Ações.
// ATUALIZAÇÃO FOTO: Coluna 'Foto' agora exibe um botão/símbolo para visualizar a foto.
// ATUALIZAÇÃO BOTÕES: Botões de ação agora exibem apenas símbolos para melhor visualização móvel.
// ATUALIZAÇÃO INDEPENDÊNCIA: Coluna de "Chamada" e "Justificativa" são mais independentes.
// CORREÇÃO ERRO: Adicionado normalizeTurmaChar para resolver "not defined".
// NOVA CORREÇÃO: Lógica de seleção do checkbox e handlePresence ajustadas.
// CORREÇÃO CRÍTICA: Adicionado 'registros' de volta aos props do componente Tabela.
// ULTIMA TENTATIVA: Debug e refinamento da lógica de isPresent e handlePresence.
// NOVA LÓGICA DE PRESENÇA: Campo booleano separado no Firestore para controle da chamada.
// NOVIDADE BOTÃO: Botão "Alternar Seleção" (✅) adicionado ao cabeçalho da coluna "Chamada".
// CORREÇÃO CRÍTICA FINAL: Adicionado 'onToggleAllChamada' aos props RECEBIDOS pelo componente Tabela.

import React from 'react';

// Função normalizeTurmaChar adicionada de volta a este arquivo
const normalizeTurmaChar = (turma) => {
  return String(turma).replace(/°/g, 'º');
};

const Tabela = ({
  registros,
  onAtualizar,
  onWhatsapp,
  onEditar,
  onExcluir,
  dataSelecionada,
  onOpenObservationDropdown,
  onAbrirRelatorio,
  linhaSelecionada,
  onSelecionarLinha,
  onAbrirModalRecomposicao,
  onAbrirModalFoto,
  onViewPhoto,
  onExcluirFoto,
  onToggleAllChamada // <--- ESSA LINHA É A CORREÇÃO CRÍTICA! ELA PRECISA ESTAR AQUI.
}) => {

  const opcoesJustificativa = [
    "Selecione",
    "Problema de saúde",
    "Ônibus não passou",
    "Viagem",
    "Licença-maternidade",
    "Luto",
    "Outros",
    "Falta não justificada" // Mantido aqui para compatibilidade com dados antigos, mas não é usado pela Chamada agora
  ];

  const handleJustificativa = (aluno, justificativaSelecionada) => {
    let motivoFinal = justificativaSelecionada;

    if (justificativaSelecionada === "Outros") {
      const textoOutros = prompt("Por favor, digite a justificativa:");
      if (textoOutros !== null && textoOutros.trim() !== "") {
        motivoFinal = `Outros: ${textoOutros.trim()}`;
      } else {
        const chave = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
        motivoFinal = aluno.justificativas?.[chave] || "";
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

    console.log(`handleJustificativa: Aluno ${aluno.nome}, Chave: ${chave}, Motivo Final: "${motivoFinal}"`);
    onAtualizar(aluno.id, atualizado);
  };

  const handlePresence = (aluno) => {
    const dataAtual = dataSelecionada; 
    const currentPresence = aluno.presencas?.[dataAtual]; 

    let newPresencas = { ...aluno.presencas };

    newPresencas[dataAtual] = !currentPresence; 
    
    console.log(`handlePresence: Aluno ${aluno.nome}, Data ${dataAtual} - Marcado como ${newPresencas[dataAtual] ? 'PRESENTE (true)' : 'AUSENTE (false)'}`);
    
    onAtualizar(aluno.id, { ...aluno, presencas: newPresencas });
  };


  return (
    <div className="overflow-x-auto mt-8 shadow-lg rounded-lg">
      <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Nº</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Foto</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Nome</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Turma</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Contato</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Responsável</th>
            {/* Cabeçalho da Chamada com o botão "Alternar Seleção" */}
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">
              <div className="flex items-center justify-between">
                <span>Chamada</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); 
                    onToggleAllChamada(); // Agora onToggleAllChamada deve estar definida e ser uma função!
                  }}
                  className="p-1 rounded-full bg-blue-400 text-white hover:bg-blue-500 transition-colors duration-200"
                  title="Marcar/Desmarcar todos os alunos para esta data"
                  style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                >
                  ✅ 
                </button>
              </div>
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Justificativa</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Observação</th>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {registros.length === 0 ? (
            <tr>
              <td colSpan="10" className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
                Nenhum aluno encontrado para esta turma ou data.
              </td>
            </tr>
          ) : (
            registros.map((aluno, index) => {
              const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
              const justificativaAtualCompleta = aluno.justificativas?.[chaveJustificativa]; 
              
              let justificativaDropdown = justificativaAtualCompleta || "Selecione"; 
              if (justificativaAtualCompleta && justificativaAtualCompleta.startsWith("Outros: ")) {
                  justificativaDropdown = "Outros";
              }

              const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
              const observacaoAtualArray = aluno.observacoes?.[chaveObservacao] || [];
              const observacaoAtualDisplay = Array.isArray(observacaoAtualArray) ? observacaoAtualArray : (observacaoAtualArray ? [observacaoAtualArray] : []);
              
              const isSelected = linhaSelecionada === aluno.id;

              const textoOutrosTooltip = (justificativaAtualCompleta && justificativaAtualCompleta.startsWith("Outros: ")) 
                                                ? justificativaAtualCompleta.replace("Outros: ", "") 
                                                : '';

              const isPresent = aluno.presencas?.[dataSelecionada] === true;

              console.log(`Renderizando ${aluno.nome} - Presença (Firestore): ${aluno.presencas?.[dataSelecionada]}, isPresent (checkbox): ${isPresent}`);

              return (
                <tr 
                  key={aluno.id}
                  onClick={() => onSelecionarLinha(aluno.id)}
                  className={`border-b border-gray-200 dark:border-gray-700 transition-colors duration-150 cursor-pointer 
                    ${isSelected 
                      ? 'bg-green-200 dark:bg-green-800' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{index + 1}</td>
                  <td className="py-3 px-4 text-sm text-center">
                    {aluno.fotoUrl ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewPhoto(aluno.fotoUrl, e); }}
                        className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-sm"
                        title="Ver Foto"
                      >
                        👁️
                      </button>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.nome}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{normalizeTurmaChar(aluno.turma)}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.contato}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.responsavel}</td>
                  <td className="py-3 px-4 text-sm text-center">
                    <input
                      type="checkbox"
                      checked={isPresent} 
                      onChange={(e) => {
                        e.stopPropagation();
                        handlePresence(aluno);
                      }}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded"
                      title={isPresent ? "Presente" : "Marcar como Presente"}
                    />
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="tooltip-container"> 
                        <select
                            value={justificativaDropdown}
                            onChange={(e) => {
                                e.stopPropagation(); 
                                handleJustificativa(aluno, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()} 
                            className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full"
                        >
                            {opcoesJustificativa.map((opcao, i) => (
                                <option key={i} value={opcao}>{opcao}</option>
                            ))}
                        </select>
                        {justificativaDropdown === "Outros" && textoOutrosTooltip && (
                            <span className="tooltip-text">
                                {textoOutrosTooltip}
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm relative">
                      <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenObservationDropdown(aluno, e)
                          }}
                          className={`observation-button p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 w-full text-left ${observacaoAtualDisplay.length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}
                          title="Adicionar/Editar Observação"
                      >
                          {observacaoAtualDisplay.length > 0 ? "Observação" : "Selecione"}
                      </button>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex flex-nowrap gap-2" onClick={(e) => e.stopPropagation()}>
                      {aluno.fotoUrl ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onExcluirFoto(aluno); }}
                          className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors duration-200 shadow-sm"
                          title="Excluir Foto"
                        >
                          🗑️
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); onAbrirModalFoto(aluno); }}
                          className="px-3 py-1 rounded-lg bg-purple-500 text-white text-xs hover:bg-purple-600 transition-colors duration-200 shadow-sm"
                          title="Tirar Foto"
                        >
                          📸
                        </button>
                      )}
                      <button
                        onClick={() => onAbrirModalRecomposicao(aluno)}
                        className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs hover:bg-orange-600 transition-colors duration-200 shadow-sm"
                        title="Recompor Faltas (Limpar Justificativas no Período)"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => onAbrirRelatorio(aluno)}
                        className="px-3 py-1 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-700 transition-colors duration-200 shadow-sm"
                        title="Gerar Relatório Completo"
                      >
                        📄
                      </button>
                      <button
                        onClick={() => onWhatsapp(aluno)}
                        className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors duration-200 shadow-sm"
                        title="Enviar WhatsApp"
                      >
                        📲
                      </button>
                      <button
                        onClick={() => onEditar(aluno)}
                        className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-xs hover:bg-yellow-600 transition-colors duration-200 shadow-sm"
                        title="Editar Aluno"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onExcluir(aluno)}
                        className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors duration-200 shadow-sm"
                        title="Excluir Aluno"
                      >
                        🗑️
                      </button>
                    </div>
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