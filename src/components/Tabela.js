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
// NOVA Lógica DE PRESENÇA: Campo booleano separado no Firestore para controle da chamada.
// NOVIDADE BOTÃO: Botão "Alternar Seleção" (✅) adicionado ao cabeçalho da coluna "Chamada".
// CORREÇÃO CRÍTICA FINAL: Adicionado 'onToggleAllChamada' aos props RECEBIDOS pelo componente Tabela.
// NOVIDADE REQUERIDA: Bloqueia a seleção de justificativa quando a presença está marcada.
// NOVIDADE ALERTA/CUIDADOS: Adicionado indicador visual de Alerta/Cuidado no FINAL DO NOME do aluno.
// NOVIDADE JUSTIFICATIVA: Adicionada a opção "Falta não apurada" nas justificativas.
// NOVIDADE PADRÃO JUSTIFICATIVA: "Falta não apurada" como padrão se ausente/não marcado.
// NOVIDADE RESTRIÇÃO DATA: Chamada permitida apenas até a data presente.
// NOVIDADE VISIBILIDADE COLUNAS: Adicionados botões para ocultar/mostrar colunas "Contato" e "Responsável".
// INÍCIO OCULTO: Colunas "Contato" e "Responsável" iniciam ocultas por padrão.
// ATUALIZAÇÃO REQUERIDA: Bloqueio de ações em dias não letivos, fins de semana e datas futuras.
// NOVIDADE REQUERIDA: Bloqueio de ações em datas anteriores à dataMatricula do aluno.
// ATUALIZAÇÃO REQUERIDA: Ao marcar presença, a justificativa é automaticamente redefinida para "Selecione".
// CORREÇÃO REQUERIDA: A justificativa sempre exibirá "Selecione" se o aluno estiver presente, e a lógica de limpeza foi ajustada.

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
    onToggleAllChamada,
    // NOVAS PROPS PARA CONTROLE DE BLOQUEIO
    isFutureDate,
    isWeekend,
    isSelectedDateNonSchool
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
        "Sem contato",
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

        // Se a justificativa for limpa (motivoFinal é ""), remove a chave do objeto no Firestore.
        // Isso é importante para que o Firestore não armazene strings vazias desnecessariamente
        // e para que a lógica de "Selecione" funcione corretamente.
        if (motivoFinal === "") {
            delete atualizado.justificativas[chave];
        }

        console.log(`handleJustificativa: Aluno ${aluno.nome}, Chave: ${chave}, Motivo Final: "${motivoFinal}"`);
        onAtualizar(aluno.id, atualizado);
    };

    const handlePresence = (aluno) => {
        const dataAtual = dataSelecionada;
        let newPresencas = { ...aluno.presencas };
        let newJustificativas = { ...aluno.justificativas };
        const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataAtual}`;

        const nextPresenceState = !newPresencas[dataAtual]; // Obtém o próximo estado da presença

        newPresencas[dataAtual] = nextPresenceState;

        if (nextPresenceState === true) {
            // Se o aluno for marcado como PRESENTE, a justificativa DEVE ser limpa.
            // Definimos como string vazia para que o dropdown mostre "Selecione" e o Firestore não armazene a justificativa.
            newJustificativas[chaveJustificativa] = "";
            console.log(`handlePresence: Justificativa limpa para ${aluno.nome} em ${dataAtual} porque foi marcado como PRESENTE.`);
        } else { // Se o aluno for marcado como AUSENTE (ou desmarcado de presente)
            // Se não houver uma justificativa específica já definida, define como "Falta não apurada"
            // Isso cobre casos onde estava "Selecione" (string vazia) ou não existia.
            if (!newJustificativas[chaveJustificativa] || newJustificativas[chaveJustificativa] === "") {
                newJustificativas[chaveJustificativa] = "Falta não apurada";
                console.log(`handlePresence: Definida justificativa "Falta não apurada" para ${aluno.nome} em ${dataAtual}.`);
            }
            // Se já havia uma justificativa específica (ex: "Problema de saúde"), ela é mantida.
        }

        console.log(`handlePresence: Aluno ${aluno.nome}, Data ${dataAtual} - Marcado como ${newPresencas[dataAtual] ? 'PRESENTE (true)' : 'AUSENTE (false)'}`);

        onAtualizar(aluno.id, {
            ...aluno,
            presencas: newPresencas,
            justificativas: newJustificativas
        });
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
                                        // Bloqueia a ação se for data futura, fim de semana ou dia não letivo
                                        if (!isFutureDate && !isWeekend && !isSelectedDateNonSchool) {
                                            onToggleAllChamada();
                                        } else {
                                            alert("Não é possível alterar a chamada para datas futuras, fins de semana ou dias não letivos.");
                                        }
                                    }}
                                    className={`p-1 rounded-full text-white transition-colors duration-200
                                    ${(isFutureDate || isWeekend || isSelectedDateNonSchool) ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-blue-400 hover:bg-blue-500'}`}
                                    title={(isFutureDate || isWeekend || isSelectedDateNonSchool) ? "Não é possível alterar a chamada para datas futuras, fins de semana ou dias não letivos." : "Marcar/Desmarcar todos os alunos para esta data"}
                                    disabled={isFutureDate || isWeekend || isSelectedDateNonSchool} // Desabilita o botão para datas futuras, fins de semana ou dias não letivos
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

                            const isPresent = aluno.presencas?.[dataSelecionada] === true; // Determina a presença real

                            let justificativaDropdownValue;
                            // CORREÇÃO: Se o aluno está presente, a justificativa DEVE ser "Selecione" (string vazia).
                            if (isPresent) {
                                justificativaDropdownValue = "Selecione"; // Mapeia para string vazia no onChange
                            } else if (justificativaAtualCompleta) {
                                justificativaDropdownValue = justificativaAtualCompleta;
                            } else {
                                // Se não estiver presente e não houver justificativa, padroniza para "Falta não apurada"
                                justificativaDropdownValue = "Falta não apurada";
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

                            // NOVIDADE REQUERIDA: Define se a data selecionada é anterior à matrícula do aluno
                            const isBeforeMatricula = dataSelecionada < aluno.dataMatricula;

                            // NOVIDADE REQUERIDA: Define se a justificativa deve estar desabilitada
                            // Desabilita se o aluno estiver presente OU se a data for futura OU fim de semana OU dia não letivo OU anterior à matrícula
                            const isJustificativaDisabled = isPresent || isFutureDate || isWeekend || isSelectedDateNonSchool || isBeforeMatricula;
                            // NOVIDADE REQUERIDA: Define se o checkbox de presença deve estar desabilitado
                            const isPresenceCheckboxDisabled = isFutureDate || isWeekend || isSelectedDateNonSchool || isBeforeMatricula;
                            // NOVIDADE REQUERIDA: Define se o botão de observação deve estar desabilitado
                            const isObservationButtonDisabled = isFutureDate || isWeekend || isSelectedDateNonSchool || isBeforeMatricula;


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
                                                if (!isPresenceCheckboxDisabled) { // Só permite alterar se não for dia bloqueado
                                                    handlePresence(aluno);
                                                } else {
                                                    alert("Não é possível alterar a chamada para esta data (anterior à matrícula, futura, fim de semana ou dia não letivo).");
                                                }
                                            }}
                                            className={`form-checkbox h-5 w-5 rounded ${isPresenceCheckboxDisabled ? 'cursor-not-allowed opacity-50' : 'text-blue-600'}`}
                                            title={isPresenceCheckboxDisabled ? "Chamada não permitida para esta data" : (isPresent ? "Presente" : "Marcar como Presente")}
                                            disabled={isPresenceCheckboxDisabled} // Desabilita o checkbox para datas futuras, fins de semana ou dias não letivos
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                        <div className="tooltip-container">
                                            <select
                                                value={justificativaDropdownValue} /* CORREÇÃO AQUI: Usar justificativaDropdownValue */
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleJustificativa(aluno, e.target.value);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                // Desabilita se o aluno estiver presente OU se a data for futura OU fim de semana OU dia não letivo OU anterior à matrícula
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
                                                if (!isObservationButtonDisabled) { // Só permite abrir se não for dia bloqueado
                                                    onOpenObservationDropdown(aluno, e)
                                                } else {
                                                    alert("Não é possível adicionar/editar observações para esta data (anterior à matrícula, futura, fim de semana ou dia não letivo).");
                                                }
                                            }}
                                            className={`observation-button p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 w-full text-left
                                            ${observacaoAtualDisplay.length > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-gray-900 dark:text-white'}
                                            ${isObservationButtonDisabled ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-70' : ''}`}
                                            title={isObservationButtonDisabled ? "Observações não permitidas para esta data" : "Adicionar/Editar Observação"}
                                            disabled={isObservationButtonDisabled} // Desabilita o botão para datas futuras, fins de semana ou dias não letivos
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
