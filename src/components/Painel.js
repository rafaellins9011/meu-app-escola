// Arquivo: src/components/Painel.js
// ... (comentários anteriores)
// NOVIDADE SALVAR: Adicionado botão de salvar manual e lógica de recarregamento.
// CORREÇÃO PERSISTÊNCIA: Ajuste na função salvarAlteracoesDePresenca para usar deleteField corretamente.
// ATUALIZAÇÃO JUSTIFICATIVA: Filtrando "Falta não apurada" no cálculo de relatórios.
// ATUALIZAÇÃO RECOMPOSIÇÃO: Melhoria na função de recompor faltas para usar deleteField em lote.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { turmasDisponiveis, monitoresDisponiveis, gestoresDisponiveis } from '../dados';
import Tabela from './Tabela';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import GraficoFaltas from './GraficoFaltas';
import GraficoSemanal from './GraficoSemanal';
import html2canvas from 'html2canvas';
import CameraModal from './CameraModal';

import { db } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, updateDoc, writeBatch, getDoc, onSnapshot, deleteField } from 'firebase/firestore';

const formatarData = (dataStr) => {
  if (!dataStr) return '';
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

const observationMessages = {
    "Chegou atrasado(a).": {
    title: "**Chegou atrasado(a).**",
    getBody: () => `Conforme estabelecido no Termo de Ajustamento de Normas e Conduta, a pontualidade é essencial para a rotina escolar, especialmente para a participação no movimento cívico-militar com os monitores. Diante disso, o(a) estudante não pôde participar da atividade inicial e pedimos a colaboração dos senhores para garantir que ele(a) chegue dentro do horário estabelecido, evitando prejuízos à sua formação disciplinar e acadêmica.`
  },
  "Cabelo fora do padrão.": {
    title: "**Cabelo fora do padrão.**",
    getBody: (aluno) => `O corte de cabelo de ${aluno.nome} não está de acordo com as normas estabelecidas pela escola, que exigem o padrão de corte à máquina nº 2 ou nº 3, nas partes parietais e occipitais do crânio, mantendo-se bem nítidos os contornos junto às orelhas e ao pescoço (corte social), conforme o padrão adotado na administração cívico-militar. Solicitamos a gentileza de orientá-lo(a) para que seja seguido o padrão adequado, evitando futuros impedimentos na participação das atividades escolares e formativas.`
  },
  "Sem tênis.": {
    title: "**Sem tênis.**",
    getBody: () => `Informamos que, conforme a Portaria nº 181/2024/GS/SEDUC/MT, o uso do uniforme escolar completo é obrigatório para acesso e permanência dos estudantes na escola, incluindo atividades curriculares e extracurriculares. Hoje, o(a) aluno(a) compareceu à escola sem o tênis adequado, que faz parte do uniforme obrigatório. Conforme o Art. 2º, §2º da portaria, o estudante deve utilizar o tênis fornecido pelo Estado ou outro calçado fechado. Solicitamos que providenciem o uso correto do uniforme para os próximos dias, garantindo assim o cumprimento das normas estabelecidas e a segurança do estudante.`
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
  const [registros, setRegistros] = useState([]);
  const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('tema') === 'escuro');
  const [mostrarGraficoFaltas, setMostrarGraficoFaltas] = useState(false);
  const [mostrarGraficoSemanal, setMostrarGraficoSemanal] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState(() => getTodayDateString());
  const [editandoAluno, setEditandoAluno] = useState(null);
  const [novoAluno, setNovoAluno] = useState({ nome: '', turma: '', contato: '', responsavel: '', monitor: '' });
  const [dataInicio, setDataInicio] = useState('2025-07-20');
  const [dataFim, setDataFim] = useState('2025-07-26');
  const [alunoParaCadastro, setAlunoParaCadastro] = useState({ nome: '', turma: '', contato: '', responsavel: '', monitor: '', faltasAnteriores: 0 });
  const [mostrarFormularioCadastro, setMostrarFormularioCadastro] = useState(false);
  const schoolHeaderRef = useRef(null);
  const [isObservationDropdownOpen, setIsObservationDropdownOpen] = useState(false);
  const [currentAlunoForObservation, setCurrentAlunoForObservation] = useState(null);
  const [tempSelectedObservations, setTempSelectedObservations] = useState(new Set());
  const [otherObservationText, setOtherObservationText] = useState('');
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const dropdownRef = useRef(null);
  const opcoesObservacao = ["Chegou atrasado(a).", "Cabelo fora do padrão.", "Sem tênis.", "Sem camisa do uniforme.", "Desrespeitou professor(a), funcionário(a) e/ou colega de classe.", "Desobedeceu e tumultuou a aula e a rotina escolar.", "Provocou conflitos com os(as) colegas.", "Agrediu verbalmente e/ou fisicamente os(as) colegas.", "Agrediu verbalmente e/ou fisicamente os(as) professores(as) ou funcionários(as).", "Destruiu patrimônio público.", "Destruiu e/ou perdeu material didático.", "Usou indevidamente o celular e aparelhos eletrônicos.", "Praticou bullying.", "Foi indisciplinado(a) em sala de aula.", "Não realizou as atividades na sala de aula e/ou lições de casa.", "Estava com uniforme incompleto.", "Outros"];
  const [showCompleteReportModal, setShowCompleteReportModal] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [completeReportData, setCompleteReportData] = useState(null);
  const REPORT_START_DATE = '2025-07-22';
  const [linhaSelecionada, setLinhaSelecionada] = useState(null);
  const [isRecomporModalOpen, setIsRecomporModalOpen] = useState(false);
  const [alunoParaRecompor, setAlunoParaRecompor] = useState(null);
  const [recomporDataInicio, setRecomporDataInicio] = useState('');
  const [recomporDataFim, setRecomporDataFim] = useState('');
  const [termoBuscaTabela, setTermoBuscaTabela] = useState('');
  const [termoBuscaInformativa, setTermoBuscaInformativa] = useState(null); // Alterado para null inicialmente
  const [alunoInfoEncontrado, setAlunoInfoEncontrado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [alunoParaFoto, setAlunoParaFoto] = useState(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState(null);
  const [photoViewerPosition, setPhotoViewerPosition] = useState(null);
  const photoViewerRef = useRef(null);
  const graficoFaltasRef = useRef(null);
  const graficoSemanalRef = useRef(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const initializedCallsRef = useRef(new Set());

  // Estado para indicar que há alterações não salvas
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setLoading(true);
    console.log("Iniciando escuta do Firestore...");
    const unsubscribe = onSnapshot(collection(db, 'alunos'), (querySnapshot) => {
        const alunosData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            ativo: doc.data().ativo ?? true // Garante que 'ativo' seja true por padrão
        }));
        setRegistros(alunosData);
        setLoading(false);
        console.log("Dados sincronizados com o Firestore em tempo real.");
        console.log("DADOS CARREGADOS:", alunosData);
    }, (error) => {
        console.error("Erro ao ouvir atualizações do Firestore:", error);
        alert("Erro de conexão em tempo real. Verifique a internet ou as regras do Firestore.");
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const currentKey = `${turmaSelecionada}_${dataSelecionada}`;
    if (!turmaSelecionada || loading || initializedCallsRef.current.has(currentKey)) {
      return;
    }

    const inicializarAusencias = async () => {
      initializedCallsRef.current.add(currentKey);
      const alunosDaTurma = registros.filter(a => a.ativo && normalizeTurmaChar(a.turma) === normalizeTurmaChar(turmaSelecionada));
      if (alunosDaTurma.length === 0) return;

      const batch = writeBatch(db);
      let updatesNecessarios = 0;

      for (const aluno of alunosDaTurma) {
          const chave = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
          const alunoDocRef = doc(db, 'alunos', aluno.id);

          // Obter o estado atual do aluno no Firestore
          const alunoSnapshot = await getDoc(alunoDocRef);
          if (alunoSnapshot.exists()) {
              const alunoFirestoreData = alunoSnapshot.data();
              const justificativasFirestore = alunoFirestoreData.justificativas || {};

              // Se a chave não existir no Firestore para esta data, inicializa como "Falta não apurada"
              if (!justificativasFirestore.hasOwnProperty(chave)) {
                  batch.update(alunoDocRef, { [`justificativas.${chave}`]: "Falta não apurada" });
                  updatesNecessarios++;
              }
          }
      }

      if (updatesNecessarios > 0) {
        console.log(`Inicializando ${updatesNecessarios} aluno(s) como ausente(s) para o dia ${formatarData(dataSelecionada)}.`);
        try {
          await batch.commit();
          console.log("Inicialização de ausências concluída com sucesso.");
        } catch (error) {
          console.error("Erro ao inicializar ausências em lote:", error);
          alert("Ocorreu um erro ao preparar a lista de chamada.");
          initializedCallsRef.current.delete(currentKey); // Permite tentar novamente em caso de erro
        }
      }
    };
    inicializarAusencias();
  }, [turmaSelecionada, dataSelecionada, registros, loading]);


  const closeObservationDropdown = useCallback(() => {
    setIsObservationDropdownOpen(false);
    setCurrentAlunoForObservation(null);
    setTempSelectedObservations(new Set());
    setOtherObservationText('');
    setButtonPosition({ top: 0, left: 0, width: 0, height: 0 });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest('.observation-button')) {
        closeObservationDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [dropdownRef, closeObservationDropdown]);

  useEffect(() => {
      document.body.style.backgroundColor = temaEscuro ? '#121212' : '#ffffff';
      document.body.style.color = temaEscuro ? '#ffffff' : '#000000';
      localStorage.setItem('tema', temaEscuro ? 'escuro' : 'claro');
  }, [temaEscuro]);

  const turmasPermitidas = useCallback(() => {
      let allowedTurmas = [];
      const usuarioLogadoNormalizado = normalizeTurmaChar(usuarioLogado);
      if (tipoUsuario === 'gestor') {
          allowedTurmas = turmasDisponiveis.map(t => normalizeTurmaChar(t.name));
      } else {
          const monitor = monitoresDisponiveis.find(m => normalizeTurmaChar(m.name) === usuarioLogadoNormalizado);
          if (monitor) {
              allowedTurmas = monitor.turmas.map(t => normalizeTurmaChar(t));
          }
      }
      return allowedTurmas;
  }, [usuarioLogado, tipoUsuario]);

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

  const registrosFiltradosParaTabelaEOutros = useMemo(() => {
    if (!turmaSelecionada) return [];
    return registros
      .filter(a => {
        if (a.ativo === false) return false;
        const turmasDoUsuario = turmasPermitidas();
        const turmaAlunoNormalizada = normalizeTurmaChar(a.turma);
        const pertence = turmasDoUsuario.includes(turmaAlunoNormalizada);
        const turmaSelecionadaNormalizada = normalizeTurmaChar(turmaSelecionada);
        const turmaOk = turmaSelecionada === '' || turmaAlunoNormalizada === turmaSelecionadaNormalizada;
        const buscaTabelaOk = a.nome.toLowerCase().includes(termoBuscaTabela.toLowerCase());
        return pertence && turmaOk && buscaTabelaOk;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [registros, turmaSelecionada, termoBuscaTabela, turmasPermitidas]);

  const atualizarAlunoRegistro = useCallback(async (alunoId, alunoAtualizado) => {
    try {
      const alunoDocRef = doc(db, 'alunos', alunoId);
      const { id, ...dadosParaSalvar } = alunoAtualizado;
      await setDoc(alunoDocRef, dadosParaSalvar, { merge: true });
      console.log("Aluno atualizado no Firestore com sucesso:", alunoId);
      // setHasUnsavedChanges(true); // Se essa atualização afeta a presença, marcar como não salvo
    } catch (error) {
      console.error("Erro ao atualizar aluno no Firestore:", error);
      alert("Erro ao atualizar dados do aluno.");
    }
  }, []);

  // handleTogglePresenca agora apenas atualiza o estado local.
  const handleTogglePresenca = useCallback((aluno) => {
    const chave = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
    const isAusente = aluno.justificativas && aluno.justificativas.hasOwnProperty(chave);
    
    setRegistros(prevRegistros => prevRegistros.map(reg => {
        if (reg.id === aluno.id) {
            const novasJustificativas = { ...(reg.justificativas || {}) };
            if (isAusente) {
                // Se estava ausente (chave existia), agora está presente, então remove a chave
                delete novasJustificativas[chave];
            } else {
                // Se estava presente (chave não existia), agora está ausente, adiciona a chave
                novasJustificativas[chave] = "Falta não apurada"; 
            }
            return { ...reg, justificativas: novasJustificativas };
        }
        return reg;
    }));
    // Marca que existem alterações a serem salvas
    setHasUnsavedChanges(true);
  }, [dataSelecionada]);

  // NOVIDADE SALVAR: Função para salvar todas as alterações de presença de uma vez.
  const salvarAlteracoesDePresenca = useCallback(async () => {
    if (!hasUnsavedChanges) {
        alert("Nenhuma alteração para salvar.");
        return;
    }
    console.log("Iniciando salvamento em lote das alterações de presença...");
    const batch = writeBatch(db);
    let updatesCount = 0;

    // Criar um mapa de alunos do Firestore para fácil acesso
    const alunosFirestoreMap = new Map();
    const querySnapshot = await getDocs(collection(db, 'alunos'));
    querySnapshot.forEach(doc => {
      alunosFirestoreMap.set(doc.id, doc.data());
    });

    // Itera sobre todos os alunos no estado local `registros`
    for (const alunoLocal of registros) {
      const alunoDocRef = doc(db, 'alunos', alunoLocal.id);
      const chavePresenca = `${alunoLocal.nome}_${normalizeTurmaChar(alunoLocal.turma)}_${dataSelecionada}`;

      const alunoFirestoreData = alunosFirestoreMap.get(alunoLocal.id);
      if (!alunoFirestoreData) {
        console.warn(`Aluno ${alunoLocal.nome} (ID: ${alunoLocal.id}) não encontrado no Firestore durante o salvamento. Ignorando.`);
        continue;
      }
      
      const justificativasFirestore = alunoFirestoreData.justificativas || {};
      
      // Verifica se a chave de presença existe no estado LOCAL (aluno está ausente localmente)
      const isAusenteLocal = alunoLocal.justificativas && alunoLocal.justificativas.hasOwnProperty(chavePresenca);
      // Verifica se a chave de presença existe no estado do FIRESTORE (aluno está ausente no Firestore)
      const isAusenteFirestore = justificativasFirestore.hasOwnProperty(chavePresenca);


      if (isAusenteLocal && !isAusenteFirestore) {
        // Se aluno está ausente localmente, mas presente no Firestore -> ADICIONA a falta
        batch.update(alunoDocRef, { [`justificativas.${chavePresenca}`]: alunoLocal.justificativas[chavePresenca] || "Falta não apurada" });
        updatesCount++;
      } else if (!isAusenteLocal && isAusenteFirestore) {
        // Se aluno está presente localmente, mas ausente no Firestore -> REMOVE a falta
        batch.update(alunoDocRef, { [`justificativas.${chavePresenca}`]: deleteField() });
        updatesCount++;
      } else if (isAusenteLocal && isAusenteFirestore) {
        // Se aluno está ausente em ambos, verifica se a justificativa mudou
        if (alunoLocal.justificativas[chavePresenca] !== justificativasFirestore[chavePresenca]) {
          batch.update(alunoDocRef, { [`justificativas.${chavePresenca}`]: alunoLocal.justificativas[chavePresenca] });
          updatesCount++;
        }
      }
      // Se !isAusenteLocal && !isAusenteFirestore (presente em ambos), não faz nada.
    }

    if (updatesCount > 0) {
      try {
          await batch.commit();
          setHasUnsavedChanges(false); // Reseta o estado de alterações
          alert(`Alterações de presença salvas com sucesso para ${updatesCount} aluno(s)!`);
      } catch (error) {
          console.error("Erro ao salvar alterações em lote:", error);
          alert("Ocorreu um erro ao salvar as alterações. Tente novamente.");
      }
    } else {
      alert("Nenhuma alteração detectada para salvar.");
      setHasUnsavedChanges(false); // Já que não houve alterações, reseta o estado.
    }
  }, [registros, hasUnsavedChanges, dataSelecionada]); // `dataSelecionada` é importante como dependência

  const marcarTodosPresentes = useCallback(async () => {
    const alunosParaMarcar = registrosFiltradosParaTabelaEOutros;
    if (alunosParaMarcar.length === 0) {
        alert("Não há alunos na lista para marcar a presença.");
        return;
    }

    setRegistros(prevRegistros => prevRegistros.map(reg => {
        if (alunosParaMarcar.some(alunoParaMarcar => alunoParaMarcar.id === reg.id)) {
            const chave = `${reg.nome}_${normalizeTurmaChar(reg.turma)}_${dataSelecionada}`;
            const novasJustificativas = { ...(reg.justificativas || {}) };
            // Remove a chave de justificativa para marcar como presente
            delete novasJustificativas[chave];
            return { ...reg, justificativas: novasJustificativas };
        }
        return reg;
    }));
    setHasUnsavedChanges(true); // Marca que há alterações para salvar
  }, [registrosFiltradosParaTabelaEOutros, dataSelecionada]);

  const handleOpenModalFoto = useCallback((aluno) => { setAlunoParaFoto(aluno); setIsCameraModalOpen(true); }, []);
  const handleUploadSuccess = useCallback(async (secure_url) => {
    if (!alunoParaFoto) return;
    try {
      await atualizarAlunoRegistro(alunoParaFoto.id, { ...alunoParaFoto, fotoUrl: secure_url });
      alert('Foto enviada e salva com sucesso!');
      setIsCameraModalOpen(false);
      setAlunoParaFoto(null);
    } catch (error) {
      console.error("Erro ao salvar a URL da foto no Firestore:", error);
      alert("Erro ao salvar a foto no banco de dados.");
    }
  }, [alunoParaFoto, atualizarAlunoRegistro]);

  const handleViewPhoto = useCallback((url, event) => {
    if (viewingPhotoUrl === url) {
      setViewingPhotoUrl(null);
      setPhotoViewerPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setViewingPhotoUrl(url);
      // Posiciona a foto flutuante à direita do botão/miniatura
      setPhotoViewerPosition({ top: rect.top + window.scrollY, left: rect.left + window.scrollX + rect.width + 10 });
    }
  }, [viewingPhotoUrl]);

  const handleExcluirFoto = useCallback(async (aluno) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR a foto de ${aluno.nome}?`)) {
      try {
        // Envia uma atualização para remover o campo 'fotoUrl'
        const alunoDocRef = doc(db, 'alunos', aluno.id);
        await updateDoc(alunoDocRef, { fotoUrl: deleteField() });
        alert('Foto excluída com sucesso!');
        // Atualiza o estado local para refletir a mudança imediatamente
        setRegistros(prevRegistros => prevRegistros.map(reg => 
            reg.id === aluno.id ? { ...reg, fotoUrl: undefined } : reg
        ));
        setViewingPhotoUrl(null); // Fecha o visualizador se a foto excluída estiver sendo vista
      } catch (error) {
        console.error("Erro ao excluir a foto do Firestore:", error);
        alert("Erro ao excluir a foto.");
      }
    }
  }, []);

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

  const handleCadastrarAluno = useCallback(async (e) => {
    e.preventDefault();
    if (!alunoParaCadastro.nome || !alunoParaCadastro.turma || !alunoParaCadastro.contato || !alunoParaCadastro.responsavel || !alunoParaCadastro.monitor) {
      alert('Por favor, preencha todos os campos para cadastrar o(a) aluno(a).');
      return;
    }
    const justificativasIniciais = {};
    const numFaltasAnteriores = parseInt(alunoParaCadastro.faltasAnteriores, 10) || 0;
    for (let i = 0; i < numFaltasAnteriores; i++) {
      const chaveFalta = `${alunoParaCadastro.nome}_${normalizeTurmaChar(alunoParaCadastro.turma)}_${REPORT_START_DATE}_hist_${i}`;
      justificativasIniciais[chaveFalta] = "Falta anterior à matrícula";
    }
    const novoRegistroData = { nome: alunoParaCadastro.nome, turma: normalizeTurmaChar(alunoParaCadastro.turma), contato: alunoParaCadastro.contato, responsavel: alunoParaCadastro.responsavel, monitor: alunoParaCadastro.monitor, justificativas: justificativasIniciais, observacoes: {}, totalDiasLetivos: 100, ativo: true, fotoUrl: '' };
    try {
      const docRef = doc(collection(db, 'alunos'));
      await setDoc(docRef, novoRegistroData);
      setAlunoParaCadastro({ nome: '', turma: '', contato: '', responsavel: '', monitor: '', faltasAnteriores: 0 });
      alert('Aluno(a) cadastrado(a) com sucesso!');
    } catch (error) {
      console.error("Erro ao cadastrar aluno no Firestore:", error);
      alert("Erro ao cadastrar aluno.");
    }
  }, [alunoParaCadastro]);

  const handleExcluirAluno = useCallback(async (alunoParaExcluir) => {
    if (window.confirm("Tem certeza que deseja EXCLUIR este(a) aluno(a)? Ele(a) será removido(a) da lista principal, mas suas faltas e atrasos ANTERIORES continuarão nos relatórios GERAIS (como o Gráfico Semanal).")) {
      try {
        const alunoDocRef = doc(db, 'alunos', alunoParaExcluir.id);
        await updateDoc(alunoDocRef, { ativo: false });
        alert('Aluno(a) excluído(a) da exibição principal com sucesso! Dados históricos gerais preservados.');
      } catch (error) {
        console.error("Erro ao excluir aluno do Firestore:", error);
        alert("Erro ao excluir aluno.");
      }
    }
  }, []);

  const salvarEdicao = useCallback(async () => {
    if (!editandoAluno || !novoAluno.id) {
      console.error("Erro: Aluno em edição ou ID ausente.");
      alert("Erro: Não foi possível salvar a edição. Aluno ou ID ausente.");
      return;
    }
    try {
      const alunoDocRef = doc(db, 'alunos', novoAluno.id);
      const { id, ...dadosParaSalvar } = novoAluno;
      await setDoc(alunoDocRef, dadosParaSalvar, { merge: true });
      setEditandoAluno(null);
      alert("Aluno atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar edição no Firestore:", error);
      alert("Erro ao salvar edição do aluno.");
    }
  }, [editandoAluno, novoAluno]);

  const justificarTodos = useCallback(async () => {
    const motivo = prompt("Digite a justificativa para todos os(as) alunos(as) filtrados(as):");
    if (motivo) {
      const alunosParaAtualizar = registrosFiltradosParaTabelaEOutros.filter(r => r.ativo);
      try {
        const batchInstance = writeBatch(db);
        for (const r of alunosParaAtualizar) {
          const chave = `${r.nome}_${normalizeTurmaChar(r.turma)}_${dataSelecionada}`;
          const alunoDocRef = doc(db, 'alunos', r.id);
          // Se o motivo for vazio ou 'Selecione', remove a justificativa
          if (motivo.trim() === "" || motivo === "Selecione" || motivo === "Falta não apurada") {
            batchInstance.update(alunoDocRef, { [`justificativas.${chave}`]: deleteField() });
          } else {
            const novasJustificativas = { ...r.justificativas, [chave]: motivo };
            batchInstance.update(alunoDocRef, { justificativas: novasJustificativas });
          }
        }
        await batchInstance.commit();
        alert("Faltas justificadas no Firestore com sucesso!");
        // Após a justificativa em lote, o onSnapshot deve atualizar os registros.
        // Não é necessário setHasUnsavedChanges(false) aqui, pois a ação já foi persistida.
      } catch (error) {
        console.error("Erro ao justificar todos no Firestore:", error);
        alert("Erro ao justificar faltas.");
      }
    }
  }, [dataSelecionada, registrosFiltradosParaTabelaEOutros]);

  const reiniciarAlertas = useCallback(async () => {
    if (tipoUsuario !== 'gestor') { alert("Apenas gestores podem reiniciar os alertas."); return; }
    const senhaDigitada = prompt("Para reiniciar todos os alertas, por favor, digite a sua senha de gestor:");
    if (senhaDigitada === senhaUsuario) {
      if (window.confirm("Senha correta! Tem certeza que deseja reiniciar TODAS as justificativas e observações? Esta ação é irreversível.")) {
        try {
          const batchInstance = writeBatch(db);
          const alunosCollectionRef = collection(db, 'alunos');
          const querySnapshot = await getDocs(alunosCollectionRef);
          querySnapshot.docs.forEach(docSnapshot => {
            const alunoDocRef = doc(db, 'alunos', docSnapshot.id);
            // Define justificativas e observacoes como objetos vazios, e fotoUrl como deleteField
            batchInstance.update(alunoDocRef, { 
                justificativas: {}, 
                observacoes: {}, 
                ativo: true, 
                fotoUrl: deleteField() // Remove o campo fotoUrl
            });
          });
          await batchInstance.commit();
          alert("Alertas reiniciados no Firestore com sucesso!");
          setHasUnsavedChanges(false); // Reseta o estado de alterações após reiniciar
        } catch (error) {
          console.error("Erro ao reiniciar alertas no Firestore:", error);
          alert("Erro ao reiniciar alertas.");
        }
      }
    } else if (senhaDigitada !== null) { alert("Senha incorreta. Reinício cancelado."); }
  }, [tipoUsuario, senhaUsuario]);

  const handleSaveObservations = useCallback(async () => {
    if (!currentAlunoForObservation || !currentAlunoForObservation.id) {
      console.error("Erro: Aluno para observação ou ID ausente.");
      alert("Erro: Não foi possível salvar as observações. Aluno ou ID ausente.");
      return;
    }
    const finalObservationsArray = Array.from(tempSelectedObservations);
    if (tempSelectedObservations.has("Outros") && otherObservationText.trim() !== '') {
      const indexOutros = finalObservationsArray.indexOf("Outros");
      if (indexOutros > -1) { finalObservationsArray.splice(indexOutros, 1); }
      finalObservationsArray.push(`Outros: ${otherObservationText.trim()}`);
    } else if (tempSelectedObservations.has("Outros") && otherObservationText.trim() === '') {
      // Se "Outros" foi desmarcado ou texto personalizado removido, retira de finalObservationsArray
      const indexOutros = finalObservationsArray.indexOf("Outros");
      if (indexOutros > -1) { finalObservationsArray.splice(indexOutros, 1); }
    }

    const chaveObservacao = `${currentAlunoForObservation.nome}_${normalizeTurmaChar(currentAlunoForObservation.turma)}_${dataSelecionada}`;
    let updatedObservationsValue;
    if (finalObservationsArray.length > 0) {
        updatedObservationsValue = finalObservationsArray;
    } else {
        updatedObservationsValue = deleteField(); // Se não houver observações, remove o campo
    }

    try {
      const alunoDocRef = doc(db, 'alunos', currentAlunoForObservation.id);
      // O updateDoc lida com a remoção do campo quando deleteField é usado
      await updateDoc(alunoDocRef, { [`observacoes.${chaveObservacao}`]: updatedObservationsValue });
      alert("Observações salvas no Firestore com sucesso!");
      closeObservationDropdown();
    } catch (error) {
      console.error("Erro ao salvar observações no Firestore:", error);
      alert("Erro ao salvar observações.");
    }
  }, [currentAlunoForObservation, tempSelectedObservations, otherObservationText, dataSelecionada, closeObservationDropdown]);

  const enviarWhatsapp = useCallback((aluno) => {
    const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
    // Nota: Mês em Date é 0-indexado
    const dataObj = new Date(ano, mes - 1, dia);
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const diaSemana = dataObj.getDay();
    const dataFormatada = formatarData(dataSelecionada);

    // Verifica se há justificativa para a data selecionada. Se sim, é uma falta.
    const chaveJustificativa = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
    const justificativa = aluno.justificativas?.[chaveJustificativa];
    
    let textoMensagem = `Olá, ${aluno.responsavel}!\n`;

    if (justificativa && justificativa !== "Falta não apurada") {
      // Se houver uma justificativa explícita (não "Falta não apurada"), a mensagem é sobre ela.
      textoMensagem += `Gostaríamos de informar sobre a justificativa registrada para ${aluno.nome} (${normalizeTurmaChar(aluno.turma)}) na data de ${dataFormatada} (${diasSemana[diaSemana]}):\n\n`;
      textoMensagem += `- *Justificativa:* ${justificativa.startsWith("Outros: ") ? justificativa.replace("Outros: ", "") : justificativa}\n\n`;
    } else {
      // Caso contrário, é uma mensagem de ausência padrão.
      textoMensagem += `Informamos que ${aluno.nome} (${normalizeTurmaChar(aluno.turma)}) esteve **ausente** na escola, na data de hoje ${dataFormatada} (${diasSemana[diaSemana]}). Por favor, justificar a ausência.\n\n`;
      textoMensagem += `Lembramos que faltas não justificadas podem resultar em notificações formais, conforme as diretrizes educacionais.\n\nAguardamos seu retorno.\n\n`;
    }

    // Adiciona observações, se houver
    const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`;
    const observacoesAluno = aluno.observacoes?.[chaveObservacao];
    if (observacoesAluno && observacoesAluno.length > 0) {
      textoMensagem += `**Observações do dia:**\n`;
      observacoesAluno.forEach(obs => {
        const obsTitle = observationMessages[obs]?.title || (obs.startsWith("Outros: ") ? observationMessages["Outros"].title : obs);
        const obsBody = obs.startsWith("Outros: ") ? obs.replace("Outros: ", "") : (observationMessages[obs]?.getBody(aluno) || obs);
        textoMensagem += `- ${obsTitle.replace(/\*\*/g, '')} ${obsBody}\n`; // Remove negrito dos títulos para o WhatsApp
      });
      textoMensagem += `\n`;
    }
    
    textoMensagem += `Atenciosamente,\nMonitor(a) ${usuarioLogado}\nEscola Cívico-Militar Profª Ana Maria das Graças de Souza Noronha`;

    const link = `https://wa.me/55${aluno.contato.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(textoMensagem)}`;
    window.open(link, '_blank');
  }, [dataSelecionada, usuarioLogado, registros]); // Depende de registros para obter a justificativa e observações atuais.


  const handleSendObservationWhatsApp = useCallback(() => {
    if (!currentAlunoForObservation || !currentAlunoForObservation.contato) {
      alert("Aluno ou contato do responsável não disponível para enviar mensagem.");
      return;
    }
    if (tempSelectedObservations.size === 0 && otherObservationText.trim() === '') {
      alert("Nenhuma observação selecionada para enviar.");
      return;
    }
    const aluno = currentAlunoForObservation;
    const dataAtualFormatada = formatarData(dataSelecionada);
    const monitorNome = usuarioLogado;
    const messageParts = [];
    messageParts.push(`Olá, ${aluno.responsavel}!\nGostaríamos de informar que, na data de hoje ${dataAtualFormatada}, foram registradas as seguintes observações sobre o(a) ${aluno.nome} (${normalizeTurmaChar(aluno.turma)}):`);
    Array.from(tempSelectedObservations).forEach(obsKey => {
      if (obsKey === "Outros") {
        if (otherObservationText.trim() !== '') {
          const outrosMessage = observationMessages["Outros"].getBody(otherObservationText.trim());
          messageParts.push(`- ${observationMessages["Outros"].title} ${outrosMessage}`);
        }
      } else {
        const obsTemplate = observationMessages[obsKey];
        if (obsTemplate) {
          const body = obsTemplate.getBody(aluno);
          messageParts.push(`- ${obsTemplate.title} ${body}`);
        }
      }
    });
    messageParts.push(`Contamos com a colaboração da família no acompanhamento e orientação do(a) estudante quanto à observância das normas escolares.\n\nAgradecemos a atenção e o apoio de vocês.\n\nAtenciosamente,\nMonitor ${monitorNome}\nEECIM Professora Ana Maria das Graças de Souza Noronha`);
    const fullMessage = messageParts.join('\n\n');
    const link = `https://wa.me/55${aluno.contato.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(fullMessage)}`;
    window.open(link, '_blank');
    closeObservationDropdown();
  }, [currentAlunoForObservation, tempSelectedObservations, otherObservationText, dataSelecionada, usuarioLogado, closeObservationDropdown]);

  const exportarPeriodo = useCallback((exportAllClasses = false) => {
    if (!dataInicio || !dataFim) return alert('Selecione o período completo!');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`;
    const logoUrl = '/logo-escola.png';
    let yOffset = 10;
    const addContentToDoc = () => {
      doc.setFontSize(10);
      let reportTitle = `Relatório de Faltas por Período (${formatarData(dataInicio)} a ${formatarData(dataFim)}) - ${tipoUsuario} ${usuarioLogado}`;
      if (exportAllClasses) {
        reportTitle += ' - TODAS AS TURMAS';
      } else {
        reportTitle += ` - Turma: ${turmaSelecionada}`;
      }
      doc.text(reportTitle, pageWidth / 2, yOffset, { align: 'center' });
      yOffset += 10;
      const allPeriodEntries = [];
      const registrosParaExportar = exportAllClasses ? registros : registrosFiltradosParaTabelaEOutros;
      registrosParaExportar.filter(a => a.ativo).forEach((aluno) => {
        if (!aluno.justificativas) return;
        Object.entries(aluno.justificativas).forEach(([chave, justificativa]) => {
          const partes = chave.split('_');
          const data = partes[2];
          const turmaAlunoNormalizada = normalizeTurmaChar(aluno.turma);
          const turmasDoUsuario = turmasPermitidas();
          const shouldIncludeAluno = exportAllClasses ? turmasDoUsuario.includes(turmaAlunoNormalizada) : (turmaAlunoNormalizada === normalizeTurmaChar(turmaSelecionada));
          
          // Inclui apenas justificativas válidas (não "Falta não apurada")
          if (data >= dataInicio && data <= dataFim && shouldIncludeAluno && justificativa && justificativa !== "Falta não apurada") {
            allPeriodEntries.push({ nome: aluno.nome, turma: turmaAlunoNormalizada, contato: aluno.contato || '', responsavel: aluno.responsavel || '', justificativa: justificativa, data: data, monitor: aluno.monitor || '' });
          }
        });
      });
      allPeriodEntries.sort((a, b) => { if (a.data < b.data) return -1; if (a.data > b.data) return 1; if (a.turma < b.turma) return -1; if (a.turma > b.turma) return 1; return 0; });
      const periodoFormattedForTable = allPeriodEntries.map(entry => [entry.nome, entry.turma, entry.contato, entry.responsavel, entry.justificativa, formatarData(entry.data), entry.monitor]);
      autoTable(doc, { startY: yOffset, head: [['Nome', 'Turma', 'Contato', 'Responsável', 'Justificativa', 'Data', 'Monitor(a)']], body: periodoFormattedForTable, styles: { fontSize: 8, halign: 'center' }, headStyles: { fillColor: [37, 99, 235], halign: 'center' }, });
      const fileName = exportAllClasses ? `faltas_todas_turmas_${dataInicio}_a_${dataFim}.pdf` : `faltas_turma_${normalizeTurmaChar(turmaSelecionada)}_${dataInicio}_a_${dataFim}.pdf`;
      doc.save(fileName);
      setShowExportOptions(false);
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
  }, [dataInicio, dataFim, usuarioLogado, tipoUsuario, registros, turmasPermitidas, registrosFiltradosParaTabelaEOutros, turmaSelecionada]);

  const exportGraficoSemanalPDF = useCallback(async () => {
    if (!mostrarGraficoSemanal) { alert('Por favor, visualize o "Gráfico Semanal" antes de tentar exportá-lo.'); return; }
    if (!dataInicio || !dataFim) { alert('Selecione o período completo para exportar o gráfico.'); return; }
    await new Promise(resolve => setTimeout(resolve, 300));
    const chartInstance = graficoSemanalRef.current;
    if (chartInstance && chartInstance.canvas) {
      try {
        const canvas = await html2canvas(chartInstance.canvas, { scale: 2, useCORS: true });
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
        const chartTitle = `Faltas e Atrasos (Semanal e Diário) - ${formatarData(dataInicio)} a ${formatarData(dataFim)}`;
        pdf.setFontSize(10);
        pdf.text(chartTitle, pageWidth / 2, yOffset, { align: 'center' });
        yOffset += 10;
        const imgProps= pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, yOffset, pageWidth, pdfHeight);
        pdf.save(`grafico_semanal_${dataInicio}_a_${dataFim}.pdf`);
        alert('Gráfico Semanal exportado com sucesso!');
      } catch (error) {
        console.error("Erro ao exportar o Gráfico Semanal:", error);
        alert(`Erro ao exportar o Gráfico Semanal. Verifique se ele está visível e tente novamente. Detalhes: ${error.message || error}`);
      }
    } else {
      alert('Gráfico Semanal não encontrado para exportação. Certifique-se de que ele está visível.');
    }
  }, [mostrarGraficoSemanal, dataInicio, dataFim]);

  const exportarChamadaGradePDF = useCallback(() => {
    if (!turmaSelecionada) { alert('Por favor, selecione uma turma para gerar a chamada.'); return; }
    if (!dataInicio || !dataFim) { alert('Por favor, selecione o período de início e fim para gerar a chamada.'); return; }
    if (registrosFiltradosParaTabelaEOutros.length === 0) { alert('Não há alunos na turma selecionada para gerar o relatório.'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(12);
    doc.text("Relatório de Chamada por Período (Formato Grade)", pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Turma: ${turmaSelecionada}`, 14, 22);
    doc.text(`Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`, pageWidth - 14, 22, { align: 'right' });
    const getDatesInRange = (startDate, endDate) => {
      const dates = [];
      let currentDate = new Date(startDate + 'T00:00:00');
      const lastDate = new Date(endDate + 'T00:00:00');
      while (currentDate <= lastDate) {
        const dayOfWeek = currentDate.getDay();
        // Exclui sábados (6) e domingos (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    };
    const dateRange = getDatesInRange(dataInicio, dataFim);
    const head = [['Nº', 'Nome do Aluno']];
    const dateHeaders = dateRange.map(date => `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    head[0].push(...dateHeaders, 'Presenças', 'Faltas');
    const body = registrosFiltradosParaTabelaEOutros.map((aluno, index) => {
      const row = [(index + 1).toString(), aluno.nome];
      let presencas = 0;
      let faltas = 0;
      dateRange.forEach(date => {
        const dateString = date.toISOString().split('T')[0];
        const chave = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dateString}`;
        // Considera falta se houver justificativa (mesmo que "Falta não apurada")
        if (aluno.justificativas && aluno.justificativas.hasOwnProperty(chave)) {
          row.push('F');
          faltas++;
        } else {
          row.push('P');
          presencas++;
        }
      });
      row.push(presencas.toString(), faltas.toString());
      return row;
    });
    autoTable(doc, { head: head, body: body, startY: 28, theme: 'grid', styles: { fontSize: 7, halign: 'center', cellPadding: 1.5 }, headStyles: { fillColor: [37, 99, 235], halign: 'center' } });
    doc.save(`chamada_grade_${normalizeTurmaChar(turmaSelecionada)}_${dataInicio}_a_${dataFim}.pdf`);
    setShowExportOptions(false);
  }, [dataInicio, dataFim, turmaSelecionada, registrosFiltradosParaTabelaEOutros]);

  const editarAluno = useCallback((alunoOriginal) => { 
    // Certifica-se de que novoAluno é uma cópia para não editar o estado diretamente
    setNovoAluno({ ...alunoOriginal }); 
    setEditandoAluno(alunoOriginal.id); // Usa o ID do Firebase para identificar o aluno em edição
  }, []);

  const handleOpenObservationDropdown = useCallback((aluno, event) => {
    if (isObservationDropdownOpen && currentAlunoForObservation && currentAlunoForObservation.id === aluno.id) { closeObservationDropdown(); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    setButtonPosition({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height });
    setCurrentAlunoForObservation(aluno);
    setIsObservationDropdownOpen(true);
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

  useEffect(() => {
    if (isObservationDropdownOpen && dropdownRef.current && buttonPosition.top !== 0) {
      const dropdownHeight = dropdownRef.current.offsetHeight;
      // Posiciona o dropdown acima do botão se não houver espaço abaixo
      const spaceBelow = window.innerHeight - (buttonPosition.top + buttonPosition.height - window.scrollY);
      const spaceAbove = buttonPosition.top - window.scrollY;

      let finalTop = buttonPosition.top + buttonPosition.height + 5; // Padrão: abaixo do botão
      let finalLeft = buttonPosition.left;

      if (dropdownHeight > spaceBelow && dropdownHeight <= spaceAbove) {
        // Se não houver espaço abaixo e houver espaço acima, posiciona acima
        finalTop = buttonPosition.top - dropdownHeight - 5;
      } else if (dropdownHeight > spaceBelow && dropdownHeight > spaceAbove) {
        // Se não houver espaço nem abaixo nem acima, tenta centralizar ou posicionar no topo da tela
        finalTop = 10 + window.scrollY; // 10px do topo da viewport
      }

      // Ajusta a posição horizontal para garantir que o dropdown fique visível
      const dropdownWidth = dropdownRef.current.offsetWidth;
      const viewportWidth = window.innerWidth;
      if (finalLeft + dropdownWidth > viewportWidth - 10) { // 10px de margem à direita
        finalLeft = viewportWidth - dropdownWidth - 10;
      }
      if (finalLeft < 10) { // 10px de margem à esquerda
        finalLeft = 10;
      }

      setButtonPosition(prev => ({ ...prev, top: finalTop, left: finalLeft }));
    }
  }, [isObservationDropdownOpen, buttonPosition, dropdownRef]);

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
    // Se a opção "Outros" foi desmarcada, limpa o texto
    if (option === "Outros" && tempSelectedObservations.has("Outros")) {
      setOtherObservationText('');
    }
  }, [tempSelectedObservations]);

  const handleOtherTextChange = useCallback((e) => {
    const text = e.target.value;
    setOtherObservationText(text);
    // Adiciona "Outros" ao conjunto de observações se o texto for digitado e ainda não estiver lá
    if (text.trim() !== '' && !tempSelectedObservations.has("Outros")) {
      setTempSelectedObservations(prev => new Set(prev).add("Outros"));
    } else if (text.trim() === '' && tempSelectedObservations.has("Outros")) {
      // Remove "Outros" do conjunto se o texto for apagado
      const newSet = new Set(tempSelectedObservations);
      newSet.delete("Outros");
      setTempSelectedObservations(newSet);
    }
  }, [tempSelectedObservations]);

  const calculateCompleteReport = useCallback((aluno) => {
    if (!aluno) return null;
    const today = getTodayDateString();
    const startDate = REPORT_START_DATE;
    const start = new Date(startDate);
    const end = new Date(today);

    let actualDaysInPeriod = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclui sábados (6) e domingos (0)
        actualDaysInPeriod++;
      }
    }
    if (actualDaysInPeriod === 0) actualDaysInPeriod = 1; // Evita divisão por zero

    let faltasAluno = 0;
    const alunoJustificativas = aluno.justificativas || {};
    const justificativasNoPeriodo = [];

    Object.entries(alunoJustificativas).forEach(([chave, justificativa]) => {
      const partes = chave.split('_');
      const data = partes[2];
      // Contabiliza apenas faltas que estão dentro do período e não são "Falta não apurada" ou vazias
      if (data >= startDate && data <= today && justificativa && justificativa !== "Selecione" && justificativa !== "Falta não apurada") {
        faltasAluno++;
        justificativasNoPeriodo.push({
          data: formatarData(data),
          justificativa: justificativa.startsWith("Outros: ") ? justificativa.substring(8) : justificativa,
        });
      }
    });

    const totalDiasLetivos = aluno.totalDiasLetivos || actualDaysInPeriod; // Usa dias letivos reais do período ou 100 como fallback
    const porcentagemAluno = ((faltasAluno / totalDiasLetivos) * 100).toFixed(2);

    let faltasTurma = 0;
    let totalAlunosNaTurma = new Set();
    registros.filter(a => a.ativo && normalizeTurmaChar(a.turma) === normalizeTurmaChar(aluno.turma)).forEach(r => {
      totalAlunosNaTurma.add(r.id); // Usa ID para garantir unicidade
      const rJustificativas = r.justificativas || {};
      Object.entries(rJustificativas).forEach(([chave, justificativa]) => {
        const partes = chave.split('_');
        const data = partes[2];
        if (data >= startDate && data <= today && justificativa && justificativa !== "Falta não apurada") {
          faltasTurma++;
        }
      });
    });
    const numAlunosNaTurma = totalAlunosNaTurma.size > 0 ? totalAlunosNaTurma.size : 1;
    const totalDiasLetivosTurma = numAlunosNaTurma * actualDaysInPeriod;
    const porcentagemTurma = totalDiasLetivosTurma > 0 ? ((faltasTurma / totalDiasLetivosTurma) * 100).toFixed(2) : 0;

    let faltasEscola = 0;
    let totalAlunosNaEscola = new Set();
    registros.filter(a => a.ativo).forEach(r => {
      totalAlunosNaEscola.add(r.id); // Usa ID para garantir unicidade
      const rJustificativas = r.justificativas || {};
      Object.entries(rJustificativas).forEach(([chave, justificativa]) => {
        const partes = chave.split('_');
        const data = partes[2];
        if (data >= startDate && data <= today && justificativa && justificativa !== "Falta não apurada") {
          faltasEscola++;
        }
      });
    });
    const numAlunosNaEscola = totalAlunosNaEscola.size > 0 ? totalAlunosNaEscola.size : 1;
    const totalDiasLetivosEscola = numAlunosNaEscola * actualDaysInPeriod;
    const porcentagemEscola = totalDiasLetivosEscola > 0 ? ((faltasEscola / totalDiasLetivosEscola) * 100).toFixed(2) : 0;

    const observacoesAlunoNoPeriodo = [];
    Object.entries(aluno.observacoes || {}).forEach(([chave, obsArray]) => {
      const partes = chave.split('_');
      const dataObs = partes[2];
      if (dataObs >= startDate && dataObs <= today && Array.isArray(obsArray) && obsArray.length > 0) {
        observacoesAlunoNoPeriodo.push({ data: formatarData(dataObs), observacoes: obsArray.join('; ') });
      }
    });

    return { aluno, periodo: `${formatarData(startDate)} a ${formatarData(today)}`, diasLetivosNoPeriodo: actualDaysInPeriod, faltasAluno, porcentagemAluno, faltasTurma, porcentagemTurma, faltasEscola, porcentagemEscola, observacoesAlunoNoPeriodo, justificativasNoPeriodo };
  }, [registros]);

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
      
      if (completeReportData.aluno.fotoUrl) {
        const img = new Image();
        img.src = completeReportData.aluno.fotoUrl;
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const imgWidth = 30;
          const imgHeight = (img.height * imgWidth) / img.width;
          const xImg = (pageWidth - imgWidth) / 2;
          doc.addImage(img, 'JPEG', xImg, yOffset, imgWidth, imgHeight, null, 'FAST');
          yOffset += imgHeight + 5;
          continuePdfContent();
        };
        img.onerror = () => { console.error("Erro ao carregar a foto do aluno para o PDF. Continuar sem a imagem."); continuePdfContent(); };
      } else { continuePdfContent(); }

      function continuePdfContent() {
        doc.setFontSize(10);
        doc.text(`Período do Relatório: ${completeReportData.periodo}`, 14, yOffset); yOffset += 7;
        doc.text(`Total de Faltas no Período: ${completeReportData.faltasAluno} (${completeReportData.porcentagemAluno}%)`, 14, yOffset); yOffset += 7;
        doc.text(`Turma: ${normalizeTurmaChar(completeReportData.aluno.turma)}`, 14, yOffset); yOffset += 7;
        doc.text(`Contato: ${completeReportData.aluno.contato}`, 14, yOffset); yOffset += 7;
        doc.text(`Responsável: ${completeReportData.aluno.responsavel}`, 14, yOffset); yOffset += 10;
        
        doc.setFontSize(12);
        doc.text('Métricas Comparativas:', 14, yOffset); yOffset += 7;
        doc.setFontSize(10);
        doc.text(`Percentual de Faltas do(a) Aluno(a): ${completeReportData.porcentagemAluno}%`, 14, yOffset); yOffset += 7;
        doc.text(`Média de Faltas da Turma: ${completeReportData.porcentagemTurma}%`, 14, yOffset); yOffset += 7;
        doc.text(`Média de Faltas da Escola: ${completeReportData.porcentagemEscola}%`, 14, yOffset); yOffset += 10;
        
        let finalY = yOffset;
        if (completeReportData.justificativasNoPeriodo.length > 0) {
          doc.setFontSize(12);
          doc.text('Justificativas de Falta no Período:', 14, finalY); finalY += 5;
          const jusBody = completeReportData.justificativasNoPeriodo.map(jus => [jus.data, jus.justificativa]);
          autoTable(doc, { startY: finalY, head: [['Data', 'Justificativa']], body: jusBody, styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] } });
          finalY = doc.lastAutoTable.finalY;
        }

        if (completeReportData.observacoesAlunoNoPeriodo.length > 0) {
          doc.setFontSize(12);
          doc.text('Observações no Período:', 14, finalY + 10); finalY += 15;
          const obsBody = completeReportData.observacoesAlunoNoPeriodo.map(obs => [obs.data, obs.observacoes]);
          autoTable(doc, { startY: finalY, head: [['Data', 'Observações']], body: obsBody, styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] } });
        }
        doc.save(`relatorio_completo_${completeReportData.aluno.nome.replace(/ /g, '_')}.pdf`);
      }
    };
    const img = new Image(); img.src = logoUrl; img.crossOrigin = "Anonymous"; img.onload = () => { const logoWidth = 20; const logoHeight = (img.height * logoWidth) / img.width; const xLogo = (pageWidth - logoWidth) / 2; doc.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight); yOffset += logoHeight + 5; doc.setFontSize(9); doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' }); yOffset += 10; addContentToDoc(); }; img.onerror = () => { console.error("Erro ao carregar a logo. Gerando PDF sem a imagem."); doc.setFontSize(12); doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' }); yOffset += 15; addContentToDoc(); };
  }, [completeReportData]);

  const handleAbrirModalRecomposicao = useCallback((aluno) => { setAlunoParaRecompor(aluno); setIsRecomporModalOpen(true); setRecomporDataInicio(''); setRecomporDataFim(''); }, []);
  
  const handleConfirmarRecomposicao = useCallback(async () => {
    if (!alunoParaRecompor || !recomporDataInicio || !recomporDataFim) { alert("Por favor, selecione o período completo para a recomposição."); return; }
    if (window.confirm(`Tem certeza que deseja limpar as justificativas de ${alunoParaRecompor.nome} no período de ${formatarData(recomporDataInicio)} a ${formatarData(recomporDataFim)}?`)) {
        try {
            const alunoDocRef = doc(db, 'alunos', alunoParaRecompor.id);
            const alunoSnapshot = await getDoc(alunoDocRef);
            if (!alunoSnapshot.exists()) { console.error("Aluno não encontrado para recomposição."); alert("Erro: Aluno não encontrado."); return; }
            
            const batch = writeBatch(db);
            let updatesMade = false;

            const currentJustificativas = alunoSnapshot.data().justificativas || {};

            // Percorre as chaves existentes e remove as que estão no período
            Object.keys(currentJustificativas).forEach(chave => { 
                const dataDaFalta = chave.split('_')[2]; 
                // Verifica se a data da falta está dentro do período selecionado
                if (dataDaFalta >= recomporDataInicio && dataDaFalta <= recomporDataFim) { 
                    batch.update(alunoDocRef, { [`justificativas.${chave}`]: deleteField() });
                    updatesMade = true;
                } 
            });

            if (updatesMade) {
              await batch.commit();
              alert("Justificativas do período foram limpas no Firestore com sucesso!");
            } else {
              alert("Nenhuma justificativa encontrada para limpar no período selecionado.");
            }
            
            setIsRecomporModalOpen(false);
            setAlunoParaRecompor(null);
        } catch (error) {
            console.error("Erro ao recompor faltas no Firestore:", error);
            alert("Erro ao recompor faltas.");
        }
    }
  }, [alunoParaRecompor, recomporDataInicio, recomporDataFim]);

  const handleBuscaInformativa = (e) => {
    const termo = e.target.value; // Removido .toLowerCase() daqui para permitir busca case-sensitive se necessário, embora o find continue lowerCase
    setTermoBuscaInformativa(termo);
    if (termo.length >= 3) {
      // Procura em todos os registros (ativos e inativos) para a consulta informativa
      const alunoEncontrado = registros.find(aluno => aluno.nome.toLowerCase().includes(termo.toLowerCase()));
      setAlunoInfoEncontrado(alunoEncontrado);
    } else {
      setAlunoInfoEncontrado(null);
    }
  };

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
            <div className="mb-3">
              <label htmlFor="faltas-anteriores" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Faltas Anteriores à Matrícula:
              </label>
              <input id="faltas-anteriores" type="number" placeholder="0" value={alunoParaCadastro.faltasAnteriores} onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, faltasAnteriores: e.target.value })} className="block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 shadow-md">
              ➕ Cadastrar Aluno(a)
            </button>
          </form>
        </div>
      )}

      <h3 className="text-xl font-semibold mb-2 mt-8">Data da chamada:</h3>
      <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />

      <h3 className="text-xl font-semibold mt-5 mb-2">Selecionar Turma:</h3>
      <select value={turmaSelecionada} onChange={e => setTurmaSelecionada(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600">
        <option value="">Selecione uma Turma</option>
        {turmasPermitidas().map(turma => (
          <option key={turma} value={turma}>
            {turmasDisponiveis.find(t => normalizeTurmaChar(t.name) === turma)?.name || turma}
          </option>
        ))}
      </select>

      <h3 className="text-xl font-semibold mt-5 mb-2">Filtrar Aluno(a) na Tabela:</h3>
      <input type="text" placeholder="Digite o nome do(a) aluno(a) para filtrar a tabela..." value={termoBuscaTabela} onChange={e => setTermoBuscaTabela(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />

      <div className="mt-8 border border-gray-300 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
        <h3 className="text-xl font-semibold mb-4">Consultar Turma do Aluno(a)</h3>
        <input type="text" placeholder="Digite o nome do(a) aluno(a) para consultar a turma..." value={termoBuscaInformativa || ''} onChange={handleBuscaInformativa} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
        {termoBuscaInformativa && termoBuscaInformativa.length >= 3 && alunoInfoEncontrado && (
          <div className="flex items-center mt-4 text-lg text-gray-800 dark:text-gray-200">
            {alunoInfoEncontrado.fotoUrl && (
              <img src={alunoInfoEncontrado.fotoUrl} alt={`Foto de ${alunoInfoEncontrado.nome}`} className="w-12 h-12 rounded-full object-cover mr-3 border border-gray-300" />
            )}
            <p><strong>{alunoInfoEncontrado.nome}</strong> pertence à turma <strong>{normalizeTurmaChar(alunoInfoEncontrado.turma)}</strong>.</p>
          </div>
        )}
        {termoBuscaInformativa && termoBuscaInformativa.length >= 3 && !alunoInfoEncontrado && (<p className="mt-4 text-red-500">Aluno(a) não encontrado(a).</p>)}
        {(!termoBuscaInformativa || termoBuscaInformativa.length < 3) && (<p className="mt-4 text-gray-500 dark:text-gray-400">Digite pelo menos 3 caracteres para pesquisar.</p>)}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        {/* Botão de Salvar, que fica visível quando há alterações */}
        {hasUnsavedChanges && (
            <button onClick={salvarAlteracoesDePresenca} className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-200 shadow-md animate-pulse">
              💾 Salvar Presenças
            </button>
        )}
        <button onClick={justificarTodos} className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 shadow-md">
          ✅ Justificar Todos
        </button>
        {tipoUsuario === 'gestor' && (<button onClick={reiniciarAlertas} className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors duration-200 shadow-md">
          🔄 Reiniciar
        </button>)}
        <span className="ml-5 font-semibold">📆 Exportar período:</span>
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="ml-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" />

        <div className="relative inline-block text-left">
          <button onClick={() => setShowExportOptions(!showExportOptions)} className="ml-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
            🖨 PDF
          </button>
          {showExportOptions && (
            <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-700" role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
              <div className="py-1" role="none">
                <button onClick={() => exportarPeriodo(false)} className="text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
                  Imprimir Faltas (Lista)
                </button>
                <button onClick={() => exportarPeriodo(true)} className="text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
                  Imprimir Faltas (Todas Turmas)
                </button>
                <button onClick={exportarChamadaGradePDF} className="text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
                  Imprimir Chamada (Grade)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <button onClick={() => setMostrarGraficoFaltas(!mostrarGraficoFaltas)} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200 shadow-md">
          {mostrarGraficoFaltas ? '➖ Ocultar Gráfico de Faltas por Aluno' : '➕ Mostrar Gráfico de Faltas por Aluno'}
        </button>
        <button onClick={() => setMostrarGraficoSemanal(!mostrarGraficoSemanal)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 shadow-md">
          {mostrarGraficoSemanal ? '➖ Ocultar Gráfico Semanal' : '➕ Mostrar Gráfico Semanal'}
        </button>
        {mostrarGraficoSemanal && (
          <button onClick={exportGraficoSemanalPDF} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
            🖨 Exportar Gráfico Semanal
          </button>
        )}
      </div>

      {loading && (<div style={{ textAlign: 'center', fontSize: '1.2em', margin: '20px 0' }}>Carregando dados dos alunos...</div>)}
      {!loading && (
        <>
            {mostrarGraficoSemanal && (
              <div className="mt-8">
                <GraficoSemanal chartRef={graficoSemanalRef} registros={registros} dataInicio={dataInicio} dataFim={dataFim} />
              </div>
            )}
            {mostrarGraficoFaltas && (
              <div className="mt-8">
                <GraficoFaltas chartRef={graficoFaltasRef} registros={registros} dataInicio={dataInicio || REPORT_START_DATE} dataFim={dataFim || getTodayDateString()} turmaSelecionada={turmaSelecionada} tipoUsuario={tipoUsuario} turmasPermitidas={turmasPermitidas()} />
              </div>
            )}
            <Tabela registros={registrosFiltradosParaTabelaEOutros} onAtualizar={atualizarAlunoRegistro} onWhatsapp={enviarWhatsapp} onEditar={editarAluno} onExcluir={handleExcluirAluno} dataSelecionada={dataSelecionada} onOpenObservationDropdown={handleOpenObservationDropdown} onAbrirRelatorio={handleAbrirRelatorioAluno} linhaSelecionada={linhaSelecionada} onSelecionarLinha={setLinhaSelecionada} onAbrirModalRecomposicao={handleAbrirModalRecomposicao} onAbrirModalFoto={handleOpenModalFoto} onViewPhoto={handleViewPhoto} onExcluirFoto={handleExcluirFoto} onTogglePresenca={handleTogglePresenca} onMarcarTodosPresentes={marcarTodosPresentes} />
            {editandoAluno !== null && (
              <div className="mt-8 border border-gray-300 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                <h4 className="text-xl font-semibold mb-4">Editar Aluno(a)</h4>
                <input placeholder="Nome" value={novoAluno.nome} onChange={e => setNovoAluno({ ...novoAluno, nome: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Turma" value={novoAluno.turma} onChange={e => setNovoAluno({ ...novoAluno, turma: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Contato" value={novoAluno.contato} onChange={e => setNovoAluno({ ...novoAluno, contato: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Responsável" value={novoAluno.responsavel} onChange={e => setNovoAluno({ ...novoAluno, responsavel: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Monitor(a)" value={novoAluno.monitor} onChange={e => setNovoAluno({ ...novoAluno, monitor: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {novoAluno.fotoUrl ? (<> <button type="button" onClick={(e) => handleViewPhoto(novoAluno.fotoUrl, e)} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md photo-thumbnail"> Ver Foto Atual </button> <button type="button" onClick={() => handleExcluirFoto(novoAluno)} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-md"> Excluir Foto </button> </> ) : ( <button type="button" onClick={() => handleOpenModalFoto(novoAluno)} className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors duration-200 shadow-md"> Adicionar Foto </button> )}
                </div>
                <button onClick={salvarEdicao} className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 shadow-md"> Salvar </button>
                <button onClick={() => setEditandoAluno(null)} className="ml-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-md"> Cancelar </button>
              </div>
            )}
            {isObservationDropdownOpen && currentAlunoForObservation && (
                <div ref={dropdownRef} className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-3" style={{ top: buttonPosition.top + buttonPosition.height + 5, left: buttonPosition.left, minWidth: '250px', maxWidth: '350px', }}>
                  <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Selecione as Observações para {currentAlunoForObservation.nome}:</h4>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                      {opcoesObservacao.map((opcao, i) => (<div key={i} className="flex items-center">{opcao === "Outros" ? (<label className="flex items-center w-full"><input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded" checked={tempSelectedObservations.has("Outros")} onChange={() => handleCheckboxChange("Outros")} /><span className="ml-2 text-gray-700 dark:text-gray-300">Outros:</span><input type="text" value={otherObservationText} onChange={handleOtherTextChange} placeholder="Digite sua observação personalizada" className="ml-2 flex-grow p-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" /></label>) : (<label className="flex items-center"><input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded" checked={tempSelectedObservations.has(opcao)} onChange={() => handleCheckboxChange(opcao)} /><span className="ml-2 text-gray-700 dark:text-gray-300">{opcao}</span></label>)}</div>))}
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                      <button onClick={closeObservationDropdown} className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors duration-200 shadow-sm">Cancelar</button>
                      <button onClick={handleSaveObservations} className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors duration-200 shadow-sm">Salvar</button>
                      <button onClick={handleSendObservationWhatsApp} className="px-3 py-1 rounded-lg bg-teal-500 text-white text-xs hover:bg-teal-600 transition-colors duration-200 shadow-sm"> Enviar Mensagem (WhatsApp) </button>
                  </div>
                </div>
            )}
            {showCompleteReportModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {completeReportData ? (<> <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white"> Relatório do(a) Aluno(a): {completeReportData.aluno.nome} </h3> {completeReportData.aluno.fotoUrl && ( <div className="mb-4 flex justify-center"> <img src={completeReportData.aluno.fotoUrl} alt={`Foto de ${completeReportData.aluno.nome}`} className="w-32 h-32 object-cover rounded-full border-2 border-gray-300 dark:border-gray-600" /> </div> )} <div className="flex gap-4 mb-6"> <button onClick={exportCompleteReportPDF} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md"> Exportar PDF </button> </div> <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-inner"> <h4 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Dados do Relatório</h4> <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Período Analisado:</strong> {completeReportData.periodo}</p> <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Total de Faltas no Período:</strong> {completeReportData.faltasAluno}</p> <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Turma:</strong> {normalizeTurmaChar(completeReportData.aluno.turma)}</p> <p className="text-gray-700 dark:text-gray-300 mb-1"><strong>Responsável:</strong> {completeReportData.aluno.responsavel}</p> <h5 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Métricas Comparativas:</h5> <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-3"> <li className="font-bold">Percentual de Faltas do(a) Aluno(a): {completeReportData.porcentagemAluno}%</li> <li>Média de Faltas da Turma: {completeReportData.porcentagemTurma}%</li> <li>Média de Faltas da Escola: {completeReportData.porcentagemEscola}%</li> </ul> {completeReportData.justificativasNoPeriodo.length > 0 ? (<> <h5 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">Justificativas de Falta no Período:</h5> <ul className="list-disc list-inside text-gray-700 dark:text-gray-300"> {completeReportData.justificativasNoPeriodo.map((jus, idx) => ( <li key={idx}><strong>{jus.data}:</strong> {jus.justificativa}</li> ))} </ul> </>) : (<p className="text-gray-700 dark:text-gray-300 mt-4">Nenhuma falta justificada registrada para este(a) aluno(a) no período.</p>)} {completeReportData.observacoesAlunoNoPeriodo.length > 0 ? (<> <h5 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">Observações no Período:</h5> <ul className="list-disc list-inside text-gray-700 dark:text-gray-300"> {completeReportData.observacoesAlunoNoPeriodo.map((obs, idx) => ( <li key={idx}><strong>{obs.data}:</strong> {obs.observacoes}</li> ))} </ul> </>) : (<p className="text-gray-700 dark:text-gray-300 mt-4">Nenhuma observação registrada para este(a) aluno(a) no período.</p>)} </div> </>) : (<p>Carregando dados do relatório...</p>)} <div className="flex justify-end mt-6"> <button onClick={() => { setShowCompleteReportModal(false); setSelectedStudentForReport(null); setCompleteReportData(null); }} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-md"> Fechar </button> </div>
                    </div>
                </div>
            )}
            {isRecomporModalOpen && alunoParaRecompor && (
              <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-start justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white"> Recompor Faltas de: {alunoParaRecompor.nome} </h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-300"> Selecione o período para limpar as justificativas deste(a) aluno(a). Esta ação é útil para abonar faltas após a recomposição de aprendizagem. </p>
                  <div className="flex items-center gap-4 mb-4">
                    <div> <label htmlFor="recompor-inicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Início</label> <input type="date" id="recompor-inicio" value={recomporDataInicio} onChange={e => setRecomporDataInicio(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /> </div>
                    <div> <label htmlFor="recompor-fim" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Fim</label> <input type="date" id="recompor-fim" value={recomporDataFim} onChange={e => setRecomporDataFim(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /> </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setIsRecomporModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors duration-200 shadow-md"> Cancelar </button>
                    <button onClick={handleConfirmarRecomposicao} className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-200 shadow-md"> Confirmar Recomposição </button>
                  </div>
                </div>
              </div>
            )}
            {isCameraModalOpen && alunoParaFoto && (<CameraModal aluno={alunoParaFoto} onClose={() => setIsCameraModalOpen(false)} onUploadSuccess={handleUploadSuccess} />)}
            {viewingPhotoUrl && photoViewerPosition && (<div ref={photoViewerRef} style={{ position: 'absolute', top: `${photoViewerPosition.top}px`, left: `${photoViewerPosition.left}px`, zIndex: 100, }} className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700"> <img src={viewingPhotoUrl} alt="Foto do Aluno" className="w-48 h-64 object-cover rounded" /> </div>)}
        </>
      )}
    </div>
  );
};

export default Painel;