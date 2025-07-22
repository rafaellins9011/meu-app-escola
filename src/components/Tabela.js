// Arquivo: src/components/Tabela.js
// ATUALIZAÇÃO: Adicionado o botão de recomposição de faltas.
// CORREÇÃO: Passando o objeto de evento corretamente para onOpenObservationDropdown.
// NOVIDADE FOTO: Adicionado gerenciamento de fotos (tirar, visualizar, excluir) na tabela.
// NOVIDADE LAYOUT: Coluna da foto movida para a esquerda do nome.
// NOVIDADE VISUALIZAÇÃO: Miniatura da foto abre em visualizador flutuante.
// ATUALIZAÇÃO LAYOUT: Botões de ação agora exibem apenas símbolos para melhor visualização móvel.
// NOVIDADE PRESENÇA: Adicionado botão para marcar todos os alunos como presentes.

import React from 'react';
import { deleteField } from 'firebase/firestore'; // Importe deleteField

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
    onExcluirFoto,     // Nova prop para excluir a foto
    onTogglePresenca, // Prop para lidar com o clique no checkbox de presença
    onMarcarTodosPresentes // NOVIDADE PRESENÇA: Nova prop para marcar todos
}) => {

    // ATUALIZAÇÃO JUSTIFICATIVA: Adicionado "Falta não apurada" e removido duplicidade.
    const opcoesJustificativa = [
        "Selecione",
        "Falta não apurada",
        "Problema de saúde",
        "Ônibus não passou",
        "Viagem",
        "Sem retorno",
        "Licença-maternidade",
        "Luto",
        "Outros"
    ];

    const handleJustificativa = (aluno, justificativaSelecionada) => {
        const chave = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
        let motivoParaAtualizar = justificativaSelecionada;

        if (justificativaSelecionada === "Outros") {
            const textoOutros = prompt("Por favor, digite a justificativa:");
            if (textoOutros !== null && textoOutros.trim() !== "") {
                motivoParaAtualizar = `Outros: ${textoOutros.trim()}`;
            } else {
                // Se o usuário cancelar ou deixar em branco, não altera a justificativa no Firestore
                // Retorna sem chamar onAtualizar
                return; 
            }
        } else if (justificativaSelecionada === "Selecione") {
            // Se "Selecione" for escolhido, a intenção é limpar a justificativa (marcar como presente)
            motivoParaAtualizar = deleteField(); // Usa deleteField para remover o campo no Firestore
        }

        const atualizado = {
            ...aluno,
            justificativas: {
                ...aluno.justificativas,
                [chave]: motivoParaAtualizar // Isso vai definir o campo ou usar deleteField
            }
        };

        // Se motivoParaAtualizar for deleteField, o Firestore vai remover a chave
        // Se for uma string, o Firestore vai atualizar/criar a chave com essa string
        onAtualizar(aluno.id, atualizado); // Passa o ID do aluno e o objeto atualizado
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
                        {/* NOVIDADE PRESENÇA: Adicionada nova coluna de cabeçalho com botão */}
                        <th className="py-3 px-4 text-center text-xs font-medium uppercase tracking-wider">
                            <div className="flex items-center justify-center gap-2">
                                <span>Presença</span>
                                <button
                                    onClick={onMarcarTodosPresentes}
                                    className="p-1 rounded-full bg-green-500 text-white hover:bg-green-600 text-xs leading-none"
                                    title="Marcar Todos como Presentes"
                                >
                                    ✓
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
                            {/* Ajustado colspan para incluir a nova coluna */}
                            <td colSpan="10" className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
                                Nenhum aluno encontrado para esta turma ou data.
                            </td>
                        </tr>
                    ) : (
                        registros.map((aluno, index) => {
                            const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
                            const justificativaAtualCompleta = aluno.justificativas?.[chaveJustificativa]; // Não usar || '' aqui

                            // NOVIDADE PRESENÇA: Determina se o aluno está presente.
                            // A presença é a ausência de uma chave de justificativa para a data selecionada.
                            const isPresente = justificativaAtualCompleta === undefined;

                            let justificativaDropdown = "Selecione";
                            if (justificativaAtualCompleta !== undefined && justificativaAtualCompleta !== null) {
                                if (justificativaAtualCompleta.startsWith("Outros: ")) {
                                    justificativaDropdown = "Outros";
                                } else {
                                    justificativaDropdown = justificativaAtualCompleta;
                                }
                            }

                            const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
                            const observacaoAtualArray = aluno.observacoes?.[chaveObservacao] || [];
                            const observacaoAtualDisplay = Array.isArray(observacaoAtualArray) ? observacaoAtualArray : (observacaoAtualArray ? [observacaoAtualArray] : []);
                            
                            const isSelected = linhaSelecionada === aluno.id;

                            const textoOutrosTooltip = (justificativaAtualCompleta && justificativaAtualCompleta.startsWith("Outros: "))
                                                            ? justificativaAtualCompleta.replace("Outros: ", "")  
                                                            : '';

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
                                    
                                    {/* NOVIDADE PRESENÇA: Célula com o checkbox */}
                                    <td className="py-3 px-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={isPresente}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                onTogglePresenca(aluno);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            title={isPresente ? "Aluno(a) Presente" : "Aluno(a) Ausente"}
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
                                                // NOVIDADE PRESENÇA: Desabilitado se o aluno estiver presente
                                                disabled={isPresente}
                                                className={`p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full ${isPresente ? 'bg-gray-200 dark:bg-gray-600 cursor-not-allowed' : ''}`}
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
                                                // ATUALIZAÇÃO JUSTIFICATIVA: Botão de observação agora está sempre habilitado.
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
                                                // NOVIDADE PRESENÇA: Desabilitado se o aluno estiver presente
                                                disabled={isPresente}
                                                className={`px-3 py-1 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors duration-200 shadow-sm ${isPresente ? 'opacity-50 cursor-not-allowed' : ''}`}
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