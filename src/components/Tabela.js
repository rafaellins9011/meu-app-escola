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
// NOVIDADE REQUERIDA: Bloqueia a seleção de justificativa quando a presença está marcada.
// NOVIDADE ALERTA/CUIDADOS: Adicionado indicador visual de Alerta/Cuidado no FINAL DO NOME do aluno.
// NOVIDADE JUSTIFICATIVA: Adicionada a opção "Falta não apurada" nas justificativas.
// NOVIDADE PADRÃO JUSTIFICATIVA: "Falta não apurada" como padrão se ausente/não marcado.
// NOVIDADE RESTRIÇÃO DATA: Chamada permitida apenas até a data presente.
// NOVIDADE VISIBILIDADE COLUNAS: Adicionados botões para ocultar/mostrar colunas "Contato" e "Responsável".
// INÍCIO OCULTO: Colunas "Contato" e "Responsável" iniciam ocultas por padrão.

import React, { useState } from 'react'; // Importar useState

// Função normalizeTurmaChar adicionada de volta a este arquivo
const normalizeTurmaChar = (turma) => {
    return String(turma).replace(/°/g, 'º');
};

// Função getTodayDateString adicionada para uso na Tabela
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    onToggleAllChamada
}) => {
    // NOVOS ESTADOS PARA CONTROLAR A VISIBILIDADE DAS COLUNAS
    const [mostrarContato, setMostrarContato] = useState(false); // Inicia oculto
    const [mostrarResponsavel, setMostrarResponsavel] = useState(false); // Inicia oculto

    const opcoesJustificativa = [
        "Selecione",
        "Falta não apurada", // Opção padrão quando ausente
        "Problema de saúde",
        "Ônibus não passou",
        "Viagem",
        "Licença-maternidade",
        "Falta não justificada",
        "Sem retorno",
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
                // Se o usuário cancelar ou deixar em branco, mantém a justificativa anterior ou ""
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
            // Se a justificativa for limpa, remove a chave do objeto justificativas
            delete atualizado.justificativas[chave];
        }

        console.log(`handleJustificativa: Aluno ${aluno.nome}, Chave: ${chave}, Motivo Final: "${motivoFinal}"`);
        onAtualizar(aluno.id, atualizado);
    };

    const handlePresence = (aluno) => {
        const dataAtual = dataSelecionada;
        const currentPresence = aluno.presencas?.[dataAtual];

        let newPresencas = { ...aluno.presencas };
        let newJustificativas = { ...aluno.justificativas };
        const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataAtual}`;

        // A nova presença será o inverso da atual
        const nextPresenceState = !currentPresence;

        newPresencas[dataAtual] = nextPresenceState;

        // Se o aluno for marcado como PRESENTE, remove qualquer justificativa existente para essa data
        if (nextPresenceState === true) {
            if (newJustificativas[chaveJustificativa]) {
                delete newJustificativas[chaveJustificativa];
                console.log(`handlePresence: Removida justificativa para ${aluno.nome} em ${dataAtual} porque foi marcado como PRESENTE.`);
            }
        } else { // Se o aluno for marcado como AUSENTE (ou não marcado inicialmente)
            // E não houver uma justificativa já existente, define como "Falta não apurada"
            if (!newJustificativas[chaveJustificativa] || newJustificativas[chaveJustificativa] === "Selecione" || newJustificativas[chaveJustificativa] === "") {
                newJustificativas[chaveJustificativa] = "Falta não apurada";
                console.log(`handlePresence: Definida justificativa "Falta não apurada" para ${aluno.nome} em ${dataAtual}.`);
            }
        }

        console.log(`handlePresence: Aluno ${aluno.nome}, Data ${dataAtual} - Marcado como ${newPresencas[dataAtual] ? 'PRESENTE (true)' : 'AUSENTE (false)'}`);

        // Atualiza tanto as presenças quanto as justificativas (se houver alteração)
        onAtualizar(aluno.id, {
            ...aluno,
            presencas: newPresencas,
            justificativas: newJustificativas
        });
    };

    // Determinar se a data selecionada é uma data futura
    const todayString = getTodayDateString();
    const isFutureDate = dataSelecionada > todayString;

    return (
        <div className="overflow-x-auto mt-8 shadow-lg rounded-lg">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
                <thead className="bg-blue-600 text-white">
                    <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Nº</th>
                        <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Foto</th>
                        <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Nome</th>
                        <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">Turma</th>

                        {/* CABEÇALHO DA COLUNA CONTATO COM BOTÃO DE TOGGLE */}
                        <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">
                            <div className="flex items-center justify-between gap-1">
                                Contato
                                <button
                                    onClick={() => setMostrarContato(!mostrarContato)}
                                    className="p-1 rounded-full text-white bg-blue-400 hover:bg-blue-500 transition-colors duration-200"
                                    title={mostrarContato ? "Ocultar Coluna Contato" : "Mostrar Coluna Contato"}
                                    style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                                >
                                    {mostrarContato ? '👁️‍🗨️' : '👁️‍🦱'} {/* Ícones para mostrar/ocultar */}
                                </button>
                            </div>
                        </th>

                        {/* CABEÇALHO DA COLUNA RESPONSÁVEL COM BOTÃO DE TOGGLE */}
                        <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">
                            <div className="flex items-center justify-between gap-1">
                                Responsável
                                <button
                                    onClick={() => setMostrarResponsavel(!mostrarResponsavel)}
                                    className="p-1 rounded-full text-white bg-blue-400 hover:bg-blue-500 transition-colors duration-200"
                                    title={mostrarResponsavel ? "Ocultar Coluna Responsável" : "Mostrar Coluna Responsável"}
                                    style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                                >
                                    {mostrarResponsavel ? '👁️‍🗨️' : '👁️‍🦱'}
                                </button>
                            </div>
                        </th>

                        {/* Cabeçalho da Chamada com o botão "Alternar Seleção" */}
                        <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider">
                            <div className="flex items-center justify-between">
                                <span>Chamada</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isFutureDate) { // Restringe a ação para datas futuras
                                            onToggleAllChamada();
                                        } else {
                                            alert("Não é possível alterar a chamada para datas futuras.");
                                        }
                                    }}
                                    className={`p-1 rounded-full text-white transition-colors duration-200
                                    ${isFutureDate ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-blue-400 hover:bg-blue-500'}`}
                                    title={isFutureDate ? "Não é possível alterar a chamada para datas futuras." : "Marcar/Desmarcar todos os alunos para esta data"}
                                    disabled={isFutureDate} // Desabilita o botão para datas futuras
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

                            let justificativaDropdownValue;
                            // Lógica para definir a justificativa padrão
                            if (justificativaAtualCompleta) {
                                justificativaDropdownValue = justificativaAtualCompleta;
                            } else {
                                // Se não houver justificativa explícita e o aluno não estiver presente, padroniza para "Falta não apurada"
                                if (aluno.presencas?.[dataSelecionada] === false || aluno.presencas?.[dataSelecionada] === undefined) { // Se for false ou undefined (não marcado)
                                    justificativaDropdownValue = "Falta não apurada";
                                } else { // Se for true (presente)
                                    justificativaDropdownValue = "Selecione";
                                }
                            }

                            let justificativaDropdownDisplay = justificativaDropdownValue;
                            if (justificativaDropdownValue.startsWith("Outros: ")) {
                                justificativaDropdownDisplay = "Outros";
                            }

                            const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
                            const observacaoAtualArray = aluno.observacoes?.[chaveObservacao] || [];
                            const observacaoAtualDisplay = Array.isArray(observacaoAtualArray) ? observacaoAtualArray : (observacaoAtualArray ? [observacaoAtualArray] : []);

                            const isSelected = linhaSelecionada === aluno.id;

                            const textoOutrosTooltip = (justificativaAtualCompleta && justificativaAtualCompleta.startsWith("Outros: "))
                                ? justificativaAtualCompleta.replace("Outros: ", "")
                                : '';

                            const isPresent = aluno.presencas?.[dataSelecionada] === true;

                            // NOVIDADE REQUERIDA: Define se a justificativa deve estar desabilitada
                            // Desabilita se o aluno estiver presente OU se a data for futura
                            const isJustificativaDisabled = isPresent || isFutureDate;

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
                                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 flex items-center">
                                        {aluno.nome}
                                        {aluno.alertasCuidados && (
                                            <span
                                                className="ml-2 px-2 py-1 rounded-lg bg-red-400 text-white text-xs shadow-sm cursor-help"
                                                title={`Alerta/Cuidado: ${aluno.alertasCuidados}`}
                                                style={{ flexShrink: 0 }}
                                            >
                                                ⚠️
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{normalizeTurmaChar(aluno.turma)}</td>

                                    {/* CÉLULA DA COLUNA CONTATO (CONDICIONAL) */}
                                    {mostrarContato && (
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.contato}</td>
                                    )}

                                    {/* CÉLULA DA COLUNA RESPONSÁVEL (CONDICIONAL) */}
                                    {mostrarResponsavel && (
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">{aluno.responsavel}</td>
                                    )}

                                    <td className="py-3 px-4 text-sm text-center">
                                        <input
                                            type="checkbox"
                                            checked={isPresent}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                if (!isFutureDate) { // Só permite alterar se não for data futura
                                                    handlePresence(aluno);
                                                } else {
                                                    alert("Não é possível alterar a chamada para datas futuras.");
                                                }
                                            }}
                                            className={`form-checkbox h-5 w-5 rounded ${isFutureDate ? 'cursor-not-allowed opacity-50' : 'text-blue-600'}`}
                                            title={isFutureDate ? "Chamada não permitida para datas futuras" : (isPresent ? "Presente" : "Marcar como Presente")}
                                            disabled={isFutureDate} // Desabilita o checkbox para datas futuras
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                        <div className="tooltip-container">
                                            <select
                                                value={justificativaDropdownDisplay}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleJustificativa(aluno, e.target.value);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                // Desabilita se o aluno estiver presente OU se a data for futura
                                                disabled={isJustificativaDisabled}
                                                className={`p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full
                                                ${isJustificativaDisabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-70' : ''}`}
                                            >
                                                {opcoesJustificativa.map((opcao, i) => (
                                                    <option key={i} value={opcao}>{opcao}</option>
                                                ))}
                                            </select>
                                            {justificativaDropdownDisplay === "Outros" && textoOutrosTooltip && (
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