// Arquivo: src/components/Tabela.js
// ATUALIZAÇÃO: Adicionado o botão de recomposição de faltas.
// CORREÇÃO: Passando o objeto de evento corretamente para onOpenObservationDropdown.
// NOVIDADE FOTO: Adicionado gerenciamento de fotos (tirar, visualizar, excluir) na tabela.
// NOVIDADE LAYOUT: Coluna da foto movida para a esquerda do nome.
// NOVIDADE VISUALIZAÇÃO: Miniatura da foto abre em visualizador flutuante.
// ATUALIZAÇÃO LAYOUT: Botões de foto movidos para a coluna de Ações.
// ATUALIZAÇÃO FOTO: Coluna 'Foto' agora exibe um botão/símbolo para visualizar a foto.
// ATUALIZAÇÃO BOTÕES: Botões de ação agora exibem apenas símbolos para melhor visualização móvel.

import React from 'react';

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
  onAbrirModalFoto, // Nova prop para abrir o modal da câmera
  onViewPhoto,       // Nova prop para visualizar a foto flutuante
  onExcluirFoto      // Nova prop para excluir a foto
}) => {

  const opcoesJustificativa = [
    "Selecione",
    "Problema de saúde",
    "Ônibus não passou",
    "Viagem",
    "Sem retorno",
    "Falta não justificada",
    "Licença-maternidade",
    "Luto",
    "Outros"
  ];

  const handleJustificativa = (aluno, justificativaSelecionada) => {
    let motivoFinal = justificativaSelecionada;

    if (justificativaSelecionada === "Outros") {
      const textoOutros = prompt("Por favor, digite a justificativa:");
      if (textoOutros !== null && textoOutros.trim() !== "") {
        motivoFinal = `Outros: ${textoOutros.trim()}`;
      } else {
        // Se o usuário cancelar ou deixar em branco, mantém a justificativa anterior ou "Selecione"
        const chave = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
        motivoFinal = aluno.justificativas?.[chave] || "Selecione";
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
        // Se o motivo final for vazio, remove a chave para limpar a justificativa
        delete atualizado.justificativas[chave];
    }

    // No contexto do Firestore, 'originalIndex' não é mais usado para identificar o aluno
    // Usamos 'aluno.id' que vem do Firestore.
    onAtualizar(aluno.id, atualizado); // Passa o ID do aluno e o objeto atualizado
  };

  return (
    <div className="overflow-x-auto mt-8 shadow-lg rounded-lg">
      <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Nº</th>
            {/* NOVIDADE LAYOUT: Coluna da foto */}
            <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Foto</th>
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
              <td colSpan="9" className="py-4 px-4 text-center text-gray-500 dark:text-gray-400"> {/* Ajustado colspan */}
                Nenhum aluno encontrado para esta turma ou data.
              </td>
            </tr>
          ) : (
            registros.map((aluno, index) => {
              const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
              const justificativaAtualCompleta = aluno.justificativas?.[chaveJustificativa] || '';
              
              let justificativaDropdown = justificativaAtualCompleta;
              // Se a justificativa começa com "Outros: ", definimos o dropdown para "Outros"
              // Caso contrário, se for vazio, definimos para "Selecione"
              // Senão, usamos a justificativa completa (para as opções pré-definidas)
              if (justificativaAtualCompleta.startsWith("Outros: ")) {
                  justificativaDropdown = "Outros";
              } else if (justificativaAtualCompleta === "") {
                  justificativaDropdown = "Selecione";
              }

              const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
              const observacaoAtualArray = aluno.observacoes?.[chaveObservacao] || [];
              const observacaoAtualDisplay = Array.isArray(observacaoAtualArray) ? observacaoAtualArray : (observacaoAtualArray ? [observacaoAtualArray] : []);
              
              // Usamos aluno.id como a chave única para o React, pois ele é estável e único do Firestore.
              const isSelected = linhaSelecionada === aluno.id; // Agora compara com o ID do aluno

              // Extrai o texto da justificativa "Outros" para exibir no tooltip
              const textoOutrosTooltip = justificativaAtualCompleta.startsWith("Outros: ") 
                                          ? justificativaAtualCompleta.replace("Outros: ", "") 
                                          : '';

              return (
                <tr 
                  key={aluno.id} // CORRIGIDO: Usar aluno.id como key
                  onClick={() => onSelecionarLinha(aluno.id)} // CORRIGIDO: Passa o ID do aluno
                  // REMOVIDAS as classes Tailwind de zebragem para usar o CSS puro do index.css
                  // As classes de seleção e hover são mantidas, assumindo que são estilos básicos ou que o Tailwind ainda tem algum papel.
                  className={`border-b border-gray-200 dark:border-gray-700 transition-colors duration-150 cursor-pointer 
                    ${isSelected 
                      ? 'bg-green-200 dark:bg-green-800' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600' // 'even:bg-gray-100 dark:even:bg-gray-700' foi removido aqui
                    }`}
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{index + 1}</td>
                  {/* Célula da foto (somente botão de visualização) */}
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
                  <td className="py-3 px-4 text-sm">
                    {/* Agora usamos as classes CSS puras para o tooltip */}
                    <div className="tooltip-container"> 
                        <select
                            value={justificativaDropdown}
                            onChange={(e) => {
                                e.stopPropagation(); 
                                handleJustificativa(aluno, e.target.value); // Chama a função auxiliar
                            }}
                            onClick={(e) => e.stopPropagation()} 
                            className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full"
                        >
                            {opcoesJustificativa.map((opcao, i) => (
                                <option key={i} value={opcao}>{opcao}</option>
                            ))}
                        </select>
                        {/* O tooltip só será exibido se a justificativa for 'Outros' E tiver texto digitado */}
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
                            onOpenObservationDropdown(aluno, e) // CORRIGIDO: Passa apenas 'aluno' e 'e' (o evento)
                          }}
                          className={`observation-button p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 w-full text-left ${observacaoAtualDisplay.length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}
                          title="Adicionar/Editar Observação"
                      >
                          {observacaoAtualDisplay.length > 0 ? "Observação" : "Selecione"}
                      </button>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex flex-nowrap gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Botões de ação */}
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
                        onClick={() => onAbrirModalRecomposicao(aluno)} // Passa o objeto aluno completo
                        className="px-3 py-1 rounded-lg bg-orange-500 text-white text-xs hover:bg-orange-600 transition-colors duration-200 shadow-sm"
                        title="Recompor Faltas (Limpar Justificativas no Período)"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => onAbrirRelatorio(aluno)} // Passa o objeto aluno completo
                        className="px-3 py-1 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-700 transition-colors duration-200 shadow-sm"
                        title="Gerar Relatório Completo"
                      >
                        📄
                      </button>
                      <button
                        onClick={() => onWhatsapp(aluno)} // Passa o objeto aluno completo
                        className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors duration-200 shadow-sm"
                        title="Enviar WhatsApp"
                      >
                        📲
                      </button>
                      <button
                        onClick={() => onEditar(aluno)} // Passa o objeto aluno completo
                        className="px-3 py-1 rounded-lg bg-yellow-500 text-white text-xs hover:bg-yellow-600 transition-colors duration-200 shadow-sm"
                        title="Editar Aluno"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onExcluir(aluno)} // Passa o objeto aluno completo
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