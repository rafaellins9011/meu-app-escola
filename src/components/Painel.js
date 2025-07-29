// Arquivo: src/components/Painel.js
// ATUALIZAÇÃO 4: Adicionado contador de atrasos no período.
// ATUALIZAÇÃO 5: Adicionado mecanismo de busca por nome do aluno na tabela.
// ATUALIZAÇÃO 6: Adicionado mecanismo de busca informativa de aluno e turma.
// ATUALIZAÇÃO 7: Implementada 'exclusão lógica' para manter dados históricos em gráficos.
// CORREÇÃO FINAL: Faltas/atrasos de alunos excluídos contabilizados APENAS no GraficoSemanal.
// NOVIDADE FIRESTORE: Integração COMPLETA de leitura e gravação de dados com Cloud Firestore.
// NOVIDADE FOTO: Adicionado gerenciamento COMPLETO de fotos de alunos via CameraModal e Cloudinary.
// NOVIDADE CONSULTA: Foto do aluno exibida na consulta informativa.
// NOVIDADE GRÁFICO: Botões de controle de visibilidade separados para GraficoFaltas e GraficoSemanal.
// NOVIDADE EXPORTAÇÃO GRÁFICO: Botão de exportação para GraficoFaltas e GraficoSemanal com cabeçalho.
// CORREÇÃO EXPORTAÇÃO GRÁFICO: Garantindo que o canvas do gráfico seja capturado corretamente com mais robustez.
// CORREÇÃO ERRO: Mensagens de erro de exportação mais detalhadas.
// CORREÇÃO ERRO CRÍTICO: Corrigido o erro 'pdfWidth is not defined' para 'pageWidth'.
// ATUALIZAÇÃO COMPRESSÃO: Gráficos exportados em JPEG com compressão para arquivos mais leves.
// MODIFICAÇÃO DE UI: Botão 'Exportar Gráfico de Faltas' movido para dentro de GraficoFaltas.js.
// NOVIDADE WHATSAPP OBS: Adicionado botão para enviar mensagens de observação via WhatsApp, com observações em negrito e mensagem única.
// NOVIDADE PRESENÇA INDEPENDENTE: Campo de presença booleano separado no Firestore para a coluna "Chamada".
// NOVIDADE BOTÕES: Adicionado "Desmarcar Todos" e "Exportar Chamada por Período".
// ATUALIZAÇÃO UI: Botão "Desmarcar Todos" movido para o cabeçalho da tabela em Tabela.js.
// ATUALIZAÇÃO UI: Botão "Desmarcar Todos" agora "Alternar Seleção" (seleciona tudo/desseleciona tudo).
// NOVIDADE ALERTA/CUIDADOS: Adicionado campo para registrar alertas/cuidados do aluno no relatório.
// NOVIDADE VISIBILIDADE COLUNAS: Adicionados botões para ocultar/mostrar colunas "Contato" e "Responsável" (controle no Tabela.js).
// NOVIDADE REQUERIDA (FINAL): Faltas automaticamente registradas como "Não Apuradas" no Firestore para ausentes.
// NOVIDADE REQUERIDA: Adicionada coluna de contagem e total de faltas nas exportações de PDF.
// NOVIDADE REQUERIDA: Relatório de observações dos alunos por período com filtros.
// ATUALIZAÇÃO REQUERIDA: Botão "Salvar e Enviar" para observações com ícone único.
// NOVIDADE REQUERIDA: Botão "Salvar e Enviar" combinado, mantendo os botões separados.
// NOVIDADE REQUERIDA: Funcionalidade para gestores marcarem dias não letivos.
// CORREÇÃO CRÍTICA: Corrigido erro "null is not iterable" na inicialização de estados.
// ATUALIZAÇÃO REQUERIDA: Passando flags de data para Tabela.js para bloqueio de ações.
// NOVIDADE REQUERIDA: Seção "Gerenciar Dias Não Letivos" oculta por padrão com botão de alternância.
// ATUALIZAÇÃO REQUERIDA: Cálculos de porcentagem de faltas baseados em 100 dias letivos fixos.
// NOVIDADE REQUERIDA: dataMatricula e cálculo de faltas anteriores/presenças baseado nela, bloqueio de datas anteriores.
// ATUALIZAÇÃO REQUERIDA: Incluir "Falta anterior à matrícula" na lista detalhada de justificativas no relatório do aluno de forma consolidada.
// ATUALIZAÇÃO REQUERIDA: No Relatório de Chamada, datas anteriores à matrícula são marcadas com '*' e não contadas.
// CORREÇÃO ERRO: Removido variável intermediária 'otherJustificativasNoPeriodo' para resolver ReferenceError.
// ATUALIZAÇÃO REQUERIDA: dataFim padrão é a data atual.
// NOVIDADE REQUERIDA: Funcionalidade de download de relatórios por turma em arquivo ZIP.
// ATUALIZAÇÃO REQUERIDA: Botão de download ZIP visível apenas para gestores.
// CORREÇÃO CRÍTICA: Ajuste na lógica de contagem de faltas e justificativas no relatório para refletir a limpeza ao marcar presença.
// ATUALIZAÇÃO REQUERIDA: Lista de chamada ordenada por ordem alfabética.
// CORREÇÃO REQUERIDA: Relatório de Chamada PDF agora também é ordenado alfabeticamente.
// ATUALIZAÇÃO REQUERIDA: Nomes dos alunos alinhados à esquerda em todos os PDFs.
// CORREÇÃO FINAL: Nomes completos dos alunos aparecendo nos PDFs com largura de coluna automática.
// NOVIDADE: Sanitização de nomes de alunos para evitar problemas de caracteres em PDFs.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { turmasDisponiveis, monitoresDisponiveis, gestoresDisponiveis } from '../dados'; // Manter para dados estáticos
import Tabela from './Tabela';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import GraficoFaltas from './GraficoFaltas';
import GraficoSemanal from './GraficoSemanal';
import html2canvas from 'html2canvas';
import CameraModal from './CameraModal'; // NOVIDADE FOTO: Importado o CameraModal
import JSZip from 'jszip'; // NOVIDADE: Importando biblioteca para criar arquivos ZIP
import { saveAs } from 'file-saver'; // NOVIDADE: Importando biblioteca para salvar arquivos
import ZipDownloadModal from './ZipDownloadModal'; // NOVIDADE: Importando o novo modal de download ZIP

// NOVIDADE FIRESTORE: Importar db e funções do Firestore
import { db } from '../firebaseConfig'; // Importa a instância do Firestore
import { collection, getDocs, doc, setDoc, updateDoc, writeBatch, getDoc, onSnapshot, deleteDoc, query, orderBy } from 'firebase/firestore'; // Adicionado deleteDoc, query, orderBy
// Funções Firestore

const formatarData = (dataStr) => {
    if (!dataStr) return '';
    // Garante que a data seja interpretada como UTC para evitar problemas de fuso horário
    const dateObj = new Date(dataStr + 'T00:00:00');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
};

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeTurmaChar = (turma) => {
    return String(turma).replace(/°/g, 'º');
};

// NOVIDADE: Função para sanitizar nomes, removendo caracteres problemáticos
const sanitizeName = (name) => {
    // Permite letras (a-z, A-Z), números (0-9), espaços, e caracteres acentuados do português
    return name.replace(/[^a-zA-Z0-9\sàáâãäåçèéêëìíîïòóôõöùúûüýÿñÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑ]/g, '');
};

// NOVIDADE REQUERIDA: Data de início do registro no sistema
const REPORT_START_DATE = '2025-07-22';


// --- MENSAGENS PREDEFINIDAS PARA OBSERVAÇÕES ---
// Cada entrada contém o título em negrito para o WhatsApp (usando **) e uma função que retorna o corpo da mensagem.
const observationMessages = {
    "Chegou atrasado(a).": {
        title: "**Chegou atrasado(a).**",
        getBody: () => `Conforme estabelecido no Termo de Ajustamento de Normas e Conduta, a pontualidade é essencial para a rotina escolar, especialmente para a participação no movimento cívico-militar com os monitores. Diante disso, o(a) estudante não pôde participar da atividade inicial e pedimos a colaboração dos senhores para garantir que ele(a) chegue dentro do horário estabelecido, evitando prejuízos à sua formação disciplinar e acadêmica.`
    },
    "Cabelo fora do padrão.": {
        title: "**Cabelo fora do padrão.**",
        getBody: (aluno) => `O corte de cabelo de ${aluno.nome} não está de acordo com as normas estabelecidas pela escola, que exigem o padrão de corte à máquina nº 2 ou nº 3, nas partes parietais e occipitais do crânio, mantendo-se bem nítidos os contornos junto às orelhas e ao pescoço (corte social), conforme o padrão adotado na administração cívico-militar. Solicitamos a gentileza de orientá-lo(a) para que seja seguido o padrão adequado, evitando futuros impedimentos na participação na participação das atividades escolares e formativas.`
    },
    "Sem tênis.": {
        title: "**Sem tênis.**",
        getBody: () => `Informamos que que, conforme a Portaria nº 181/2024/GS/SEDUC/MT, o uso do uniforme escolar completo é obrigatório para acesso e permanência dos estudantes na escola, incluindo atividades curriculares e extracurriculares. Hoje, o(a) aluno(a) compareceu à escola sem o tênis adequado, que faz parte do uniforme obrigatório. Conforme o Art. 2º, §2º da portaria, o estudante deve utilizar o tênis fornecido pelo Estado ou outro calçado fechado. Solicitamos que providenciem o uso correto do uniforme para os próximos dias, garantindo assim o cumprimento das normas estabelecidas e a segurança do estudante.`
    },
    "Sem camisa do uniforme.": {
        title: "**Sem camisa do uniforme.**",
        getBody: () => `Informamos que, conforme a Portaria nº 181/2024/GS/SEDUC/MT, o uso do uniforme escolar completo é obrigatório para acesso e permanência dos estudantes na escola, incluindo atividades curriculares e extracurriculares. Hoje, o(a) aluno(a) compareceu à escola sem a camisa do uniforme, que é parte essencial do vestuário obrigatório. Solicitamos que providenciem o uso correto do uniforme para os próximos dias, garantindo assim o cumprimento das normas estabelecidas e a segurança do estudante.`
    },
    "Desrespeitou professor(a), funcionário(a) e/ou colega de classe.": {
        title: "**Desrespeito à autoridade ou colega.**",
        getBody: () => `Demonstrou desrespeito com professor(a), funcionário(a) e/ou colega de classe. Nossa instituição preza pelo ambiente de respeito mútuo e boa convivência. Comportamentos como este comprometem a harmonia escolar e são passíveis de medidas disciplinares, conforme previsto no regimento interno da escola.`
    },
    "Desobedeceu e tumultuou a aula e a rotina escolar.": {
        title: "**Desobediência e tumulto.**",
        getBody: () => `Desobedeceu e tumultuou a aula e a rotina escolar. Nossa instituição preza pela disciplina e pelo foco no aprendizado, elementos essenciais para o desenvolvimento de todos os alunos. Comportamentos como este comprometem o bom andamento das atividades e são passíveis de medidas disciplinares, conforme previsto no regimento interno da escola.`
    },
    "Provocou conflitos com os(as) colegas.": {
        title: "**Conflito com colegas.**",
        getBody: () => `Esteve envolvido(a) em conflitos com os(as) colegas. Promovemos um ambiente escolar de paz e respeito, onde a convivência harmoniosa é fundamental para o bem-estar de todos. Tais atitudes são contrárias aos princípios de nossa escola e podem levar a medidas disciplinares, conforme o regimento interno.`
    },
    "Agrediu verbalmente e/ou fisicamente os(as) colegas.": {
        title: "**Agressão a colegas.**",
        getBody: () => `Agrediu verbalmente e/ou fisicamente um(a) colega. A escola não tolera qualquer forma de agressão, seja ela verbal ou física, e preza por um ambiente seguro e respeitoso para todos. Este comportamento é uma violação grave de nossas normas e resultará em medidas disciplinares rigorosas, conforme previsto no regimento interno da escola.`
    },
    "Agrediu verbalmente e/ou fisicamente os(as) professores(as) ou funcionários(as).": {
        title: "**Agressão a professores(as) ou funcionários(as).**",
        getBody: () => `Agrediu verbalmente e/ou fisicamente um(a) professor(a) ou funcionário(a) da escola. Agressões contra a equipe escolar são inaceitáveis e uma violação grave do nosso código de conduta. Este comportamento será tratado com a máxima seriedade e resultará em medidas disciplinares imediatas e rigorosas, de acordo com o regimento interno da escola e a legislação vigente.`
    },
    "Destruiu patrimônio público.": {
        title: "**Destruição de patrimônio público.**",
        getBody: () => `Foi identificado(a) causando a destruição de patrimônio público da escola. Preservar o ambiente escolar é uma responsabilidade de todos, e o respeito aos bens coletivos é um princípio fundamental. Danos ao patrimônio são passíveis de reparação e medidas disciplinares, conforme previsto em nosso regimento interno.`
    },
    "Destruiu e/ou perdeu material didático.": {
        title: "**Destruição ou perda de material didático.**",
        getBody: () => `Destruiu e/ou perdeu material didático importante para suas atividades. O material didático é uma ferramenta essencial para o aprendizado e seu cuidado é fundamental. A reposição do material será necessária e a situação poderá ser considerada em futuras avaliações de comportamento.`
    },
    "Usou indevidamente o celular e aparelhos eletrônicos.": {
        title: "**Uso indevido de celular/eletrônicos.**",
        getBody: () => `Foi flagrado(a) utilizando o telefone celular (ou outro aparelho eletrônico) em sala de aula, desrespeitando as normas da nossa instituição. Ressaltamos que, conforme estabelecido pelas Leis nº 12.745/2024 e nº 15.100/2025, é terminantemente proibido o uso de celular em ambiente escolar, salvo em situações autorizadas previamente pela equipe gestora. O uso indevido de aparelhos eletrônicos compromete o bom andamento das aulas e o foco dos alunos, sendo passível de medidas disciplinares, conforme previsto no regimento interno da escola.`
    },
    "Praticou bullying.": {
        title: "**Prática de bullying.**",
        getBody: () => `Nossa escola repudia veementemente qualquer forma de bullying e se dedica a promover um ambiente de respeito, inclusão e segurança para todos os estudantes. A prática de bullying é uma violação grave de nossas normas de convivência e será tratada com as medidas disciplinares cabíveis, conforme nosso regimento interno e a legislação anti-bullying.`
    },
    "Foi indisciplinado(a) em sala de aula.": {
        title: "**Indisciplina em sala de aula.**",
        getBody: () => `Apresentou comportamento indisciplinado em sala de aula. A manutenção da ordem e do foco durante as aulas é fundamental para o processo de ensino-aprendizagem de todos. Comportamentos que perturbam o ambiente de estudo podem resultar em medidas disciplinares, conforme o regimento interno da escola.`
    },
    "Não realizou as atividades na sala de aula e/ou lições de casa.": {
        title: "**Não realização de atividades/lições de casa.**",
        getBody: () => `Não realizou as atividades propostas em sala de aula e/ou as lições de casa. A dedicação às tarefas é crucial para o acompanhamento do conteúdo e o sucesso acadêmico do(a) estudante. A não realização contínua das atividades pode impactar o desempenho e a compreensão dos temas abordados.`
    },
    "Estava com uniforme incompleto.": {
        title: "**Uniforme incompleto.**",
        getBody: () => `Informamos que, conforme a Portaria nº 181/2024/GS/SEDUC/MT, o uso do uniforme escolar completo é obrigatório para acesso e permanência dos estudantes na escola, incluindo atividades curriculares e extracurriculares. Hoje, o(a) aluno(a) compareceu à escola com o uniforme incompleto. Solicitamos que providenciem o uso correto e completo do uniforme para os próximos dias, garantindo assim o cumprimento das normas estabelecidas e a segurança do estudante.`
    },
    "Outros": { // O item "Outros" tem um tratamento especial no corpo da mensagem.
        title: "**Outras observações:**",
        getBody: (customText) => customText
    }
};

const Painel = ({ usuarioLogado, tipoUsuario, onLogout, senhaUsuario }) => {
    const [registros, setRegistros] = useState([]); // Começamos com array vazio, dados serão carregados do Firestore

    const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('tema') === 'escuro');
    const [mostrarGraficoFaltas, setMostrarGraficoFaltas] = useState(false); // Controla GraficoFaltas
    const [mostrarGraficoSemanal, setMostrarGraficoSemanal] = useState(false); // Controla GraficoSemanal

    const [turmaSelecionada, setTurmaSelecionada] = useState('');
    const [dataSelecionada, setDataSelecionada] = useState(() => getTodayDateString());
    const [editandoAluno, setEditandoAluno] = useState(null);
    // NOVIDADE ALERTA/CUIDADOS: Adicionado 'alertasCuidados' ao estado 'novoAluno'
    // NOVIDADE REQUERIDA: Adicionado dataMatricula ao estado novoAluno
    const [novoAluno, setNovoAluno] = useState({ nome: '', turma: '', contato: '', responsavel: '', monitor: '', alertasCuidados: '', dataMatricula: '' });

    const [dataInicio, setDataInicio] = useState('2025-07-22');
    // ATUALIZAÇÃO REQUERIDA: dataFim padrão é a data atual
    const [dataFim, setDataFim] = useState(() => getTodayDateString());

    // NOVIDADE REQUERIDA: Adicionado dataMatricula e atualizado faltasAnteriores para ser apenas um número
    const [alunoParaCadastro, setAlunoParaCadastro] = useState({
        nome: '',
        turma: '',
        contato: '',
        responsavel: '',
        monitor: '',
        faltasAnteriores: 0, // Número de faltas a serem registradas antes da matrícula
        alertasCuidados: '',
        dataMatricula: getTodayDateString() // Padrão para a data atual
    });
    const [mostrarFormularioCadastro, setMostrarFormularioCadastro] = useState(false);
    const schoolHeaderRef = useRef(null);

    // ESTADOS DA OBSERVAÇÃO
    const [isObservationDropdownOpen, setIsObservationDropdownOpen] = useState(false);
    const [currentAlunoForObservation, setCurrentAlunoForObservation] = useState(null);
    // CORREÇÃO: Inicializa com useState(new Set())
    const [tempSelectedObservations, setTempSelectedObservations] = useState(new Set());
    const [otherObservationText, setOtherObservationText] = useState('');

    // MODIFICAÇÃO AQUI: Estado para armazenar a posição do botão acionador do dropdown
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const dropdownRef = useRef(null); // Ref para o div do dropdown de observações

    const opcoesObservacao = [
        "Chegou atrasado(a).",
        "Cabelo fora do padrão.",
        "Sem tênis.",
        "Sem camisa do uniforme.",
        "Desrespeitou professor(a), funcionário(a) e/ou colega de classe.",
        "Desobedeceu e tumultuou a aula e a rotina escolar.",
        "Provocou conflitos com os(as) colegas.",
        "Agrediu verbalmente e/ou fisicamente os(as) colegas.",
        "Agrediu verbalmente e/ou fisicamente os(as) professores(as) ou funcionários(as).",
        "Destruiu patrimônio público.",
        "Destruiu e/ou perdeu material didático.",
        "Usou indevidamente o celular e aparelhos eletrônicos.",
        "Praticou bullying.",
        "Foi indisciplinado(a) em sala de aula.",
        "Não realizou as atividades na sala de aula e/ou lições de casa.",
        "Estava com uniforme incompleto.",
        "Outros"
    ];

    // NOVIDADE REQUERIDA: Estados para o modal de exportação de observações
    const [showObservationExportModal, setShowObservationExportModal] = useState(false);
    const [selectedObservationTypesToExport, setSelectedObservationTypesToExport] = useState(new Set());
    const [exportObservationScope, setExportObservationScope] = useState('turma'); // 'turma' ou 'allTurmas'
    const observationExportModalRef = useRef(null); // Ref para fechar o modal ao clicar fora

    // NOVIDADE REQUERIDA: Estados para o modal de download ZIP
    const [showZipModal, setShowZipModal] = useState(false);
    const [selectedClassesForZip, setSelectedClassesForZip] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);


    const [showCompleteReportModal, setShowCompleteReportModal] = useState(false);
    const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
    const [completeReportData, setCompleteReportData] = useState(null);
    const [linhaSelecionada, setLinhaSelecionada] = useState(null);
    const [isRecomporModalOpen, setIsRecomporModalOpen] = useState(false);
    const [alunoParaRecompor, setAlunoParaRecompor] = useState(null);
    const [recomporDataInicio, setRecomporDataInicio] = useState('');
    const [recomporDataFim, setRecomporDataFim] = useState('');
    const [termoBuscaTabela, setTermoBuscaTabela] = useState('');

    const [termoBuscaInformativa, setTermoBuscaInformativa] = useState('');
    // CORREÇÃO: Inicializa com useState(null)
    const [alunoInfoEncontrado, setAlunoInfoEncontrado] = useState(null);

    // NOVIDADE FIRESTORE: Estado para indicar se os dados estão sendo carregados
    const [loading, setLoading] = useState(true);

    // NOVIDADE FOTO: Estados para a funcionalidade de FOTO FLUTUANTE e CameraModal
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [alunoParaFoto, setAlunoParaFoto] = useState(null);
    const [viewingPhotoUrl, setViewingPhotoUrl] = useState(null);
    const [photoViewerPosition, setPhotoViewerPosition] = useState(null);
    const photoViewerRef = useRef(null);

    // NOVIDADE EXPORTAÇÃO GRÁFICO: Refs para os componentes de gráfico
    const graficoFaltasRef = useRef(null);
    const graficoSemanalRef = useRef(null); // NOVIDADE EXPORTAÇÃO GRÁFICO: Ref para GraficoSemanal

    // NOVIDADE EXPORTAÇÃO: Novo estado para controlar a exibição das opções de exportação de PDF
    const [showExportOptions, setShowExportOptions] = useState(false);

    // NOVIDADE REQUERIDA: Estados para gerenciar dias não letivos
    const [nonSchoolDays, setNonSchoolDays] = useState([]);
    const [newNonSchoolDayDate, setNewNonSchoolDayDate] = useState('');
    const [newNonSchoolDayEndDate, setNewNonSchoolDayEndDate] = useState('');
    const [newNonSchoolDayReason, setNewNonSchoolDayReason] = useState('');
    // NOVIDADE REQUERIDA: Estado para controlar a visibilidade da seção de dias não letivos
    const [mostrarGerenciarDiasNaoLetivos, setMostrarGerenciarDiasNaoLetivos] = useState(false);


    // NOVIDADE FIRESTORE: useEffect para OUVIR dados do Firestore em TEMPO REAL
    useEffect(() => {
        setLoading(true);
        const unsubscribeAlunos = onSnapshot(collection(db, 'alunos'), (querySnapshot) => {
            const alunosData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                ativo: doc.data().ativo ?? true,
                alertasCuidados: doc.data().alertasCuidados ?? '',
                dataMatricula: doc.data().dataMatricula || REPORT_START_DATE // NOVIDADE REQUERIDA: Garante dataMatricula
            }));
            setRegistros(alunosData); // Atualiza o estado com os novos dados recebidos
            setLoading(false);
            console.log("Dados sincronizados com o Firestore em tempo real.");
        }, (error) => {
            console.error("Erro ao ouvir atualizações do Firestore:", error);
            alert("Erro de conexão em tempo real. Verifique a internet ou as regras do Firestore.");
            setLoading(false);
        });

        // NOVIDADE REQUERIDA: Ouvir a coleção de dias não letivos
        const unsubscribeNonSchoolDays = onSnapshot(collection(db, 'nonSchoolDays'), (querySnapshot) => {
            const daysData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNonSchoolDays(daysData);
            console.log("Dias não letivos sincronizados com o Firestore em tempo real.");
        }, (error) => {
            console.error("Erro ao ouvir dias não letivos do Firestore:", error);
            alert("Erro ao carregar dias não letivos. Verifique a conexão.");
        });


        return () => {
            unsubscribeAlunos();
            unsubscribeNonSchoolDays(); // Limpa o listener dos dias não letivos
        };
    }, []);

    // NOVIDADE REQUERIDA: Função para obter todas as datas letivas entre duas datas
    const getActualSchoolDatesBetween = useCallback((startDate, endDate, nonSchoolDaysArray) => {
        const dates = [];
        let currentDate = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');

        while (currentDate <= end) {
            const dateString = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
            const isNonSchool = nonSchoolDaysArray.some(day => day.date === dateString);

            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchool) { // Exclui fins de semana e dias não letivos
                dates.push(dateString);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }, [nonSchoolDays]); // Depende de nonSchoolDays

    // NOVIDADE REQUERIDA (FINAL): Iniciar faltas como "Falta não apurada" e Ausente no Firestore
    useEffect(() => {
        const initializeAbsentAndUnjustified = async () => {
            // Só executa se uma turma estiver selecionada e os dados já tiverem carregado
            if (!turmaSelecionada || loading) {
                return;
            }

            console.log(`Inicializando presenças/justificativas para turma: ${turmaSelecionada}, data: ${dataSelecionada}`);

            const batch = writeBatch(db);
            let updatesNeeded = false;
            const todayString = getTodayDateString();

            // Evita modificar datas futuras automaticamente, pois não faz sentido serem "faltas não apuradas"
            if (dataSelecionada > todayString) {
                console.log("Data selecionada é futura. Não inicializando faltas.");
                return;
            }

            // Filtra os alunos ATIVOS da turma selecionada
            // Usamos 'registros' completo para garantir que pegamos todos os alunos da turma,
            // independentemente do filtro de busca da tabela (termoBuscaTabela).
            const alunosDaTurma = registros.filter(aluno =>
                aluno.ativo && normalizeTurmaChar(aluno.turma) === normalizeTurmaChar(turmaSelecionada)
            );

            // NOVIDADE REQUERIDA: Verifica se a data selecionada é um dia não letivo
            const isSelectedDateNonSchool = nonSchoolDays.some(day => day.date === dataSelecionada);
            const selectedDateObj = new Date(dataSelecionada + 'T00:00:00');
            const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6; // 0 = Sunday, 6 = Saturday

            if (isSelectedDateNonSchool || isWeekend) {
                console.log(`Data selecionada (${dataSelecionada}) é um dia não letivo ou fim de semana. Não inicializando faltas.`);
                return; // Não inicializa faltas para dias não letivos ou fins de semana
            }

            for (const aluno of alunosDaTurma) {
                // NOVIDADE REQUERIDA: Não inicializa faltas para datas anteriores à matrícula do aluno
                if (dataSelecionada < aluno.dataMatricula) {
                    console.log(`Data selecionada (${dataSelecionada}) é anterior à matrícula do aluno ${aluno.nome}. Não inicializando faltas.`);
                    continue;
                }

                const currentPresence = aluno.presencas?.[dataSelecionada];
                const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
                const currentJustificativa = aluno.justificativas?.[chaveJustificativa];

                // Condição para atualizar:
                // 1. Aluno não está marcado como presente (false ou undefined)
                // 2. E a justificativa não existe OU está vazia OU é "Selecione"
                // Nota: currentPresence === false é explícito para tratar casos onde é undefined (não existe no banco)
                if ((currentPresence === false || currentPresence === undefined) &&
                    (!currentJustificativa || currentJustificativa === "" || currentJustificativa === "Selecione")) {

                    const alunoDocRef = doc(db, 'alunos', aluno.id);
                    const newPresencas = { ...aluno.presencas, [dataSelecionada]: false }; // Garante que esteja como ausente
                    const newJustificativas = { ...aluno.justificativas, [chaveJustificativa]: "Falta não apurada" };

                    batch.update(alunoDocRef, {
                        presencas: newPresencas,
                        justificativas: newJustificativas
                    });
                    updatesNeeded = true;
                }
            }

            if (updatesNeeded) {
                try {
                    await batch.commit();
                    console.log("Faltas 'Não Apuradas' e Ausências inicializadas no Firestore para a turma selecionada.");
                } catch (error) {
                    console.error("Erro ao inicializar faltas no Firestore:", error);
                    alert("Erro ao inicializar dados de faltas. Verifique a conexão.");
                }
            }
        };

        // Chama a função de inicialização
        initializeAbsentAndUnjustified();

    }, [turmaSelecionada, dataSelecionada, registros, loading, nonSchoolDays]); // Depende da turma, data, registros, loading e nonSchoolDays para re-executar


    useEffect(() => { /* Antigo: localStorage.setItem('registros', JSON.stringify(registros)); */ }, [registros]);

    const closeObservationDropdown = useCallback(() => {
        setIsObservationDropdownOpen(false);
        setCurrentAlunoForObservation(null);
        setTempSelectedObservations(new Set());
        setOtherObservationText('');
        setButtonPosition({ top: 0, left: 0, width: 0, height: 0 }); // Resetar posição
    }, []);

    // Modificado para usar buttonPosition em vez de dropdownPosition
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest('.observation-button')) {
                closeObservationDropdown();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [dropdownRef, closeObservationDropdown]);

    useEffect(() => { document.body.style.backgroundColor = temaEscuro ? '#121212' : '#ffffff'; document.body.style.color = temaEscuro ? '#ffffff' : '#000000'; localStorage.setItem('tema', temaEscuro ? 'escuro' : 'claro'); }, [temaEscuro]);
    const turmasPermitidas = useCallback(() => { let allowedTurmas = []; const usuarioLogadoNormalizado = normalizeTurmaChar(usuarioLogado); if (tipoUsuario === 'gestor') { allowedTurmas = turmasDisponiveis.map(t => normalizeTurmaChar(t.name)); } else { const monitor = monitoresDisponiveis.find(m => normalizeTurmaChar(m.name) === usuarioLogadoNormalizado); if (monitor) { allowedTurmas = monitor.turmas.map(t => normalizeTurmaChar(t)); } } return allowedTurmas; }, [usuarioLogado, tipoUsuario]);

    // NOVIDADE FOTO: Efeito para fechar o visualizador de fotos ao clicar fora
    useEffect(() => {
        const handleClickOutsidePhotoViewer = (event) => {
            if (photoViewerRef.current && !photoViewerRef.current.contains(event.target) && !event.target.closest('.photo-thumbnail')) {
                setViewingPhotoUrl(null);
                setPhotoViewerPosition(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutsidePhotoViewer);
        return () => document.removeEventListener("mousedown", handleClickOutsidePhotoViewer);
    }, [photoViewerRef]);

    // Dados filtrados para a TABELA e para GraficoFaltas/outros relatórios (APENAS ALUNOS ATIVOS)
    const registrosFiltradosParaTabelaEOutros = useMemo(() => {
        // Se nenhuma turma estiver selecionada, retorna uma lista vazia.
        if (!turmaSelecionada) {
            return [];
        }
        return registros
            .filter(a => {
                // Apenas alunos ATIVOS são exibidos na tabela principal e em outros gráficos/relatórios
                if (a.ativo === false) return false;

                const turmasDoUsuario = turmasPermitidas();
                const turmaAlunoNormalizada = normalizeTurmaChar(a.turma);
                const pertence = turmasDoUsuario.includes(turmaAlunoNormalizada);
                const turmaSelecionadaNormalizada = normalizeTurmaChar(turmaSelecionada);
                // A condição original 'turmaSelecionada === ''' foi mantida para outros casos de uso, mas o if acima já trata a exibição inicial.
                const turmaOk = turmaSelecionada === '' || turmaAlunoNormalizada === turmaSelecionadaNormalizada;

                const buscaTabelaOk = a.nome.toLowerCase().includes(termoBuscaTabela.toLowerCase());

                return pertence && turmaOk && buscaTabelaOk;
            })
            .sort((a, b) => a.nome.localeCompare(b.nome)); // ORDENAÇÃO ALFABÉTICA AQUI
    }, [registros, turmaSelecionada, termoBuscaTabela, turmasPermitidas]);

    // NOVIDADE FIRESTORE: A função atualizarAlunoRegistro agora interage com o Firestore
    const atualizarAlunoRegistro = useCallback(async (alunoId, alunoAtualizado) => {
        try {
            const alunoDocRef = doc(db, 'alunos', alunoId);
            // Remove o ID do objeto antes de salvar/atualizar, pois o ID já é o nome do documento
            const { id, ...dadosParaSalvar } = alunoAtualizado;
            // NOVIDADE: Sanitiza o nome antes de salvar/atualizar
            dadosParaSalvar.nome = sanitizeName(dadosParaSalvar.nome);
            await setDoc(alunoDocRef, dadosParaSalvar, { merge: true }); // merge: true para atualizar campos existentes

            console.log("Aluno atualizado no Firestore com sucesso:", alunoId);
        } catch (error) {
            console.error("Erro ao atualizar aluno no Firestore:", error);
            alert("Erro ao atualizar dados do aluno.");
        }
    }, []);

    // NOVIDADE FOTO: Função para abrir o modal da câmera
    const handleOpenModalFoto = useCallback((aluno) => {
        setAlunoParaFoto(aluno);
        setIsCameraModalOpen(true);
    }, []);

    // NOVIDADE FOTO: Callback para quando o upload da foto é bem-sucedido
    const handleUploadSuccess = useCallback(async (secure_url) => {
        if (!alunoParaFoto) return; // Garante que há um aluno selecionado
        try {
            // Atualiza o campo fotoUrl no Firestore para o aluno selecionado
            await atualizarAlunoRegistro(alunoParaFoto.id, { ...alunoParaFoto, fotoUrl: secure_url });
            alert('Foto enviada e salva com sucesso!');
            setIsCameraModalOpen(false); // Fecha o modal após o upload
            setAlunoParaFoto(null); // Limpa o aluno selecionado
        } catch (error) {
            console.error("Erro ao salvar a URL da foto no Firestore:", error);
            alert("Erro ao salvar a foto no banco de dados.");
        }
    }, [alunoParaFoto, atualizarAlunoRegistro]);

    // NOVIDADE FOTO: Função para visualizar a foto em um modal flutuante
    const handleViewPhoto = useCallback((url, event) => {
        if (viewingPhotoUrl === url) { // Se a mesma foto for clicada, esconde
            setViewingPhotoUrl(null);
            setPhotoViewerPosition(null);
        } else {
            const rect = event.currentTarget.getBoundingClientRect();
            setViewingPhotoUrl(url);
            setPhotoViewerPosition({ top: rect.top + window.scrollY, left: rect.left + window.scrollX + rect.width + 10 }); // Posição ao lado do botão
        }
    }, [viewingPhotoUrl]);

    // NOVIDADE FOTO: Função para excluir a foto do aluno (limpa a URL no Firestore)
    const handleExcluirFoto = useCallback(async (aluno) => {
        if (window.confirm(`Tem certeza que deseja EXCLUIR a foto de ${aluno.nome}?`)) {
            try {
                await atualizarAlunoRegistro(aluno.id, { ...aluno, fotoUrl: '' }); // Limpa a fotoUrl no Firestore
                alert('Foto excluída com sucesso!');
            } catch (error) {
                console.error("Erro ao excluir a foto do Firestore:", error);
                alert("Erro ao excluir a foto.");
            }
        }
    }, [atualizarAlunoRegistro]);


    const totalAtrasosNoPeriodo = useMemo(() => {
        const inicio = dataInicio || REPORT_START_DATE;
        const fim = dataFim || getTodayDateString();
        let contadorAtrasos = 0;

        registros.forEach(aluno => {
            if (aluno.observacoes) {
                Object.entries(aluno.observacoes).forEach(([chave, obsArray]) => {
                    const dataObs = chave.split('_')[2];
                    if (dataObs && dataObs >= inicio && dataObs <= fim) {
                        if (Array.isArray(obsArray) && obsArray.includes("Chegou atrasado(a).")) {
                            contadorAtrasos++;
                        }
                    }
                });
            }
        });
        return contadorAtrasos;
    }, [registros, dataInicio, dataFim]);

    // NOVIDADE REQUERIDA: handleCadastrarAluno agora considera dataMatricula e faltasAnteriores
    const handleCadastrarAluno = useCallback(async (e) => {
        e.preventDefault();
        if (!alunoParaCadastro.nome || !alunoParaCadastro.turma || !alunoParaCadastro.contato || !alunoParaCadastro.responsavel || !alunoParaCadastro.monitor || !alunoParaCadastro.dataMatricula) {
            alert('Por favor, preencha todos os campos obrigatórios para cadastrar o(a) aluno(a).');
            return;
        }

        const justificativasIniciais = {};
        const presencasIniciais = {};
        const numFaltasAnteriores = parseInt(alunoParaCadastro.faltasAnteriores, 10) || 0;
        const dataMatriculaObj = new Date(alunoParaCadastro.dataMatricula + 'T00:00:00');
        const reportStartDateObj = new Date(REPORT_START_DATE + 'T00:00:00');

        // Pega todos os dias letivos entre REPORT_START_DATE e dataMatricula (exclusiva)
        const schoolDaysBeforeMatricula = getActualSchoolDatesBetween(REPORT_START_DATE, new Date(dataMatriculaObj.getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0], nonSchoolDays);

        let faltasContabilizadas = 0;
        for (const date of schoolDaysBeforeMatricula) {
            if (faltasContabilizadas < numFaltasAnteriores) {
                justificativasIniciais[`${alunoParaCadastro.nome}_${normalizeTurmaChar(alunoParaCadastro.turma)}_${date}`] = "Falta anterior à matrícula";
                presencasIniciais[date] = false;
                faltasContabilizadas++;
            } else {
                presencasIniciais[date] = true; // Marca como presente se não for uma falta anterior
            }
        }

        const novoRegistroData = { // Dados que serão salvos no Firestore
            nome: sanitizeName(alunoParaCadastro.nome), // NOVIDADE: Sanitiza o nome ao cadastrar
            turma: normalizeTurmaChar(alunoParaCadastro.turma),
            contato: alunoParaCadastro.contato,
            responsavel: alunoParaCadastro.responsavel,
            monitor: alunoParaCadastro.monitor,
            justificativas: justificativasIniciais,
            observacoes: {},
            presencas: presencasIniciais, // NOVIDADE: Inicializa o campo de presenças
            totalDiasLetivos: 100, // Mantém este valor como base para cálculos de porcentagem
            ativo: true,
            fotoUrl: '', // NOVIDADE FOTO: Inicializa fotoUrl vazia, será adicionada via CameraModal
            alertasCuidados: alunoParaCadastro.alertasCuidados.trim(),
            dataMatricula: alunoParaCadastro.dataMatricula // NOVIDADE REQUERIDA: Salva a data de matrícula
        };

        try {
            const docRef = doc(collection(db, 'alunos')); // Cria uma nova referência de documento com ID automático
            await setDoc(docRef, novoRegistroData); // Salva os dados do novo aluno no Firestore

            // Limpa o formulário e o estado do novo aluno, incluindo o novo campo
            setAlunoParaCadastro({ nome: '', turma: '', contato: '', responsavel: '', monitor: '', faltasAnteriores: 0, alertasCuidados: '', dataMatricula: getTodayDateString() });
            alert('Aluno(a) cadastrado(a) com sucesso!');
        } catch (error) {
            console.error("Erro ao cadastrar aluno no Firestore:", error);
            alert("Erro ao cadastrar aluno.");
        }
    }, [alunoParaCadastro, getActualSchoolDatesBetween, nonSchoolDays]);

    // NOVIDADE FIRESTORE: handleExcluirAluno agora atualiza o status 'ativo' no Firestore
    const handleExcluirAluno = useCallback(async (alunoParaExcluir) => { // Recebe o objeto aluno completo
        if (window.confirm("Tem certeza que deseja EXCLUIR este(a) aluno(a)? Ele(a) será removido(a) da lista principal, mas suas faltas e atrasos ANTERIORES continuarão nos relatórios GERAIS (como o Gráfico Semanal).")) {
            try {
                const alunoDocRef = doc(db, 'alunos', alunoParaExcluir.id); // Pega a referência pelo ID do aluno
                await updateDoc(alunoDocRef, { ativo: false }); // Atualiza apenas o campo 'ativo'

                alert('Aluno(a) excluído(a) da exibição principal com sucesso! Dados históricos gerais preservados.');
            } catch (error) {
                console.error("Erro ao excluir aluno do Firestore:", error);
                alert("Erro ao excluir aluno.");
            }
        }
    }, []);

    // NOVIDADE FIRESTORE: salvarEdicao agora atualiza no Firestore
    const salvarEdicao = useCallback(async () => {
        // Garante que estamos editando um aluno existente com ID
        if (!editandoAluno || !novoAluno.id) { // Agora editandoAluno é o ID do aluno
            console.error("Erro: Aluno em edição ou ID ausente.");
            alert("Erro: Não foi possível salvar a edição. Aluno ou ID ausente.");
            return;
        }
        try {
            const alunoDocRef = doc(db, 'alunos', novoAluno.id);
            const { id, ...dadosParaSalvar } = novoAluno; // Remove o ID para não tentar salvá-lo como campo
            // NOVIDADE: Sanitiza o nome antes de salvar/atualizar
            dadosParaSalvar.nome = sanitizeName(dadosParaSalvar.nome);
            await setDoc(alunoDocRef, dadosParaSalvar, { merge: true }); // merge: true para atualizar campos existentes

            alert("Aluno atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar edição no Firestore:", error);
            alert("Erro ao salvar edição do aluno.");
        }
    }, [editandoAluno, novoAluno]);

    // NOVIDADE FIRESTORE: justificarTodos agora atualiza no Firestore (usando batch)
    const justificarTodos = useCallback(async () => {
        const motivo = prompt("Digite a justificativa para todos os(as) alunos(as) filtrados(as):");
        if (motivo) {
            // Pega apenas os alunos ativos filtrados para atualização
            const alunosParaAtualizar = registrosFiltradosParaTabelaEOutros.filter(r => r.ativo);

            try {
                const batchInstance = writeBatch(db);

                for (const r of alunosParaAtualizar) {
                    // NOVIDADE REQUERIDA: Não justificar se a data for anterior à matrícula
                    if (dataSelecionada < r.dataMatricula) {
                        console.log(`Não justificando ${r.nome} para ${dataSelecionada}: data anterior à matrícula.`);
                        continue;
                    }

                    const chave = `${r.nome}_${normalizeTurmaChar(r.turma)}_${dataSelecionada}`;
                    const alunoDocRef = doc(db, 'alunos', r.id);
                    const novasJustificativas = { ...r.justificativas, [chave]: motivo };
                    batchInstance.update(alunoDocRef, { justificativas: novasJustificativas });
                }
                await batchInstance.commit();

                alert("Faltas justificadas no Firestore com sucesso!");
            } catch (error) {
                console.error("Erro ao justificar todos no Firestore:", error);
                alert("Erro ao justificar faltas.");
            }
        }
    }, [dataSelecionada, registrosFiltradosParaTabelaEOutros]);

    // NOVIDADE: Função para alternar a seleção de todos os alunos (marcar/desmarcar)
    const handleToggleAllChamada = useCallback(async () => {
        if (!turmaSelecionada) {
            alert('Por favor, selecione uma turma para alternar a chamada.');
            return;
        }

        const selectedDateObj = new Date(dataSelecionada + 'T00:00:00');
        const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;
        const isNonSchoolDay = nonSchoolDays.some(day => day.date === dataSelecionada);

        if (isFutureDate || isWeekend || isNonSchoolDay) {
            alert("Não é possível alterar a chamada para datas futuras, fins de semana ou dias não letivos.");
            return;
        }

        // Verifica se *algum* aluno está presente na data selecionada
        const anyPresent = registrosFiltradosParaTabelaEOutros.some(
            aluno => aluno.ativo && aluno.presencas?.[dataSelecionada] === true
        );

        let targetPresenceState;
        if (anyPresent) {
            // Se pelo menos um está presente, a ação é DESMARCAR TODOS
            targetPresenceState = false;
            if (!window.confirm(`Tem certeza que deseja DESMARCAR a presença de TODOS os alunos da turma ${turmaSelecionada} para a data ${formatarData(dataSelecionada)}?`)) {
                return;
            }
        } else {
            // Se todos estão ausentes (ou não registrados), a ação é MARCAR TODOS
            targetPresenceState = true;
            if (!window.confirm(`Tem certeza que deseja MARCAR a presença de TODOS os alunos da turma ${turmaSelecionada} para a data ${formatarData(dataSelecionada)}?`)) {
                return;
            }
        }

        try {
            const batchInstance = writeBatch(db);
            const alunosParaAtualizar = registrosFiltradosParaTabelaEOutros.filter(r => r.ativo); // Apenas alunos ativos na turma selecionada

            for (const r of alunosParaAtualizar) {
                // NOVIDADE REQUERIDA: Não altera a presença se a data for anterior à matrícula
                if (dataSelecionada < r.dataMatricula) {
                    console.log(`Não alterando presença de ${r.nome} para ${dataSelecionada}: data anterior à matrícula.`);
                    continue;
                }

                const alunoDocRef = doc(db, 'alunos', r.id);
                const newPresencas = { ...r.presencas, [dataSelecionada]: targetPresenceState };
                let newJustificativas = { ...r.justificativas };
                const chaveJustificativa = `${r.nome}_${normalizeTurmaChar(r.turma)}_${dataSelecionada}`;

                if (targetPresenceState === true) { // Se marcar como presente, remove a justificativa
                    newJustificativas[chaveJustificativa] = ""; // Define explicitamente como string vazia
                } else { // Se desmarcar (ausente), adiciona "Falta não apurada" se não houver outra
                    if (!newJustificativas[chaveJustificativa] || newJustificativas[chaveJustificativa] === "Selecione" || newJustificativas[chaveJustificativa] === "") {
                        newJustificativas[chaveJustificativa] = "Falta não apurada";
                    }
                }

                batchInstance.update(alunoDocRef, {
                    presencas: newPresencas,
                    justificativas: newJustificativas
                });
            }
            await batchInstance.commit();
            alert(`Chamada da turma ${turmaSelecionada} para ${formatarData(dataSelecionada)} ${targetPresenceState ? 'marcada' : 'desmarcada'} com sucesso!`);
        } catch (error) {
            console.error("Erro ao alternar todos os alunos:", error);
            alert("Erro ao alternar a chamada.");
        }
    }, [turmaSelecionada, dataSelecionada, registrosFiltradosParaTabelaEOutros, formatarData, nonSchoolDays]);


    // NOVIDADE FIRESTORE: reiniciarAlertas agora atualiza no Firestore (usando batch, incluindo 'presencas')
    const reiniciarAlertas = useCallback(async () => {
        if (tipoUsuario !== 'gestor') { alert("Apenas gestores podem reiniciar os alertas."); return; }
        const senhaDigitada = prompt("Para reiniciar todos os alertas, por favor, digite a sua senha de gestor:");
        if (senhaDigitada === senhaUsuario) {
            if (window.confirm("Senha correta! Tem certeza que deseja reiniciar TODAS as justificativas, observações e registros de presença? Esta ação é irreversível.")) {
                try {
                    const batchInstance = writeBatch(db);
                    const alunosCollectionRef = collection(db, 'alunos');
                    const querySnapshot = await getDocs(alunosCollectionRef);

                    querySnapshot.docs.forEach(docSnapshot => {
                        const alunoDocRef = doc(db, 'alunos', docSnapshot.id);
                        // NÃO remove o aluno, apenas reseta justificativas/observações, presenças e o torna ativo
                        // NOVIDADE ALERTA/CUIDADOS: Limpa o campo 'alertasCuidados' ao reiniciar alertas
                        // NOVIDADE REQUERIDA: dataMatricula não é resetada
                        batchInstance.update(alunoDocRef, { justificativas: {}, observacoes: {}, presencas: {}, ativo: true, fotoUrl: '', alertasCuidados: '' });
                    });

                    // NOVIDADE REQUERIDA: Limpar também a coleção de dias não letivos
                    const nonSchoolDaysCollectionRef = collection(db, 'nonSchoolDays');
                    const nonSchoolDaysSnapshot = await getDocs(nonSchoolDaysCollectionRef);
                    nonSchoolDaysSnapshot.docs.forEach(docSnapshot => {
                        batchInstance.delete(doc(db, 'nonSchoolDays', docSnapshot.id));
                    });

                    await batchInstance.commit();

                    alert("Alertas, presenças, fotos e dias não letivos reiniciados no Firestore com sucesso!");
                } catch (error) {
                    console.error("Erro ao reiniciar alertas no Firestore:", error);
                    alert("Erro ao reiniciar alertas.");
                }
            }
        } else if (senhaDigitada !== null) { alert("Senha incorreta. Reinício cancelado."); }
    }, [tipoUsuario, senhaUsuario]);

    // Função para salvar as observações no Firestore
    const handleSaveObservations = useCallback(async () => {
        if (!currentAlunoForObservation || !currentAlunoForObservation.id) {
            console.error("Erro: Aluno para observação ou ID ausente.");
            alert("Erro: Não foi possível salvar as observações. Aluno ou ID ausente.");
            return;
        }
        // NOVIDADE REQUERIDA: Não salva observação se a data for anterior à matrícula
        if (dataSelecionada < currentAlunoForObservation.dataMatricula) {
            alert("Não é possível adicionar/editar observações para datas anteriores à matrícula do aluno.");
            return;
        }

        const finalObservationsArray = Array.from(tempSelectedObservations);
        if (tempSelectedObservations.has("Outros") && otherObservationText.trim() !== '') {
            const indexOutros = finalObservationsArray.indexOf("Outros");
            if (indexOutros > -1) { finalObservationsArray.splice(indexOutros, 1); }
            finalObservationsArray.push(`Outros: ${otherObservationText.trim()}`);
        } else if (tempSelectedObservations.has("Outros") && otherObservationText.trim() === '') {
            const newSet = new Set(tempSelectedObservations);
            newSet.delete("Outros");
            setTempSelectedObservations(newSet); // Atualiza o estado do dropdown
            const indexOutros = finalObservationsArray.indexOf("Outros");
            if (indexOutros > -1) { finalObservationsArray.splice(indexOutros, 1); }
        }

        const chaveObservacao = `${currentAlunoForObservation.nome}_${normalizeTurmaChar(currentAlunoForObservation.turma)}_${dataSelecionada}`;
        const updatedObservations = { ...currentAlunoForObservation.observacoes, [chaveObservacao]: finalObservationsArray.length > 0 ? finalObservationsArray : [] };

        try {
            const alunoDocRef = doc(db, 'alunos', currentAlunoForObservation.id);
            await updateDoc(alunoDocRef, { observacoes: updatedObservations });

            alert("Observações salvas no Firestore com sucesso!");
            closeObservationDropdown();
        } catch (error) {
            console.error("Erro ao salvar observações no Firestore:", error);
            alert("Erro ao salvar observações.");
        }
    }, [currentAlunoForObservation, tempSelectedObservations, otherObservationText, dataSelecionada, closeObservationDropdown]);

    // Função para enviar mensagem de observação via WhatsApp
    const handleSendObservationWhatsApp = useCallback(() => {
        if (!currentAlunoForObservation || !currentAlunoForObservation.contato) {
            alert("Aluno ou contato do responsável não disponível para enviar mensagem.");
            return;
        }
        // NOVIDADE REQUERIDA: Não envia mensagem se a data for anterior à matrícula
        if (dataSelecionada < currentAlunoForObservation.dataMatricula) {
            alert("Não é possível enviar mensagens de observação para datas anteriores à matrícula do aluno.");
            return;
        }
        if (tempSelectedObservations.size === 0 && otherObservationText.trim() === '') {
            alert("Nenhuma observação selecionada para enviar.");
            return;
        }

        const aluno = currentAlunoForObservation;
        const dataAtualFormatada = formatarData(dataSelecionada);
        const monitorNome = usuarioLogado;
        const alunoTurmaNormalizada = normalizeTurmaChar(aluno.turma);

        const messageParts = [];

        // Cabeçalho da Mensagem
        messageParts.push(`Olá, ${aluno.responsavel}!
Gostaríamos de informar que, na data de hoje ${dataAtualFormatada}, foram registradas as seguintes observações sobre o(a) ${aluno.nome} (${normalizeTurmaChar(aluno.turma)}):`);

        // Lista de Observações
        Array.from(tempSelectedObservations).forEach(obsKey => {
            if (obsKey === "Outros") {
                if (otherObservationText.trim() !== '') {
                    const outrosMessage = observationMessages["Outros"].getBody(otherObservationText.trim());
                    messageParts.push(`- ${observationMessages["Outros"].title} ${outrosMessage}`);
                }
            } else {
                const obsTemplate = observationMessages[obsKey];
                if (obsTemplate) {
                    const body = obsTemplate.getBody(aluno); // Passa o aluno para a função getBody
                    messageParts.push(`- ${obsTemplate.title} ${body}`);
                }
            }
        });

        // Rodapé da Mensagem
        messageParts.push(`Contamos com a colaboração da família no acompanhamento e orientação do(a) estudante quanto à observância das normas escolares.

Agradecemos a atenção e o apoio de vocês.

Atenciosamente,
Monitor ${monitorNome}
EECIM Professora Ana Maria das Graças de Souza Noronha`);

        const fullMessage = messageParts.join('\n\n'); // Junta as partes com duas quebras de linha para parágrafos

        const link = `https://wa.me/55${aluno.contato.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(fullMessage)}`;
        window.open(link, '_blank');
        closeObservationDropdown(); // Fecha o dropdown após enviar
    }, [currentAlunoForObservation, tempSelectedObservations, otherObservationText, dataSelecionada, usuarioLogado, closeObservationDropdown]);

    // NOVIDADE REQUERIDA: Função para Salvar e Enviar as observações
    const handleSaveAndSendCombined = useCallback(async () => {
        // Primeiro, salva as observações
        await handleSaveObservations();
        // Em seguida, envia a mensagem via WhatsApp
        handleSendObservationWhatsApp();
    }, [handleSaveObservations, handleSendObservationWhatsApp]);


    const enviarWhatsapp = useCallback((aluno) => {
        // NOVIDADE REQUERIDA: Não envia WhatsApp se a data for anterior à matrícula
        if (dataSelecionada < aluno.dataMatricula) {
            alert("Não é possível enviar mensagens de WhatsApp para datas anteriores à matrícula do aluno.");
            return;
        }

        const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        const diaSemana = dataObj.getDay();
        const dataFormatada = formatarData(dataSelecionada);
        const texto = `Olá, ${aluno.responsavel}, informamos que ${aluno.nome} (${normalizeTurmaChar(aluno.turma)}) esteve ausente na escola, na data de hoje ${dataFormatada} (${diasSemana[diaSemana]}). Por favor, justificar a ausência.\n\nLembramos que faltas não justificadas podem resultar em notificações formais, conforme as diretrizes educacionais.\n\nAguardamos seu retorno.\n\nAtenciosamente,\nMonitor(a) ${usuarioLogado}\nEscola Cívico-Militar Profª Ana Maria das Graças de Souza Noronha`;
        const link = `https://wa.me/55${aluno.contato.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(texto)}`;
        window.open(link, '_blank');
    }, [dataSelecionada, usuarioLogado]);


    // MODIFICADO: exportarPeriodo agora aceita um flag para exportar todas as turmas
    const exportarPeriodo = useCallback((exportAllClasses = false) => {
        if (!dataInicio || !dataFim) return alert('Selecione o período completo!');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`;
        const logoUrl = '/logo-escola.png'; // Garanta que este arquivo esteja na pasta /public
        let yOffset = 10;

        const addContentToDoc = () => {
            doc.setFontSize(10);
            let reportTitle = `Relatório por Período (${formatarData(dataInicio)} a ${formatarData(dataFim)}) - ${tipoUsuario} ${usuarioLogado}`;
            if (exportAllClasses) {
                reportTitle += ' - TODAS AS TURMAS';
            } else {
                reportTitle += ` - Turma: ${turmaSelecionada}`;
            }
            doc.text(reportTitle, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 10;

            // NOVIDADE AQUI: Coletar e classificar as entradas antes de gerar a tabela
            const allPeriodEntries = []; // Array para armazenar as entradas com dados para classificação

            // Define os registros a serem usados: todos se exportAllClasses for true, senão os filtrados
            // A filtragem deve considerar APENAS alunos ATIVOS
            const registrosConsiderados = registros.filter(a => a.ativo);

            registrosConsiderados.forEach((aluno) => {
                const alunoJustificativas = aluno.justificativas || {};
                Object.entries(alunoJustificativas).forEach(([chave, justificativa]) => {
                    const partes = chave.split('_');
                    const data = partes[2]; // Formato YYYY-MM-DD para fácil comparação
                    const turmaAlunoNormalizada = normalizeTurmaChar(aluno.turma);

                    const turmasDoUsuario = turmasPermitidas(); // Pega as turmas que o usuário logado pode ver

                    // NOVIDADE REQUERIDA: A falta só é contada se a presença for false/undefined E a justificativa não for vazia
                    const isPresentForDate = aluno.presencas?.[data] === true;
                    const isNonSchoolDayEntry = nonSchoolDays.some(day => day.date === data);
                    const entryDateObj = new Date(data + 'T00:00:00');
                    const isWeekendEntry = entryDateObj.getDay() === 0 || entryDateObj.getDay() === 6;
                    const isHistoricalAbsence = justificativa === "Falta anterior à matrícula";


                    const shouldIncludeEntry = (
                        data >= dataInicio && data <= dataFim &&
                        (exportAllClasses ? turmasDoUsuario.includes(turmaAlunoNormalizada) : (turmaAlunoNormalizada === normalizeTurmaChar(turmaSelecionada) && turmasDoUsuario.includes(turmaAlunoNormalizada))) &&
                        (isHistoricalAbsence || (!isPresentForDate && justificativa && justificativa !== "" && dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayEntry && !isWeekendEntry))
                    );

                    if (shouldIncludeEntry) {
                        allPeriodEntries.push({
                            nome: aluno.nome,
                            turma: turmaAlunoNormalizada,
                            contato: aluno.contato || '',
                            responsavel: aluno.responsavel || '',
                            justificativa: justificativa,
                            data: data, // Usamos a data no formato YYYY-MM-DD para classificação
                            monitor: aluno.monitor || ''
                        });
                    }
                });
            });

            // NOVIDADE AQUI: Classificar as entradas
            allPeriodEntries.sort((a, b) => {
                // 1. Classificar por Data (crescente)
                if (a.data < b.data) return -1;
                if (a.data > b.data) return 1;

                // 2. Se as datas forem iguais, classificar por Turma (alfabética)
                if (a.turma < b.turma) return -1;
                if (a.turma > b.turma) return 1;

                // Se data e turma forem iguais, classificar por Nome do Aluno (alfabética)
                return a.nome.localeCompare(b.nome);
            });

            // Mapear as entradas classificadas para o formato esperado pelo jspdf-autotable
            const periodoFormattedForTable = allPeriodEntries.map((entry, index) => [
                index + 1, // Coluna de contagem (Nº)
                entry.nome,
                entry.turma,
                entry.contato,
                entry.responsavel,
                entry.justificativa,
                formatarData(entry.data), // Formata a data para exibição no PDF
                entry.monitor
            ]);

            autoTable(doc, {
                startY: yOffset,
                head: [['Nº', 'Nome', 'Turma', 'Contato', 'Responsável', 'Justificativa', 'Data', 'Monitor(a)']], // Adicionado 'Nº'
                body: periodoFormattedForTable, // Usamos o array classificado e formatado
                styles: { fontSize: 8, halign: 'center' },
                headStyles: { fillColor: [37, 99, 235], halign: 'center' },
                columnStyles: {
                    1: { halign: 'left', cellWidth: 'auto' }, // ALINHA O NOME À ESQUERDA E AUTO-AJUSTA LARGURA
                },
            });

            // Adicionar o total de faltas no final
            doc.setFontSize(10);
            const finalYForTotalFaltas = doc.lastAutoTable.finalY + 10;
            doc.text(`Total de faltas no período: ${allPeriodEntries.length}`, 14, finalYForTotalFaltas);


            const fileName = exportAllClasses
                ? `faltas_todas_turmas_${dataInicio}_a_${dataFim}.pdf`
                : `faltas_turma_${normalizeTurmaChar(turmaSelecionada)}_${dataInicio}_a_${dataFim}.pdf`; // Nome do arquivo para turma selecionada
            doc.save(fileName);
            setShowExportOptions(false); // Esconde as opções após a exportação
        };

        const img = new Image();
        img.src = logoUrl;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const logoWidth = 20;
            const logoHeight = (img.height * logoWidth) / img.width;
            const xLogo = (pageWidth - logoWidth) / 2;
            doc.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight);
            yOffset += logoHeight + 5;
            doc.setFontSize(9);
            doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 10;
            addContentToDoc();
        };

        img.onerror = () => {
            console.error("Erro ao carregar a logo. Gerando PDF sem a imagem.");
            doc.setFontSize(12);
            doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 15;
            addContentToDoc();
        };
    }, [dataInicio, dataFim, usuarioLogado, tipoUsuario, registros, turmasPermitidas, turmaSelecionada, nonSchoolDays]);

    // NOVIDADE: Função para exportar a chamada por período
    const exportarChamadaPeriodoPDF = useCallback(async () => {
        if (!dataInicio || !dataFim) {
            alert('Selecione o período completo para exportar a chamada.');
            return;
        }
        if (!turmaSelecionada) {
            alert('Selecione uma turma para exportar a chamada por período.');
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para paisagem
        const pageWidth = doc.internal.pageSize.getWidth();
        let yOffset = 10;
        const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`;
        const logoUrl = '/logo-escola.png';

        // Função para adicionar cabeçalho (logo e nome da escola)
        const addHeaderToPdf = async () => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = logoUrl;
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                    const logoWidth = 20;
                    const logoHeight = (img.height * logoWidth) / img.width;
                    const xLogo = (pageWidth - logoWidth) / 2;
                    doc.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight);
                    yOffset += logoHeight + 5;
                    doc.setFontSize(9);
                    doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
                    yOffset += 10;
                    resolve();
                };
                img.onerror = () => {
                    console.error("Erro ao carregar a logo para o PDF. Gerando PDF sem a imagem.");
                    doc.setFontSize(12);
                    doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
                    yOffset += 15;
                    resolve();
                };
            });
        };

        await addHeaderToPdf();

        // Título do relatório
        doc.setFontSize(14);
        doc.text(`Relatório de Chamada - Turma: ${normalizeTurmaChar(turmaSelecionada)} (${formatarData(dataInicio)} a ${formatarData(dataFim)})`, pageWidth / 2, yOffset, { align: 'center' });
        yOffset += 15;

        // **INÍCIO DA LÓGICA DE FILTRAGEM DE DIAS COM PRESENÇA**
        const allDatesInPeriod = new Set();
        let tempCurrentDate = new Date(dataInicio + 'T00:00:00');
        const tempEndDate = new Date(dataFim + 'T00:00:00');

        while (tempCurrentDate <= tempEndDate) {
            const dateString = tempCurrentDate.toISOString().split('T')[0];
            const dayOfWeek = tempCurrentDate.getDay();
            const isNonSchoolDayDate = nonSchoolDays.some(day => day.date === dateString);

            // Inclui a data apenas se não for fim de semana e não for um dia não letivo
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayDate) {
                allDatesInPeriod.add(dateString);
            }
            tempCurrentDate.setDate(tempCurrentDate.getDate() + 1);
        }

        const datesWithPresence = new Set();
        // Filtrar registros para incluir apenas alunos ATIVOS da turma selecionada
        let alunosDaTurmaAtivos = registros.filter(aluno => // Usar 'let' para permitir reatribuição após a ordenação
            aluno.ativo && normalizeTurmaChar(aluno.turma) === normalizeTurmaChar(turmaSelecionada)
        );

        // ORDENAÇÃO ALFABÉTICA AQUI para o PDF de Chamada
        alunosDaTurmaAtivos.sort((a, b) => a.nome.localeCompare(b.nome));


        alunosDaTurmaAtivos.forEach(aluno => {
            if (aluno.presencas) {
                Object.entries(aluno.presencas).forEach(([dateString, isPresent]) => {
                    // Verifica se a presença é 'true' E se a data está dentro do período selecionado e é um dia letivo
                    // NOVIDADE REQUERIDA: Apenas considera presenças a partir da data de matrícula
                    if (isPresent === true && allDatesInPeriod.has(dateString) && dateString >= aluno.dataMatricula) {
                        datesWithPresence.add(dateString);
                    }
                });
            }
        });

        // Converte o Set para Array e ordena as datas cronologicamente
        const finalDatesForExport = Array.from(allDatesInPeriod).sort(); // Usar allDatesInPeriod para o cabeçalho, para mostrar todos os dias letivos
        // **FIM DA LÓGICA DE FILTRAGEM DE DIAS COM PRESENÇA**

        // Se não houver dias letivos no período, avisa o usuário e não gera o PDF
        if (finalDatesForExport.length === 0) {
            alert('Não há dias letivos no período selecionado para esta turma.');
            return;
        }

        // Preparar cabeçalhos da tabela usando as datas filtradas
        const head = [['Nº', 'Nome do Aluno', ...finalDatesForExport.map(d => formatarData(d).substring(0, 5))]]; // Ex: "22/07"

        // Preparar corpo da tabela e contar faltas
        let totalFaltasChamada = 0;
        const body = alunosDaTurmaAtivos.map((aluno, index) => { // Usar 'alunosDaTurmaAtivos' aqui
            const row = [index + 1, aluno.nome]; // Adicionado o número de contagem
            finalDatesForExport.forEach(date => {
                // NOVIDADE REQUERIDA: Marcar com '*' se a data for anterior à matrícula
                if (date < aluno.dataMatricula) {
                    row.push('*');
                } else {
                    // Se aluno.presencas[date] for true, é 'P'. Caso contrário (false, undefined, null), é 'F'.
                    const presence = aluno.presencas?.[date] === true ? 'P' : 'F';
                    row.push(presence);
                    // NOVIDADE REQUERIDA: A falta só é contada se for após a data de matrícula
                    if (presence === 'F') { // A condição `date >= aluno.dataMatricula` já é garantida pelo `else`
                        totalFaltasChamada++;
                    }
                }
            });
            return row;
        });

        autoTable(doc, {
            startY: yOffset,
            head: head,
            body: body,
            styles: { fontSize: 8, halign: 'center' },
            headStyles: { fillColor: [37, 99, 235], halign: 'center' },
            columnStyles: {
                1: { halign: 'left', cellWidth: 'auto' }, // ALINHA O NOME À ESQUERDA E AUTO-AJUSTA LARGURA
            },
            didDrawPage: function (data) {
                // Rodapé com número da página
                doc.setFontSize(8);
                doc.text('Página ' + doc.internal.getNumberOfPages(), pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            }
        });

        // Adicionar o total de faltas da chamada no final
        doc.setFontSize(10);
        const finalYForTotalFaltasChamada = doc.lastAutoTable.finalY + 10;
        doc.text(`Total de faltas registradas no período para a turma (após a matrícula): ${totalFaltasChamada}`, 14, finalYForTotalFaltasChamada);

        doc.save(`chamada_turma_${normalizeTurmaChar(turmaSelecionada)}_${dataInicio}_a_${dataFim}.pdf`);
        alert('Chamada por período exportada com sucesso!');

    }, [dataInicio, dataFim, turmaSelecionada, registros, formatarData, nonSchoolDays]);


    // NOVIDADE EXPORTAÇÃO GRÁFICO: Função para exportar o GraficoSemanal como PDF
    const exportGraficoSemanalPDF = useCallback(async () => {
        if (!mostrarGraficoSemanal) {
            alert('Por favor, visualize o "Gráfico Semanal" antes de tentar exportá-lo.');
            return;
        }
        if (!dataInicio || !dataFim) {
            alert('Selecione o período completo para exportar o gráfico.');
            return;
        }

        // NOVIDADE: Adicionado setTimeout para garantir que o gráfico esteja renderizado
        await new Promise(resolve => setTimeout(resolve, 300)); // Aumentado o atraso para 300ms

        const chartInstance = graficoSemanalRef.current;
        if (chartInstance && chartInstance.canvas) { // NOVIDADE: Acessa o canvas direto da instância do Chart.js
            try {
                const canvas = await html2canvas(chartInstance.canvas, {
                    scale: 2,
                    useCORS: true,
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.8);

                const pdf = new jsPDF('l', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                let yOffset = 10;
                const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`;
                const logoUrl = '/logo-escola.png';

                const img = new Image();
                img.src = logoUrl;
                img.crossOrigin = "Anonymous";

                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        const logoWidth = 20;
                        const logoHeight = (img.height * logoWidth) / img.width;
                        const xLogo = (pageWidth - logoWidth) / 2;
                        pdf.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight);
                        yOffset += logoHeight + 5;
                        pdf.setFontSize(9);
                        pdf.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
                        yOffset += 10;
                        resolve();
                    };
                    img.onerror = () => {
                        console.error("Erro ao carregar a logo para o PDF. Gerando PDF sem a imagem.");
                        pdf.setFontSize(12);
                        pdf.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
                        yOffset += 15;
                        resolve();
                    };
                });

                pdf.setFontSize(10);
                pdf.text(title, pageWidth / 2, yOffset, { align: 'center' });
                yOffset += 10;

                const imgProps= pdf.getImageProperties(imgData);
                const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;
                pdf.addImage(imgData, 'JPEG', 0, yOffset, pageWidth, pdfHeight);

                pdf.save(`${title.toLowerCase().replace(/ /g, '_').replace(/ /g, '_')}.pdf`);
                alert('Gráfico exportado com sucesso!');
            } catch (error) {
                console.error(`Erro ao exportar o gráfico ${chartId}:`, error);
                alert(`Erro ao exportar o gráfico. Verifique se ele está visível e tente novamente. Detalhes: ${error.message || error}`);
            }
        } else {
            alert('Gráfico Semanal não encontrado para exportação. Certifique-se de que ele está visível.');
        }
    }, [mostrarGraficoSemanal, dataInicio, dataFim, formatarData]); // Dependências da função

    // NOVIDADE FIRESTORE: editarAluno agora usa o ID do aluno
    const editarAluno = useCallback((alunoOriginal) => {
        // NOVIDADE ALERTA/CUIDADOS: Garante que 'alertasCuidados' seja passado para o estado de edição
        // NOVIDADE REQUERIDA: Garante que dataMatricula seja passada para o estado de edição
        setNovoAluno({ ...alunoOriginal, alertasCuidados: alunoOriginal.alertasCuidados || '', dataMatricula: alunoOriginal.dataMatricula || REPORT_START_DATE });
        // Usa o ID do Firestore como chave de edição se existir, senão o originalIndex
        setEditandoAluno(alunoOriginal.id || alunoOriginal.originalIndex);
    }, []);

    // NOVIDADE FIRESTORE: handleOpenObservationDropdown agora usa o ID do aluno
    const handleOpenObservationDropdown = useCallback((aluno, event) => { // Removido o 'index'
        if (isObservationDropdownOpen && currentAlunoForObservation && currentAlunoForObservation.id === aluno.id) { closeObservationDropdown(); return; }
        const rect = event.currentTarget.getBoundingClientRect();
        // Captura a posição do botão clicado
        setButtonPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
        });

        setCurrentAlunoForObservation(aluno);
        setIsObservationDropdownOpen(true); // Abre o dropdown

        const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
        const existingObservations = aluno.observacoes?.[chaveObservacao] || [];
        const existingObservationsArray = Array.isArray(existingObservations) ? existingObservations : (existingObservations ? [existingObservations] : []);

        const initialSet = new Set();
        let initialOtherText = '';

        existingObservationsArray.forEach(obs => {
            if (obs.startsWith("Outros: ")) {
                initialOtherText = obs.replace("Outros: ", "");
                initialSet.add("Outros");
            } else {
                initialSet.add(obs);
            }
        });
        setTempSelectedObservations(initialSet);
        setOtherObservationText(initialOtherText);
    }, [isObservationDropdownOpen, currentAlunoForObservation, dataSelecionada, closeObservationDropdown]);

    // NOVO useEffect para calcular a posição do dropdown APÓS ele ser renderizado
    useEffect(() => {
        if (isObservationDropdownOpen && dropdownRef.current) {
            const dropdownHeight = dropdownRef.current.offsetHeight;
            const topPosition = buttonPosition.top - dropdownHeight - 5; // Posição do botão - altura do dropdown - offset
            const finalTop = Math.max(topPosition, 5); // Garante que não saia do topo da tela

            // Atualiza a posição do botão para a posição final do dropdown
            // (Isso fará com que o dropdown seja renderizado na posição correta na próxima atualização do estado)
            setButtonPosition(prev => ({
                ...prev,
                top: finalTop,
                left: prev.left // Mantém o left original do botão
            }));
        }
    }, [isObservationDropdownOpen, buttonPosition.top, dropdownRef]); // Depende de isObservationDropdownOpen e do ref

    const handleCheckboxChange = useCallback((option) => {
        setTempSelectedObservations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(option)) {
                newSet.delete(option);
            } else {
                newSet.add(option);
            }
            return newSet;
        });
        if (option === "Outros" && tempSelectedObservations.has("Outros")) { setOtherObservationText(''); }
    }, [tempSelectedObservations]);

    const handleOtherTextChange = useCallback((e) => {
        const text = e.target.value;
        setOtherObservationText(text);
        if (text.trim() !== '' && !tempSelectedObservations.has("Outros")) {
            setTempSelectedObservations(prev => new Set(prev).add("Outros"));
        } else if (text.trim() === '' && tempSelectedObservations.has("Outros")) {
            const newSet = new Set(tempSelectedObservations);
            newSet.delete("Outros");
            setTempSelectedObservations(newSet);
        }
    }, [tempSelectedObservations]);

    const calculateCompleteReport = useCallback((aluno) => {
        if (!aluno) return null;
        const today = getTodayDateString();
        const startDate = REPORT_START_DATE; // Início do período de registro do sistema
        const matriculaDate = aluno.dataMatricula || REPORT_START_DATE; // Data de matrícula do aluno

        let faltasAluno = 0;
        const alunoJustificativas = aluno.justificativas || {};
        const justificativasNoPeriodo = []; // Justificativas no período selecionado (para exibição detalhada)
        const observacoesAlunoNoPeriodo = []; // Observações no período selecionado (para exibição detalhada)

        let countFaltasAnteriores = 0;

        // Contar todas as faltas do aluno (incluindo as anteriores à matrícula)
        Object.entries(alunoJustificativas).forEach(([chave, justificativa]) => {
            const partes = chave.split('_');
            const data = partes[2];
            const dateObj = new Date(data + 'T00:00:00');
            const dayOfWeek = dateObj.getDay();
            const isNonSchoolDayDate = nonSchoolDays.some(day => day.date === data);
            const isPresentForDate = aluno.presencas?.[data] === true; // Verifica o status de presença para a data

            // CORREÇÃO: A falta só é contada se a presença for false/undefined E a justificativa não for vazia
            // OU se for uma falta anterior à matrícula (que não tem status de presença)
            if (justificativa === "Falta anterior à matrícula") {
                faltasAluno++;
            } else if (!isPresentForDate && justificativa && justificativa !== "" && dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayDate) {
                faltasAluno++;
            }

            // NOVIDADE REQUERIDA: Para o relatório detalhado, consolida "Falta anterior à matrícula"
            if (justificativa === "Falta anterior à matrícula") {
                countFaltasAnteriores++;
            } else if (data >= matriculaDate && data <= today && justificativa && justificativa !== "" && (dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayDate)) {
                justificativasNoPeriodo.push({ data: formatarData(data), justificativa: justificativa.startsWith("Outros: ") ? justificativa.substring(8) : justificativa });
            }
        });

        // Adiciona a linha consolidada de faltas anteriores no início da lista
        if (countFaltasAnteriores > 0) {
            justificativasNoPeriodo.unshift({ // Use unshift to add to the beginning
                data: formatarData(matriculaDate), // Usa a data de matrícula como referência para a linha consolidada
                justificativa: `${countFaltasAnteriores} Faltas anterior à matrícula (até ${formatarData(new Date(new Date(matriculaDate).getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0])})`
            });
        }
        // Re-ordena para garantir que todas as entradas estejam cronológicas
        justificativasNoPeriodo.sort((a, b) => {
            // Converte as strings de data formatadas de volta para um formato comparável (YYYY-MM-DD) para ordenação
            const dateA = a.data.split('/').reverse().join('-');
            const dateB = b.data.split('/').reverse().join('-');
            return dateA.localeCompare(dateB);
        });


        // Contar observações (atrasos) para o relatório detalhado
        Object.entries(aluno.observacoes || {}).forEach(([chave, obsArray]) => {
            const partes = chave.split('_');
            const dataObs = partes[2];
            // Para o relatório detalhado, exibe apenas as observações a partir da data de matrícula
            if (dataObs >= matriculaDate && dataObs <= today && Array.isArray(obsArray) && obsArray.length > 0) {
                observacoesAlunoNoPeriodo.push({ data: formatarData(dataObs), observacoes: obsArray.join('; ') });
            }
        });

        // NOVIDADE REQUERIDA: Porcentagem do aluno baseada em 100 dias letivos fixos
        const porcentagemAluno = ((faltasAluno / 100) * 100).toFixed(2);

        let faltasTurma = 0;
        let totalAlunosNaTurma = new Set();
        let totalDiasLetivosTurmaParaPorcentagem = 0; // Base para a turma: número de alunos * 100 dias

        registros.filter(a => a.ativo).forEach(r => {
            // Apenas alunos na mesma turma e ativos
            if (normalizeTurmaChar(r.turma) === normalizeTurmaChar(aluno.turma)) {
                totalAlunosNaTurma.add(r.nome);
                totalDiasLetivosTurmaParaPorcentagem += 100; // Cada aluno ativo contribui com 100 dias para a base da turma

                const rJustificativas = r.justificativas || {};
                Object.entries(rJustificativas).forEach(([chave, justificativa]) => {
                    const partes = chave.split('_');
                    const data = partes[2];
                    const dateObj = new Date(data + 'T00:00:00');
                    const dayOfWeek = dateObj.getDay();
                    const isNonSchoolDayDate = nonSchoolDays.some(day => day.date === data);
                    const isPresentForDate = r.presencas?.[data] === true; // Verifica o status de presença para a data

                    // CORREÇÃO: A falta só é contada se a presença for false/undefined E a justificativa não for vazia
                    if (justificativa === "Falta anterior à matrícula") {
                        faltasTurma++;
                    } else if (!isPresentForDate && justificativa && justificativa !== "" && dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayDate) {
                        faltasTurma++;
                    }
                });
            }
        });
        const porcentagemTurma = totalDiasLetivosTurmaParaPorcentagem > 0 ? ((faltasTurma / totalDiasLetivosTurmaParaPorcentagem) * 100).toFixed(2) : 0;

        let faltasEscola = 0;
        let totalAlunosNaEscola = new Set();
        let totalDiasLetivosEscolaParaPorcentagem = 0; // Base para a escola: número de alunos * 100 dias

        registros.filter(a => a.ativo).forEach(r => {
            totalAlunosNaEscola.add(r.nome);
            totalDiasLetivosEscolaParaPorcentagem += 100; // Cada aluno ativo contribui com 100 dias para a base da escola

            const rJustificativas = r.justificativas || {};
            Object.entries(rJustificativas).forEach(([chave, justificativa]) => {
                const partes = chave.split('_');
                const data = partes[2];
                const dateObj = new Date(data + 'T00:00:00');
                const dayOfWeek = dateObj.getDay();
                const isNonSchoolDayDate = nonSchoolDays.some(day => day.date === data);
                const isPresentForDate = r.presencas?.[data] === true; // Verifica o status de presença para a data

                // CORREÇÃO: A falta só é contada se a presença for false/undefined E a justificativa não for vazia
                if (justificativa === "Falta anterior à matrícula") {
                    faltasEscola++;
                } else if (!isPresentForDate && justificativa && justificativa !== "" && dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayDate) {
                    faltasEscola++;
                }
            });
        });
        const porcentagemEscola = totalDiasLetivosEscolaParaPorcentagem > 0 ? ((faltasEscola / totalDiasLetivosEscolaParaPorcentagem) * 100).toFixed(2) : 0;

        return {
            aluno,
            periodo: `${formatarData(startDate)} a ${formatarData(today)}`,
            diasLetivosNoPeriodo: getActualSchoolDatesBetween(startDate, today, nonSchoolDays).length, // Este valor ainda é útil para saber quantos dias a escola esteve aberta no período total
            faltasAluno,
            porcentagemAluno,
            faltasTurma,
            porcentagemTurma,
            faltasEscola,
            porcentagemEscola,
            observacoesAlunoNoPeriodo,
            justificativasNoPeriodo,
            alertasCuidados: aluno.alertasCuidados || '' // NOVIDADE ALERTA/CUIDADOS: Passa o alerta/cuidado para o relatório
        };
    }, [registros, nonSchoolDays, getActualSchoolDatesBetween]);
    const handleAbrirRelatorioAluno = useCallback((aluno) => { const reportData = calculateCompleteReport(aluno); setCompleteReportData(reportData); setSelectedStudentForReport(aluno); setShowCompleteReportModal(true); }, [calculateCompleteReport]);
    const exportCompleteReportPDF = useCallback(() => {
        if (!completeReportData) { alert('Não há dados de relatório para exportar.'); return; }
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`;
        const logoUrl = '/logo-escola.png';
        let yOffset = 10;

        const addContentToDoc = () => {
            doc.setFontSize(14);
            doc.text(`Relatório do(a) Aluno(a): ${completeReportData.aluno.nome}`, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 10;
            // NOVIDADE FOTO: Adiciona a foto do aluno ao PDF se existir
            if (completeReportData.aluno.fotoUrl) {
                const img = new Image();
                img.src = completeReportData.aluno.fotoUrl; // Use logoUrl como fallback ou se for a mesma imagem
                img.crossOrigin = "Anonymous"; // Necessário para imagens de outros domínios
                img.onload = () => {
                    const imgWidth = 30; // Largura da imagem no PDF
                    const imgHeight = (img.height * imgWidth) / img.width;
                    const xImg = (pageWidth - imgWidth) / 2;
                    // MODIFICAÇÃO: Usar 'JPEG' com qualidade para a foto do aluno
                    doc.addImage(img, 'JPEG', xImg, yOffset, imgWidth, imgHeight, null, 'FAST');
                    yOffset += imgHeight + 5;
                    continuePdfContent();
                };
                img.onerror = () => {
                    console.error("Erro ao carregar a foto do aluno para o PDF. Continuar sem a imagem.");
                    continuePdfContent();
                };
            } else {
                continuePdfContent();
            }

            function continuePdfContent() {
                doc.setFontSize(10);
                doc.text(`Período do Relatório: ${completeReportData.periodo}`, 14, yOffset);
                yOffset += 7;
                doc.text(`Total de Faltas no Período: ${completeReportData.faltasAluno} (${completeReportData.porcentagemAluno}%)`, 14, yOffset);
                yOffset += 7;
                doc.text(`Turma: ${normalizeTurmaChar(completeReportData.aluno.turma)}`, 14, yOffset);
                yOffset += 7;
                doc.text(`Contato: ${completeReportData.aluno.contato}`, 14, yOffset);
                yOffset += 7;
                doc.text(`Responsável: ${completeReportData.aluno.responsavel}`, 14, yOffset);
                // NOVIDADE ALERTA/CUIDADOS: Adiciona o Alerta/Cuidados no PDF
                if (completeReportData.alertasCuidados) {
                    yOffset += 10; // Espaço antes da nova seção
                    doc.setFontSize(12);
                    doc.text('Alertas / Cuidados:', 14, yOffset);
                    yOffset += 5;
                    doc.setFontSize(10);
                    const splitText = doc.splitTextToSize(completeReportData.alertasCuidados, pageWidth - 28);
                    doc.text(splitText, 14, yOffset);
                    yOffset += (splitText.length * 5) + 5;
                }
                yOffset += 10;
                doc.setFontSize(12);
                doc.text('Métricas Comparativas:', 14, yOffset);
                yOffset += 7;
                doc.setFontSize(10);
                doc.text(`Percentual de Faltas do(a) Aluno(a): ${completeReportData.porcentagemAluno}%`, 14, yOffset);
                yOffset += 7;
                doc.text(`Média de Faltas da Turma: ${completeReportData.porcentagemTurma}%`, 14, yOffset);
                yOffset += 7;
                doc.text(`Média de Faltas da Escola: ${completeReportData.porcentagemEscola}%`, 14, yOffset);
                yOffset += 10;
                let finalY = yOffset;
                if (completeReportData.justificativasNoPeriodo.length > 0) {
                    doc.setFontSize(12);
                    doc.text('Justificativas de Falta no Período:', 14, finalY);
                    finalY += 5;
                    const jusBody = completeReportData.justificativasNoPeriodo.map(jus => [jus.data, jus.justificativa]);
                    autoTable(doc, { startY: finalY, head: [['Data', 'Justificativa']], body: jusBody, styles: { fontSize: 8, halign: 'left' }, headStyles: { fillColor: [37, 99, 235] } });
                    finalY = pdf.lastAutoTable.finalY;
                }
                if (completeReportData.observacoesAlunoNoPeriodo.length > 0) {
                    doc.setFontSize(12);
                    doc.text('Observações no Período:', 14, finalY + 10);
                    finalY += 15;
                    const obsBody = completeReportData.observacoesAlunoNoPeriodo.map(obs => [obs.data, obs.observacoes]);
                    autoTable(doc, { startY: finalY, head: [['Data', 'Observações']], body: obsBody, styles: { fontSize: 8, halign: 'left' }, headStyles: { fillColor: [37, 99, 235] } });
                }
                doc.save(`relatorio_completo_${completeReportData.aluno.nome.replace(/ /g, '_')}.pdf`);
            }
        };
        const img = new Image(); img.src = logoUrl; img.crossOrigin = "Anonymous"; img.onload = () => { const logoWidth = 20; const logoHeight = (img.height * logoWidth) / img.width; const xLogo = (pageWidth - logoWidth) / 2; doc.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight); yOffset += logoHeight + 5; doc.setFontSize(9); doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' }); yOffset += 10; addContentToDoc(); }; img.onerror = () => { console.error("Erro ao carregar a logo. Gerando PDF sem a imagem."); doc.setFontSize(12); doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' }); yOffset += 15; addContentToDoc(); };
    }, [completeReportData, getActualSchoolDatesBetween, nonSchoolDays]);
    const handleAbrirModalRecomposicao = useCallback((aluno) => { setAlunoParaRecompor(aluno); setIsRecomporModalOpen(true); setRecomporDataInicio(''); setRecomporDataFim(''); }, []);
    const handleConfirmarRecomposicao = useCallback(async () => { // Adicionado async
        if (!alunoParaRecompor || !recomporDataInicio || !recomporDataFim) {
            alert("Por favor, selecione o período completo para a recomposição.");
            return;
        }
        // NOVIDADE REQUERIDA: Não permite recomposição em datas anteriores à matrícula
        if (recomporDataInicio < alunoParaRecompor.dataMatricula) {
            alert("Não é possível recompor faltas para datas anteriores à matrícula do aluno.");
            return;
        }

        if (window.confirm(`Tem certeza que deseja limpar as justificativas de ${alunoParaRecompor.nome} no período de ${formatarData(recomporDataInicio)} a ${formatarData(recomporDataFim)}?`)) {
            try {
                const alunoDocRef = doc(db, 'alunos', alunoParaRecompor.id);
                const alunoSnapshot = await getDoc(alunoDocRef); // Obter os dados atuais do aluno
                if (!alunoSnapshot.exists()) {
                    console.error("Aluno não encontrado para recomposição.");
                    alert("Erro: Aluno não encontrado.");
                    return;
                }
                const currentJustificativas = alunoSnapshot.data().justificativas || {};
                const novasJustificativas = { ...currentJustificativas };
                const currentPresencas = alunoSnapshot.data().presencas || {};
                const novasPresencas = { ...currentPresencas };


                Object.keys(novasJustificativas).forEach(chave => {
                    const dataDaFalta = chave.split('_')[2];
                    const dateObj = new Date(dataDaFalta + 'T00:00:00');
                    const dayOfWeek = dateObj.getDay();
                    const isNonSchoolDayDate = nonSchoolDays.some(day => day.date === dataDaFalta);

                    // Só remove a justificativa se o dia for letivo (não fim de semana e não dia não letivo)
                    // E se a data for igual ou posterior à data de matrícula
                    if (dataDaFalta >= recomporDataInicio && dataDaFalta <= recomporDataFim && dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayDate && dataDaFalta >= alunoParaRecompor.dataMatricula) {
                        delete novasJustificativas[chave];
                        // Se a justificativa for removida, a presença para aquele dia deve ser marcada como 'true' (presente)
                        novasPresencas[dataDaFalta] = true;
                    }
                });

                await updateDoc(alunoDocRef, { justificativas: novasJustificativas, presencas: novasPresencas });
                alert("Justificativas do período foram limpas no Firestore com sucesso!");
                // A atualização do estado 'registros' será feita automaticamente pelo onSnapshot listener
                setIsRecomporModalOpen(false);
                setAlunoParaRecompor(null);
            } catch (error) {
                console.error("Erro ao recompor faltas no Firestore:", error);
                alert("Erro ao recompor faltas.");
            }
        }
    }, [alunoParaRecompor, recomporDataInicio, recomporDataFim, nonSchoolDays]);

    const handleBuscaInformativa = (e) => {
        const termo = e.target.value.toLowerCase();
        setTermoBuscaInformativa(termo);
        if (termo.length >= 3) {
            const alunoEncontrado = registros.find(aluno =>
                aluno.nome.toLowerCase().includes(termo)
            );
            setAlunoInfoEncontrado(alunoEncontrado);
        } else {
            setAlunoInfoEncontrado(null);
        }
    };

    // NOVIDADE REQUERIDA: Lógica para exportar relatório de observações
    const exportarRelatorioObservacoesPDF = useCallback(async () => {
        if (!dataInicio || !dataFim) {
            alert('Selecione o período completo para exportar as observações.');
            return;
        }
        if (selectedObservationTypesToExport.size === 0) {
            alert('Selecione pelo menos um tipo de observação para exportar.');
            return;
        }
        if (exportObservationScope === 'turma' && !turmaSelecionada) {
            alert('Selecione uma turma para exportar observações por turma.');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`;
        const logoUrl = '/logo-escola.png';
        let yOffset = 10;

        const addContentToDoc = () => {
            doc.setFontSize(10);
            let reportTitle = `Relatório de Observações (${formatarData(dataInicio)} a ${formatarData(dataFim)})`;
            if (exportObservationScope === 'turma') {
                reportTitle += ` - Turma: ${turmaSelecionada}`;
            } else {
                reportTitle += ' - TODAS AS TURMAS';
            }
            doc.text(reportTitle, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 10;

            const observationEntries = [];
            const turmasDoUsuario = turmasPermitidas();

            registros.filter(a => a.ativo).forEach(aluno => {
                const turmaAlunoNormalizada = normalizeTurmaChar(aluno.turma);

                const shouldIncludeStudent =
                    (exportObservationScope === 'turma' && turmaAlunoNormalizada === normalizeTurmaChar(turmaSelecionada) && turmasDoUsuario.includes(turmaAlunoNormalizada)) ||
                    (exportObservationScope === 'allTurmas' && turmasDoUsuario.includes(turmaAlunoNormalizada));

                if (shouldIncludeStudent && aluno.observacoes) {
                    Object.entries(aluno.observacoes).forEach(([chave, obsArray]) => {
                        const dataObs = chave.split('_')[2];
                        const dateObj = new Date(dataObs + 'T00:00:00');
                        const dayOfWeek = dateObj.getDay();
                        const isNonSchoolDayDate = nonSchoolDays.some(day => day.date === dataObs);

                        // NOVIDADE REQUERIDA: Apenas inclui observações de dias letivos a partir da data de matrícula
                        if (dataObs && dataObs >= dataInicio && dataObs <= dataFim && dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchoolDayDate && dataObs >= aluno.dataMatricula) {
                            // Filtra as observações com base nos tipos selecionados
                            const filteredObsForEntry = obsArray.filter(obs => {
                                if (selectedObservationTypesToExport.has("Outros")) {
                                    if (obs.startsWith("Outros: ")) return true;
                                }
                                return selectedObservationTypesToExport.has(obs);
                            });

                            if (filteredObsForEntry.length > 0) {
                                observationEntries.push({
                                    nome: aluno.nome,
                                    turma: turmaAlunoNormalizada, // Usar turmaNormalizada para consistência
                                    data: dataObs,
                                    observacao: filteredObsForEntry.join('; '), // Junta as observações filtradas
                                    monitor: aluno.monitor || '' // Monitor associado ao aluno
                                });
                            }
                        }
                    });
                }
            });

            // Classificar as entradas de observação
            observationEntries.sort((a, b) => {
                if (a.data < b.data) return -1;
                if (a.data > b.data) return 1;
                if (a.turma < b.turma) return -1;
                if (a.turma > b.turma) return 1;
                return a.nome.localeCompare(b.nome);
            });

            const formattedForTable = observationEntries.map((entry, index) => [
                index + 1,
                entry.nome,
                entry.turma,
                formatarData(entry.data),
                entry.observacao,
                entry.monitor
            ]);

            autoTable(doc, {
                startY: yOffset,
                head: [['Nº', 'Nome do Aluno', 'Turma', 'Data', 'Observação', 'Monitor(a)']],
                body: formattedForTable,
                styles: { fontSize: 8, halign: 'center' },
                headStyles: { fillColor: [37, 99, 235], halign: 'center' },
                columnStyles: {
                    1: { halign: 'left', cellWidth: 'auto' }, // ALINHA O NOME À ESQUERDA E AUTO-AJUSTA LARGURA
                },
            });

            // Adicionar o total de observações no final
            doc.setFontSize(10);
            const finalYForTotalObs = doc.lastAutoTable.finalY + 10;
            doc.text(`Total de observações no período: ${observationEntries.length}`, 14, finalYForTotalObs);

            const fileName = `observacoes_relatorio_${exportObservationScope === 'turma' ? normalizeTurmaChar(turmaSelecionada) : 'todas_turmas'}_${dataInicio}_a_${dataFim}.pdf`;
            doc.save(fileName);
            setShowObservationExportModal(false); // Fecha o modal após a exportação
        };

        const img = new Image();
        img.src = logoUrl;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const logoWidth = 20;
            const logoHeight = (img.height * logoWidth) / img.width;
            const xLogo = (pageWidth - logoWidth) / 2;
            doc.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight);
            yOffset += logoHeight + 5;
            doc.setFontSize(9);
            doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 10;
            addContentToDoc();
        };

        img.onerror = () => {
            console.error("Erro ao carregar a logo. Gerando PDF sem a imagem.");
            doc.setFontSize(12);
            doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
            yOffset += 15;
            addContentToDoc();
        };
    }, [dataInicio, dataFim, selectedObservationTypesToExport, exportObservationScope, turmaSelecionada, registros, turmasPermitidas, nonSchoolDays]);

    // Lógica para fechar o modal de observação ao clicar fora
    useEffect(() => {
        const handleClickOutsideObservationModal = (event) => {
            if (observationExportModalRef.current && !observationExportModalRef.current.contains(event.target) && !event.target.closest('.export-observation-button')) {
                setShowObservationExportModal(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutsideObservationModal);
        return () => document.removeEventListener("mousedown", handleClickOutsideObservationModal);
    }, [observationExportModalRef]);

    const handleObservationTypeCheckboxChange = useCallback((type) => {
        setSelectedObservationTypesToExport(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    }, []);

    // NOVIDADE REQUERIDA: Funções para gerenciar dias não letivos
    const handleAddNonSchoolDay = useCallback(async () => {
        if (!newNonSchoolDayDate && !newNonSchoolDayEndDate) {
            alert('Por favor, selecione uma data de início ou um período completo.');
            return;
        }
        if (!newNonSchoolDayReason.trim()) {
            alert('Por favor, insira um motivo para o(s) dia(s) não letivo(s).');
            return;
        }

        const batch = writeBatch(db);
        const nonSchoolDaysCollectionRef = collection(db, 'nonSchoolDays');

        if (newNonSchoolDayDate && !newNonSchoolDayEndDate) { // Single day
            const existingDay = nonSchoolDays.find(d => d.date === newNonSchoolDayDate);
            if (existingDay) {
                alert(`O dia ${formatarData(newNonSchoolDayDate)} já está registrado como não letivo.`);
                return;
            }
            const docRef = doc(nonSchoolDaysCollectionRef);
            batch.set(docRef, { date: newNonSchoolDayDate, reason: newNonSchoolDayReason.trim() });
        } else if (newNonSchoolDayDate && newNonSchoolDayEndDate) { // Date range
            let currentDate = new Date(newNonSchoolDayDate + 'T00:00:00');
            const endDate = new Date(newNonSchoolDayEndDate + 'T00:00:00');

            if (currentDate > endDate) {
                alert('A data de início não pode ser posterior à data de fim.');
                return;
            }

            let daysAdded = 0;
            while (currentDate <= endDate) {
                const dateString = currentDate.toISOString().split('T')[0];
                const existingDay = nonSchoolDays.find(d => d.date === dateString);
                if (!existingDay) {
                    const docRef = doc(nonSchoolDaysCollectionRef);
                    batch.set(docRef, { date: dateString, reason: newNonSchoolDayReason.trim() });
                    daysAdded++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            if (daysAdded === 0) {
                alert('Todos os dias no período selecionado já estão registrados como não letivos.');
                return;
            }
        } else {
            alert('Por favor, insira uma data de início.');
            return;
        }

        try {
            await batch.commit();
            alert('Dia(s) não letivo(s) adicionado(s) com sucesso!');
            setNewNonSchoolDayDate('');
            setNewNonSchoolDayEndDate('');
            setNewNonSchoolDayReason('');
        } catch (error) {
            console.error("Erro ao adicionar dia não letivo:", error);
            alert("Erro ao adicionar dia não letivo.");
        }
    }, [newNonSchoolDayDate, newNonSchoolDayEndDate, newNonSchoolDayReason, nonSchoolDays]);

    const handleRemoveNonSchoolDay = useCallback(async (id, date) => {
        if (window.confirm(`Tem certeza que deseja remover o dia não letivo ${formatarData(date)}?`)) {
            try {
                await deleteDoc(doc(db, 'nonSchoolDays', id));
                alert('Dia não letivo removido com sucesso!');
            } catch (error) {
                console.error("Erro ao remover dia não letivo:", error);
                alert("Erro ao remover dia não letivo.");
            }
        }
    }, []);

    // Determinar se a data selecionada é uma data futura
    const todayString = getTodayDateString();
    const isFutureDate = dataSelecionada > todayString;
    const selectedDateObj = new Date(dataSelecionada + 'T00:00:00');
    const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6; // 0 = Sunday, 6 = Saturday
    const isSelectedDateNonSchool = nonSchoolDays.some(day => day.date === dataSelecionada);

    // NOVIDADE REQUERIDA: Função para gerar e baixar múltiplos PDFs em um arquivo ZIP
    const handleDownloadAllReportsAsZip = useCallback(async (turmasToDownload) => {
        if (turmasToDownload.length === 0) {
            alert("Nenhuma turma selecionada para download.");
            return;
        }
        setIsDownloading(true);
        const zip = new JSZip();

        try {
            for (const turma of turmasToDownload) {
                const turmaFolder = zip.folder(`Relatorios_${turma}`);
                // Filtra os alunos ativos que pertencem à turma atual
                const alunosDaTurma = registros.filter(aluno =>
                    aluno.ativo && normalizeTurmaChar(aluno.turma) === normalizeTurmaChar(turma)
                );

                for (const aluno of alunosDaTurma) {
                    // Re-calcula o relatório para cada aluno para garantir os dados mais recentes
                    const reportData = calculateCompleteReport(aluno);
                    if (reportData) {
                        const pdf = new jsPDF();
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        let yOffset = 10;
                        const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`;
                        const logoUrl = '/logo-escola.png';

                        // Função para gerar o conteúdo do PDF (com logo e nome da escola)
                        const generatePdfHeader = async () => {
                            return new Promise(resolve => {
                                const img = new Image();
                                img.src = logoUrl;
                                img.crossOrigin = "Anonymous";
                                img.onload = () => {
                                    const logoWidth = 20;
                                    const logoHeight = (img.height * logoWidth) / img.width;
                                    const xLogo = (pageWidth - logoWidth) / 2;
                                    pdf.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight);
                                    yOffset += logoHeight + 5;
                                    pdf.setFontSize(9);
                                    pdf.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
                                    yOffset += 10;
                                    resolve();
                                };
                                img.onerror = () => {
                                    console.error("Erro ao carregar a logo para o PDF. Gerando PDF sem a imagem.");
                                    pdf.setFontSize(12);
                                    pdf.text(schoolName, pageWidth / 2, yOffset, { align: 'center' });
                                    yOffset += 15;
                                    resolve();
                                };
                            });
                        };

                        await generatePdfHeader();

                        // Adiciona o conteúdo do relatório
                        pdf.setFontSize(14);
                        pdf.text(`Relatório do(a) Aluno(a): ${aluno.nome}`, pageWidth / 2, yOffset, { align: 'center' });
                        yOffset += 10;
                        if (aluno.fotoUrl) {
                            const img = new Image();
                            img.src = aluno.fotoUrl;
                            img.crossOrigin = "Anonymous";
                            await new Promise(resolve => {
                                img.onload = () => {
                                    const imgWidth = 30;
                                    const imgHeight = (img.height * imgWidth) / img.width;
                                    const xImg = (pageWidth - imgWidth) / 2;
                                    pdf.addImage(img, 'JPEG', xImg, yOffset, imgWidth, imgHeight, null, 'FAST');
                                    yOffset += imgHeight + 5;
                                    resolve();
                                };
                                img.onerror = resolve; // Continue even if image fails
                            });
                        }
                        yOffset += 5; // Adiciona um pequeno espaço após a foto
                        pdf.setFontSize(10);
                        pdf.text(`Período do Relatório: ${reportData.periodo}`, 14, yOffset);
                        yOffset += 7;
                        pdf.text(`Total de Faltas no Período: ${reportData.faltasAluno} (${reportData.porcentagemAluno}%)`, 14, yOffset);
                        yOffset += 7;
                        pdf.text(`Turma: ${normalizeTurmaChar(reportData.aluno.turma)}`, 14, yOffset);
                        yOffset += 7;
                        pdf.text(`Contato: ${reportData.aluno.contato}`, 14, yOffset);
                        yOffset += 7;
                        pdf.text(`Responsável: ${reportData.aluno.responsavel}`, 14, yOffset);
                        if (reportData.alertasCuidados) {
                            yOffset += 10;
                            pdf.setFontSize(12);
                            pdf.text('Alertas / Cuidados:', 14, yOffset);
                            yOffset += 5;
                            pdf.setFontSize(10);
                            const splitText = pdf.splitTextToSize(reportData.alertasCuidados, pageWidth - 28);
                            doc.text(splitText, 14, yOffset);
                            yOffset += (splitText.length * 5) + 5;
                        }
                        yOffset += 10;
                        pdf.setFontSize(12);
                        doc.text('Métricas Comparativas:', 14, yOffset);
                        yOffset += 7;
                        pdf.setFontSize(10);
                        doc.text(`Percentual de Faltas do(a) Aluno(a): ${reportData.porcentagemAluno}%`, 14, yOffset);
                        yOffset += 7;
                        doc.text(`Média de Faltas da Turma: ${reportData.porcentagemTurma}%`, 14, yOffset);
                        yOffset += 7;
                        doc.text(`Média de Faltas da Escola: ${reportData.porcentagemEscola}%`, 14, yOffset);
                        yOffset += 10;
                        let finalY = yOffset;
                        if (reportData.justificativasNoPeriodo.length > 0) {
                            doc.setFontSize(12);
                            doc.text('Justificativas de Falta no Período:', 14, finalY);
                            finalY += 5;
                            const jusBody = reportData.justificativasNoPeriodo.map(jus => [jus.data, jus.justificativa]);
                            autoTable(doc, { startY: finalY, head: [['Data', 'Justificativa']], body: jusBody, styles: { fontSize: 8, halign: 'left' }, headStyles: { fillColor: [37, 99, 235] } });
                            finalY = pdf.lastAutoTable.finalY;
                        }
                        if (reportData.observacoesAlunoNoPeriodo.length > 0) {
                            doc.setFontSize(12);
                            doc.text('Observações no Período:', 14, finalY + 10);
                            finalY += 15;
                            const obsBody = reportData.observacoesAlunoNoPeriodo.map(obs => [obs.data, obs.observacoes]);
                            autoTable(doc, { startY: finalY, head: [['Data', 'Observações']], body: obsBody, styles: { fontSize: 8, halign: 'left' }, headStyles: { fillColor: [37, 99, 235] } });
                        }

                        const pdfData = pdf.output('blob'); // Salva o PDF como um Blob
                        const fileName = `Relatorio_${aluno.nome.replace(/ /g, '_')}.pdf`;
                        turmaFolder.file(fileName, pdfData); // Adiciona o PDF ao arquivo ZIP
                    }
                }
            }

            const zipFileName = `Relatorios_alunos_${dataInicio}_a_${dataFim}.zip`;
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, zipFileName);

            alert('Download concluído com sucesso!');
        } catch (error) {
            console.error("Erro ao gerar o arquivo ZIP:", error);
            alert("Erro ao gerar o arquivo ZIP. Verifique o console para mais detalhes.");
        } finally {
            setIsDownloading(false);
            setShowZipModal(false); // Fecha o modal após a conclusão
        }

    }, [registros, dataInicio, dataFim, nonSchoolDays, calculateCompleteReport, turmasPermitidas]);


    return (
        <div className="p-8 font-inter w-full max-w-4xl mx-auto">
            <div ref={schoolHeaderRef} id="school-header" className="flex flex-col items-center mb-5">
                <img src="/logo-escola.png" alt="Logo da Escola" className="w-16 mb-2 rounded-full" />
                <h2 className="text-xl font-bold text-center">
                    ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA
                </h2>
            </div>

            <div className="text-right mb-5">
                <span className="mr-2">Usuário logado: <strong className="font-semibold">{usuarioLogado}</strong> ({tipoUsuario})</span>
                <button onClick={() => setTemaEscuro(!temaEscuro)} className="ml-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors duration-200">
                    {temaEscuro ? '☀ Claro' : '🌙 Escuro'}
                </button>
                <button onClick={onLogout} className="ml-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200">
                    Sair
                </button>
            </div>

            <div className="mt-5 mb-5 flex items-center gap-4">
                <button onClick={() => setMostrarFormularioCadastro(!mostrarFormularioCadastro)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shadow-md">
                    {mostrarFormularioCadastro ? '➖ Ocultar Cadastro de Aluno(a)' : '➕ Cadastrar Novo Aluno(a)'}
                </button>
            </div>

            {mostrarFormularioCadastro && (
                <div className="mt-8 border border-gray-300 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                    <h4 className="text-xl font-semibold mb-4">Cadastrar Novo Aluno(a)</h4>
                    <form onSubmit={handleCadastrarAluno}>
                        <input type="text" placeholder="Nome do(a) Aluno(a)" value={alunoParaCadastro.nome} onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, nome: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                        <select value={alunoParaCadastro.turma} onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, turma: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                            <option value="">Selecione a Turma</option>
                            {turmasDisponiveis.map(t => (<option key={t.name} value={t.name}>{t.name} ({t.nivel})</option>))}
                        </select>
                        <input type="text" placeholder="Contato (WhatsApp)" value={alunoParaCadastro.contato} onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, contato: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                        <input type="text" placeholder="Nome do Responsável" value={alunoParaCadastro.responsavel} onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, responsavel: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                        <select value={alunoParaCadastro.monitor} onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, monitor: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                            <option value="">Selecione o(a) Monitor(a)</option>
                            {monitoresDisponiveis.map(m => (<option key={m.name} value={m.name}>{m.name}</option>))}
                        </select>
                        {/* NOVIDADE REQUERIDA: Campo Data de Matrícula */}
                        <div className="mb-3">
                            <label htmlFor="data-matricula" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Data de Matrícula:
                            </label>
                            <input
                                id="data-matricula"
                                type="date"
                                value={alunoParaCadastro.dataMatricula}
                                onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, dataMatricula: e.target.value })}
                                className="block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                max={getTodayDateString()} // Não permite data de matrícula futura
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="faltas-anteriores" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Faltas Anteriores à Matrícula (no período de registro do sistema):
                            </label>
                            <input
                                id="faltas-anteriores"
                                type="number"
                                placeholder="0"
                                value={alunoParaCadastro.faltasAnteriores}
                                onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, faltasAnteriores: e.target.value })}
                                className="block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                min="0"
                            />
                        </div>
                        {/* NOVIDADE ALERTA/CUIDADOS: Campo para Alertas/Cuidados no Cadastro */}
                        <div className="mb-3">
                            <label htmlFor="alertas-cuidados" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Alertas / Cuidados (Ex: "Alergia a lactose", "TDAH", "Asma"):
                            </label>
                            <textarea
                                id="alertas-cuidados"
                                placeholder="Adicione informações importantes sobre o aluno (alergias, condições médicas, etc.)"
                                value={alunoParaCadastro.alertasCuidados}
                                onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, alertasCuidados: e.target.value })}
                                rows="3"
                                className="block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            ></textarea>
                        </div>
                        {/* FIM NOVIDADE ALERTA/CUIDADOS */}
                        {/* NOVIDADE FOTO: Removido o campo URL manual aqui, pois o CameraModal fará o upload */}
                        <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 shadow-md">
                            ➕ Cadastrar Aluno(a)
                        </button>
                    </form>
                </div>
            )}

            {/* NOVIDADE REQUERIDA: Botão para alternar a visibilidade da seção de dias não letivos */}
            {tipoUsuario === 'gestor' && (
                <div className="mt-5 mb-5 flex items-center gap-4">
                    <button
                        onClick={() => setMostrarGerenciarDiasNaoLetivos(!mostrarGerenciarDiasNaoLetivos)}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 shadow-md"
                    >
                        {mostrarGerenciarDiasNaoLetivos ? '➖ Ocultar Gerenciar Dias Não Letivos' : '➕ Gerenciar Dias Não Letivos'}
                    </button>
                </div>
            )}

            {/* NOVIDADE REQUERIDA: Seção para Gestores gerenciarem dias não letivos (condicional) */}
            {tipoUsuario === 'gestor' && mostrarGerenciarDiasNaoLetivos && (
                <div className="mt-8 border border-gray-300 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                    <h4 className="text-xl font-semibold mb-4">Gerenciar Dias Não Letivos</h4>
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div>
                            <label htmlFor="non-school-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data (Início)</label>
                            <input
                                type="date"
                                id="non-school-date"
                                value={newNonSchoolDayDate}
                                onChange={e => setNewNonSchoolDayDate(e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label htmlFor="non-school-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data (Fim, opcional)</label>
                            <input
                                type="date"
                                id="non-school-end-date"
                                value={newNonSchoolDayEndDate}
                                onChange={e => setNewNonSchoolDayEndDate(e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            />
                        </div>
                        <div className="flex-grow">
                            <label htmlFor="non-school-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo</label>
                            <input
                                type="text"
                                id="non-school-reason"
                                placeholder="Ex: Feriado, Recesso, Greve"
                                value={newNonSchoolDayReason}
                                onChange={e => setNewNonSchoolDayReason(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                            />
                        </div>
                        <button onClick={handleAddNonSchoolDay} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 shadow-md self-end">
                            Adicionar
                        </button>
                    </div>

                    <h5 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">Dias Não Letivos Registrados:</h5>
                    {nonSchoolDays.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">Nenhum dia não letivo registrado.</p>
                    ) : (
                        <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto pr-2">
                            {nonSchoolDays.sort((a,b) => a.date.localeCompare(b.date)).map(day => (
                                <li key={day.id} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                                    <span>{formatarData(day.date)} - {day.reason}</span>
                                    <button
                                        onClick={() => handleRemoveNonSchoolDay(day.id, day.date)}
                                        className="ml-2 px-2 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors duration-200 shadow-sm"
                                    >
                                        Remover
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {/* Fim da seção de dias não letivos */}

            <h3 className="text-xl font-semibold mb-2 mt-8">Data da chamada:</h3>
            <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
            {(isWeekend || isSelectedDateNonSchool) && (
                <p className="text-red-500 text-sm mt-1">
                    ⚠️ Esta data é um {isWeekend ? 'fim de semana' : 'dia não letivo'} e não será considerada para a chamada.
                </p>
            )}

            <h3 className="text-xl font-semibold mt-5 mb-2">Selecionar Turma:</h3>
            <select value={turmaSelecionada} onChange={e => setTurmaSelecionada(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600">
                <option value="">Selecione uma Turma</option>
                {turmasPermitidas().map(turma => (
                    <option key={turma} value={turma}>
                        {turmasDisponiveis.find(t => normalizeTurmaChar(t.name) === turma)?.name || turma}
                    </option>
                ))}
            </select>

            {/* Busca da tabela principal (filtra a exibição na tabela) */}
            <h3 className="text-xl font-semibold mt-5 mb-2">Filtrar Aluno(a) na Tabela:</h3>
            <input
                type="text"
                placeholder="Digite o nome do(a) aluno(a) para filtrar a tabela..."
                value={termoBuscaTabela}
                onChange={e => setTermoBuscaTabela(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />

            {/* Novo mecanismo de busca informativa (não altera a tabela nem a exclusão) */}
            <div className="mt-8 border border-gray-300 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                <h3 className="text-xl font-semibold mb-4">Consultar Turma do Aluno(a)</h3>
                <input
                    type="text"
                    placeholder="Digite o nome do(a) aluno(a) para consultar a turma..."
                    value={termoBuscaInformativa}
                    onChange={handleBuscaInformativa}
                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                {termoBuscaInformativa.length >= 3 && alunoInfoEncontrado && (
                    <div className="flex items-center mt-4 text-lg text-gray-800 dark:text-gray-200"> {/* Adicionado flex container */}
                        {alunoInfoEncontrado.fotoUrl && ( // NOVIDADE CONSULTA: Exibe a foto se existir
                            <img
                                src={alunoInfoEncontrado.fotoUrl}
                                alt={`Foto de ${alunoInfoEncontrado.nome}`}
                                className="w-12 h-12 rounded-full object-cover mr-3 border border-gray-300"
                            />
                        )}
                        <p>
                            <strong>{alunoInfoEncontrado.nome}</strong> pertence à turma <strong>{normalizeTurmaChar(alunoInfoEncontrado.turma)}</strong>.
                        </p>
                    </div>
                )}
                {termoBuscaInformativa.length >= 3 && !alunoInfoEncontrado && (
                    <p className="mt-4 text-red-500">Aluno(a) não encontrado(a).</p>
                )}
                {termoBuscaInformativa.length < 3 && (
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Digite pelo menos 3 caracteres para pesquisar.</p>
                )}
            </div>
            {/* Fim do novo mecanismo de busca informativa */}

            {tipoUsuario === 'gestor' && ( // Apenas gestores podem ver o botão de download ZIP
                <div className="mt-5 mb-5 flex flex-wrap gap-3 items-center">
                    <button onClick={() => setShowZipModal(true)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-200 shadow-md" disabled={isDownloading}>
                        {isDownloading ? 'Baixando...' : '🗃️ Baixar Relatórios em ZIP'}
                    </button>
                </div>
            )}


            <div className="mt-5 flex flex-wrap gap-3 items-center">
                <button onClick={justificarTodos} className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 shadow-md">
                    ✅ Justificar Todos
                </button>
                {tipoUsuario === 'gestor' && (<button onClick={reiniciarAlertas} className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors duration-200 shadow-md">
                    🔄 Reiniciar
                </button>)}
                <span className="ml-5 font-semibold">📆 Exportar período:</span>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="ml-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />

                {/* MODIFICAÇÃO AQUI: Botão PDF que abre as opções */}
                <div className="relative inline-block text-left">
                    <button
                        onClick={() => setShowExportOptions(!showExportOptions)}
                        className="ml-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md"
                    >
                        🖨 PDF
                    </button>

                    {/* Opções de exportação que aparecem ao clicar no PDF */}
                    {showExportOptions && (
                        <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-700" role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
                            <div className="py-1" role="none">
                                <button
                                    onClick={() => exportarPeriodo(false)} // Exporta apenas a turma selecionada
                                    className="text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600"
                                    role="menuitem"
                                >
                                    Imprimir Faltas da Turma
                                </button>
                                <button
                                    onClick={() => exportarPeriodo(true)} // Exporta todas as turmas
                                    className="text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600"
                                    role="menuitem"
                                >
                                    Imprimir Faltas de Todas as Turmas
                                </button>
                                {/* NOVIDADE BOTÃO: Exportar Chamada por Período */}
                                <button
                                    onClick={exportarChamadaPeriodoPDF}
                                    className="text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600"
                                    role="menuitem"
                                >
                                    Imprimir Chamada por Período
                                </button>
                                {/* NOVIDADE REQUERIDA: Botão para abrir o modal de exportação de observações */}
                                <button
                                    onClick={() => { setShowObservationExportModal(true); setShowExportOptions(false); }}
                                    className="export-observation-button text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600"
                                    role="menuitem"
                                >
                                    Imprimir Relação de Observações
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* NOVIDADE GRÁFICO: Botões de controle de visibilidade e exportação separados */}
            <div className="mt-5 flex flex-wrap gap-3 items-center">
                <button onClick={() => setMostrarGraficoFaltas(!mostrarGraficoFaltas)} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200 shadow-md">
                    {mostrarGraficoFaltas ? '➖ Ocultar Gráfico de Faltas por Aluno' : '➕ Mostrar Gráfico de Faltas por Aluno'}
                </button>
                <button onClick={() => setMostrarGraficoSemanal(!mostrarGraficoSemanal)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shadow-md">
                    {mostrarGraficoSemanal ? '➖ Ocultar Gráfico Semanal' : '➕ Mostrar Gráfico Semanal'}
                </button>
                {mostrarGraficoSemanal && ( // NOVIDADE EXPORTAÇÃO GRÁFICO: Botão de exportação para GraficoSemanal
                    <button onClick={exportGraficoSemanalPDF} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
                        🖨 Exportar Gráfico Semanal
                    </button>
                )}
            </div>

            {loading && ( // NOVIDADE FIRESTORE: Indicador de carregamento
                <div style={{ textAlign: 'center', fontSize: '1.2em', margin: '20px 0' }}>
                    Carregando dados dos alunos...
                </div>
            )}
            {!loading && ( // Renderiza o conteúdo apenas depois de carregar
                <>
                    {mostrarGraficoSemanal && ( // NOVIDADE GRÁFICO: Renderiza GraficoSemanal condicionalmente
                        <div className="mt-8"> {/* Removido ref daqui, pois o ref vai para o componente interno */}
                            <GraficoSemanal
                                chartRef={graficoSemanalRef} // NOVIDADE: Passa o ref para o componente
                                registros={registros} // Recebe TODOS os registros (ativos e inativos)
                                dataInicio={dataInicio}
                                dataFim={dataFim}
                                nonSchoolDays={nonSchoolDays} // NOVIDADE REQUERIDA: Passa os dias não letivos
                            />
                        </div>
                    )}
                    {mostrarGraficoFaltas && ( // NOVIDADE GRÁFICO: Renderiza GraficoFaltas condicionalmente
                        <div className="mt-8"> {/* Removido ref daqui, pois o ref vai para o componente interno */}
                            <GraficoFaltas
                                chartRef={graficoFaltasRef} // NOVIDADE: Passa o ref para o componente
                                registros={registros} // Passa TODOS os registros para o GraficoFaltas
                                dataInicio={dataInicio || REPORT_START_DATE}
                                dataFim={dataFim || getTodayDateString()}
                                turmaSelecionada={turmaSelecionada}
                                tipoUsuario={tipoUsuario}
                                turmasPermitidas={turmasPermitidas()}
                                nonSchoolDays={nonSchoolDays} // NOVIDADE REQUERIDA: Passa os dias não letivos
                            />
                        </div>
                    )}

                    <Tabela
                        registros={registrosFiltradosParaTabelaEOutros} // NOVIDADE: Recebe APENAS os registros ativos
                        onAtualizar={atualizarAlunoRegistro}
                        onWhatsapp={enviarWhatsapp}
                        onEditar={editarAluno}
                        onExcluir={handleExcluirAluno}
                        dataSelecionada={dataSelecionada}
                        onOpenObservationDropdown={handleOpenObservationDropdown}
                        onAbrirRelatorio={handleAbrirRelatorioAluno}
                        linhaSelecionada={linhaSelecionada}
                        onSelecionarLinha={setLinhaSelecionada}
                        onAbrirModalRecomposicao={handleAbrirModalRecomposicao}
                        // NOVIDADE FOTO: Passa as funções de gerenciamento de fotos para a Tabela
                        onAbrirModalFoto={handleOpenModalFoto}
                        onViewPhoto={handleViewPhoto}
                        onExcluirFoto={handleExcluirFoto}
                        // NOVIDADE: Passa as flags de data para a Tabela
                        isFutureDate={isFutureDate}
                        isWeekend={isWeekend}
                        isSelectedDateNonSchool={isSelectedDateNonSchool}
                        onToggleAllChamada={handleToggleAllChamada} // NOVIDADE: Passa a função de alternar tudo para Tabela.js
                        nonSchoolDays={nonSchoolDays} // NOVIDADE REQUERIDA: Passa os dias não letivos
                    />

                    {editandoAluno !== null && (
                        <div className="mt-8 border border-gray-300 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                            <h4 className="text-xl font-semibold mb-4">Editar Aluno(a)</h4>
                            <input placeholder="Nome" value={novoAluno.nome} onChange={e => setNovoAluno({ ...novoAluno, nome: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                            <input placeholder="Turma" value={novoAluno.turma} onChange={e => setNovoAluno({ ...novoAluno, turma: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                            <input placeholder="Contato" value={novoAluno.contato} onChange={e => setNovoAluno({ ...novoAluno, contato: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                            <input placeholder="Responsável" value={novoAluno.responsavel} onChange={e => setNovoAluno({ ...novoAluno, responsavel: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                            <input placeholder="Monitor(a)" value={novoAluno.monitor} onChange={e => setNovoAluno({ ...novoAluno, monitor: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                            {/* NOVIDADE REQUERIDA: Campo Data de Matrícula na Edição */}
                            <div className="mb-3">
                                <label htmlFor="edit-data-matricula" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Data de Matrícula:
                                </label>
                                <input
                                    id="edit-data-matricula"
                                    type="date"
                                    value={novoAluno.dataMatricula}
                                    onChange={e => setNovoAluno({ ...novoAluno, dataMatricula: e.target.value })}
                                    className="block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    max={getTodayDateString()} // Não permite data de matrícula futura
                                />
                            </div>
                            {/* NOVIDADE ALERTA/CUIDADOS: Campo para Alertas/Cuidados na Edição */}
                            <div className="mb-3">
                                <label htmlFor="edit-alertas-cuidados" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Alertas / Cuidados:
                                </label>
                                <textarea
                                    id="edit-alertas-cuidados"
                                    placeholder="Adicione informações importantes sobre o aluno (alergias, condições médicas, etc.)"
                                    value={novoAluno.alertasCuidados}
                                    onChange={e => setNovoAluno({ ...novoAluno, alertasCuidados: e.target.value })}
                                    rows="3"
                                    className="block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                ></textarea>
                            </div>
                            {/* FIM NOVIDADE ALERTA/CUIDADOS */}
                            {/* NOVIDADE FOTO: Botões para gerenciar a foto na edição */}
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                {novoAluno.fotoUrl ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleViewPhoto(novoAluno.fotoUrl, e); }}
                                            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-sm photo-thumbnail"
                                        >
                                            Ver Foto Atual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleExcluirFoto(novoAluno); }}
                                            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-sm"
                                        >
                                            Excluir Foto
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleOpenModalFoto(novoAluno); }}
                                        className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors duration-200 shadow-sm"
                                    >
                                        Adicionar Foto
                                    </button>
                                )}
                            </div>
                            <button onClick={salvarEdicao} className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 shadow-md">
                                Salvar
                            </button>
                            <button onClick={() => setEditandoAluno(null)} className="ml-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-md">
                                Cancelar
                            </button>
                        </div>
                    )}

                    {isObservationDropdownOpen && currentAlunoForObservation && (
                        <div ref={dropdownRef} className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-3" style={{ top: buttonPosition.top + buttonPosition.height + 5, left: buttonPosition.left, minWidth: '250px', maxWidth: '350px', }}> {/* CORREÇÃO AQUI: Usando buttonPosition */}
                            <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Selecione as Observações para {currentAlunoForObservation.nome}:</h4>
                            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                                {opcoesObservacao.map((opcao, i) => (<div key={i} className="flex items-center">{opcao === "Outros" ? (<label className="flex items-center w-full"><input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded" checked={tempSelectedObservations.has("Outros")} onChange={() => handleCheckboxChange("Outros")} /><span className="ml-2 text-gray-700 dark:text-gray-300">Outros:</span><input type="text" value={otherObservationText} onChange={handleOtherTextChange} placeholder="Digite sua observação personalizada" className="ml-2 flex-grow p-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" /></label>) : (<label className="flex items-center"><input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded" checked={tempSelectedObservations.has(opcao)} onChange={() => handleCheckboxChange(opcao)} /><span className="ml-2 text-gray-700 dark:text-gray-300">{opcao}</span></label>)}</div>))}
                            </div>
                            <div className="flex justify-end space-x-2 mt-3">
                                <button onClick={closeObservationDropdown} className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors duration-200 shadow-sm">Cancelar</button>
                                <button onClick={handleSaveObservations} className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors duration-200 shadow-sm">Salvar</button>
                                <button onClick={handleSendObservationWhatsApp} className="px-3 py-1 rounded-lg bg-teal-500 text-white text-xs hover:bg-teal-600 transition-colors duration-200 shadow-sm">
                                    Enviar Mensagem (WhatsApp)
                                </button>
                                {/* NOVO BOTÃO: Salvar e Enviar com apenas um símbolo */}
                                <button
                                    onClick={handleSaveAndSendCombined}
                                    className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors duration-200 shadow-sm"
                                    title="Salvar e Enviar via WhatsApp"
                                >
                                    Salvar e Enviar via WhatsApp
                                </button>
                            </div>
                        </div>
                    )}

                    {showCompleteReportModal && (
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-50 p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                {completeReportData ? (
                                    <>
                                        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                                            Relatório do(a) Aluno(a): {completeReportData.aluno.nome}
                                        </h3>

                                        {/* NOVIDADE FOTO: Exibe a foto no relatório completo */}
                                        {completeReportData.aluno.fotoUrl && (
                                            <div className="mb-4 flex justify-center">
                                                <img
                                                    src={completeReportData.aluno.fotoUrl}
                                                    alt={`Foto de ${completeReportData.aluno.nome}`}
                                                    className="w-32 h-32 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600"
                                                />
                                            </div>
                                        )}

                                        <div className="flex gap-4 mb-6">
                                            <button
                                                onClick={exportCompleteReportPDF}
                                                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md"
                                            >
                                                Exportar PDF
                                            </button>
                                        </div>

                                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-inner">
                                            <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Dados do Relatório</h4>
                                            <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Período Analisado:</strong> {completeReportData.periodo}</p>
                                            <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Total de Faltas no Período:</strong> {completeReportData.faltasAluno}</p>
                                            <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Turma:</strong> {normalizeTurmaChar(completeReportData.aluno.turma)}</p>
                                            <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Responsável:</strong> {completeReportData.aluno.responsavel}</p>

                                            {/* NOVIDADE ALERTA/CUIDADOS: Exibe Alertas/Cuidados no modal do relatório */}
                                            {completeReportData.alertasCuidados && (
                                                <>
                                                    <h5 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">Alertas / Cuidados:</h5>
                                                    <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-line">{completeReportData.alertasCuidados}</p>
                                                </>
                                            )}
                                            {/* FIM NOVIDADE ALERTA/CUIDADOS */}

                                            <h5 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Métricas Comparativas:</h5>
                                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-3">
                                                <li className="font-bold">Percentual de Faltas do(a) Aluno(a): {completeReportData.porcentagemAluno}%</li>
                                                <li>Média de Faltas da Turma: {completeReportData.porcentagemTurma}%</li>
                                                <li>Média de Faltas da Escola: {completeReportData.porcentagemEscola}%</li>
                                            </ul>

                                            {completeReportData.justificativasNoPeriodo.length > 0 ? (
                                                <>
                                                    <h5 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">Justificativas de Falta no Período:</h5>
                                                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                                        {completeReportData.justificativasNoPeriodo.map((jus, idx) => (
                                                            <li key={idx}><strong>{jus.data}:</strong> {jus.justificativa}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            ) : (
                                                <p className="text-gray-700 dark:text-gray-300 mt-4">Nenhuma falta justificada registrada para este(a) aluno(a) no período.</p>
                                            )}

                                            {completeReportData.observacoesAlunoNoPeriodo.length > 0 ? (
                                                <>
                                                    <h5 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">Observações no Período:</h5>
                                                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                                        {completeReportData.observacoesAlunoNoPeriodo.map((obs, idx) => (
                                                            <li key={idx}><strong>{obs.data}:</strong> {obs.observacoes}</li>
                                                        ))}
                                                    </ul>
                                                </>
                                            ) : (
                                                <p className="text-gray-700 dark:text-gray-300 mt-4">Nenhuma observação registrada para este(a) aluno(a) no período.</p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p>Carregando dados do relatório...</p>
                                )}

                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={() => {
                                            setShowCompleteReportModal(false);
                                            setSelectedStudentForReport(null);
                                            setCompleteReportData(null);
                                        }}
                                        className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-md"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isRecomporModalOpen && alunoParaRecompor && (
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-50 p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                                <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                                    Recompor Faltas de: {alunoParaRecompor.nome}
                                </h3>
                                <p className="mb-4 text-gray-600 dark:text-gray-300">
                                    Selecione o período para limpar as justificativas deste(a) aluno(a). Esta ação é útil para abonar faltas após a recomposição de aprendizagem.
                                </p>
                                <div className="flex items-center gap-4 mb-4">
                                    <div>
                                        <label htmlFor="recompor-inicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início</label>
                                        <input
                                            type="date"
                                            id="recompor-inicio"
                                            value={recomporDataInicio}
                                            onChange={e => setRecomporDataInicio(e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="recompor-fim" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim</label>
                                        <input
                                            type="date"
                                            id="recompor-fim"
                                            value={recomporDataFim}
                                            onChange={e => setRecomporDataFim(e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 mt-6">
                                    <button
                                        onClick={() => setIsRecomporModalOpen(false)}
                                        className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors duration-200 shadow-md"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmarRecomposicao}
                                        className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-200 shadow-md"
                                    >
                                        Confirmar Recomposição
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NOVIDADE REQUERIDA: Modal de Exportação de Observações */}
                    {showObservationExportModal && (
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                            <div ref={observationExportModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Exportar Relação de Observações</h3>

                                <div className="mb-4">
                                    <h4 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Tipos de Observação:</h4>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border p-2 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                                        {opcoesObservacao.map((opcao, i) => (
                                            <label key={i} className="flex items-center text-gray-700 dark:text-gray-300">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                                    checked={selectedObservationTypesToExport.has(opcao)}
                                                    onChange={() => handleObservationTypeCheckboxChange(opcao)}
                                                />
                                                <span className="ml-2 text-sm">{opcao}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Escopo do Relatório:</h4>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center text-gray-700 dark:text-gray-300">
                                            <input
                                                type="radio"
                                                name="observationScope"
                                                value="turma"
                                                checked={exportObservationScope === 'turma'}
                                                onChange={() => setExportObservationScope('turma')}
                                                className="form-radio h-4 w-4 text-blue-600"
                                                disabled={!turmaSelecionada} // Desabilita se nenhuma turma estiver selecionada
                                            />
                                            <span className="ml-2 text-sm">Turma Selecionada</span>
                                        </label>
                                        <label className="flex items-center text-gray-700 dark:text-gray-300">
                                            <input
                                                type="radio"
                                                name="observationScope"
                                                value="allTurmas"
                                                checked={exportObservationScope === 'allTurmas'}
                                                onChange={() => setExportObservationScope('allTurmas')}
                                                className="form-radio h-4 w-4 text-blue-600"
                                            />
                                            <span className="ml-2 text-sm">Todas as Turmas</span>
                                        </label>
                                    </div>
                                    {!turmaSelecionada && exportObservationScope === 'turma' && (
                                        <p className="text-red-500 text-xs mt-1">Selecione uma turma para usar esta opção.</p>
                                    )}
                                </div>


                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowObservationExportModal(false)}
                                        className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors duration-200 shadow-md"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={exportarRelatorioObservacoesPDF}
                                        className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors duration-200 shadow-md"
                                        disabled={selectedObservationTypesToExport.size === 0 || (exportObservationScope === 'turma' && !turmaSelecionada)}
                                    >
                                        Exportar PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* NOVIDADE FOTO: Renderiza o CameraModal */}
                    {isCameraModalOpen && alunoParaFoto && (
                        <CameraModal
                            aluno={alunoParaFoto}
                            onClose={() => setIsCameraModalOpen(false)}
                            onUploadSuccess={handleUploadSuccess}
                        />
                    )}

                    {/* NOVIDADE FOTO: Renderiza o visualizador de fotos flutuante */}
                    {viewingPhotoUrl && photoViewerPosition && (
                        <div
                            ref={photoViewerRef}
                            style={{
                                position: 'absolute',
                                top: `${photoViewerPosition.top}px`,
                                left: `${photoViewerPosition.left}px`,
                                zIndex: 100,
                            }}
                            className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700"
                        >
                            <img src={viewingPhotoUrl} alt="Foto do Aluno" className="w-48 h-64 object-cover rounded" />
                        </div>
                    )}
                </>
            )} {/* Fim da renderização condicional do loading */}

            {/* NOVIDADE REQUERIDA: Modal de Download ZIP */}
            <ZipDownloadModal
                isOpen={showZipModal}
                onClose={() => setShowZipModal(false)}
                onDownload={handleDownloadAllReportsAsZip}
                turmasPermitidas={turmasPermitidas()} // Passa as turmas que o usuário logado pode ver
                isDownloading={isDownloading}
            />
        </div>
    );
};

export default Painel;
