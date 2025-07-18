// Arquivo: src/components/Painel.js
// ATUALIZAÇÃO 4: Adicionado contador de atrasos no período.
// ATUALIZAÇÃO 5: Adicionado mecanismo de busca por nome do aluno na tabela.
// ATUALIZAÇÃO 6: Adicionado mecanismo de busca informativa de aluno e turma.
// ATUALIZAÇÃO 7: Implementada 'exclusão lógica' para manter dados históricos em gráficos.
// CORREÇÃO FINAL: Faltas/atrasos de alunos excluídos contabilizados APENAS no GraficoSemanal.
// NOVIDADE FIRESTORE: Integração COMPLETA de leitura e gravação de dados com Cloud Firestore.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// REMOVIDO/MODIFICADO FIRESTORE: 'alunos' não é mais importado do '../dados' para o estado principal
import { turmasDisponiveis, monitoresDisponiveis, gestoresDisponiveis } from '../dados'; // Manter para dados estáticos
import Tabela from './Tabela';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import GraficoFaltas from './GraficoFaltas';
import GraficoSemanal from './GraficoSemanal';
import html2canvas from 'html2canvas';

// NOVIDADE FIRESTORE: Importar db e funções do Firestore
import { db } from '../firebaseConfig'; // Importa a instância do Firestore
import { collection, getDocs, doc, setDoc, updateDoc, writeBatch, getDoc, onSnapshot } from 'firebase/firestore';
 // Funções Firestore

const formatarData = (dataStr) => {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
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

const Painel = ({ usuarioLogado, tipoUsuario, onLogout, senhaUsuario }) => {
  // REMOVIDO/MODIFICADO FIRESTORE: Inicialização de registros não mais do localStorage ou dados.js
  const [registros, setRegistros] = useState([]); // Começamos com array vazio, dados serão carregados do Firestore

  const [temaEscuro, setTemaEscuro] = useState(() => localStorage.getItem('tema') === 'escuro');
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState(() => getTodayDateString());
  const [editandoAluno, setEditandoAluno] = useState(null);
  const [novoAluno, setNovoAluno] = useState({ nome: '', turma: '', contato: '', responsavel: '', monitor: '' });
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [alunoParaCadastro, setAlunoParaCadastro] = useState({
    nome: '',
    turma: '',
    contato: '',
    responsavel: '',
    monitor: '',
    faltasAnteriores: 0,
  });
  const [mostrarFormularioCadastro, setMostrarFormularioCadastro] = useState(false);
  const schoolHeaderRef = useRef(null);
  const [isObservationDropdownOpen, setIsObservationDropdownOpen] = useState(false);
  const [currentAlunoForObservation, setCurrentAlunoForObservation] = useState(null);
  const [tempSelectedObservations, setTempSelectedObservations] = useState(new Set());
  const [otherObservationText, setOtherObservationText] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const dropdownRef = useRef(null);
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
  
  const [termoBuscaInformativa, setTermoBuscaInformativa] = useState('');
  const [alunoInfoEncontrado, setAlunoInfoEncontrado] = useState(null);

  // NOVIDADE FIRESTORE: Estado para indicar se os dados estão sendo carregados
  const [loading, setLoading] = useState(true);

  // NOVIDADE FIRESTORE: useEffect para OUVIR dados do Firestore em TEMPO REAL
 useEffect(() => {
    setLoading(true);
    // A função onSnapshot cria um "ouvinte" que fica ativo.
    // Qualquer alteração na coleção 'alunos' no Firestore irá executar o código abaixo novamente.
    const unsubscribe = onSnapshot(collection(db, 'alunos'), (querySnapshot) => {
        const alunosData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            ativo: doc.data().ativo ?? true
        }));
        setRegistros(alunosData); // Atualiza o estado com os novos dados recebidos
        setLoading(false);
        console.log("Dados sincronizados com o Firestore em tempo real.");
    }, (error) => {
        console.error("Erro ao ouvir atualizações do Firestore:", error);
        alert("Erro de conexão em tempo real. Verifique a internet ou as regras do Firestore.");
        setLoading(false);
    });

    // Esta é a função de "limpeza". Ela é executada quando o componente sai da tela,
    // e serve para remover o "ouvinte", economizando recursos.
    return () => unsubscribe();
}, []); // O array vazio [] garante que o "ouvinte" é configurado apenas uma vez.

  // REMOVIDO/MODIFICADO FIRESTORE: O useEffect para salvar no localStorage não é mais necessário
  useEffect(() => { /* Antigo: localStorage.setItem('registros', JSON.stringify(registros)); */ }, [registros]);
  
  const closeObservationDropdown = useCallback(() => { setIsObservationDropdownOpen(false); setCurrentAlunoForObservation(null); setTempSelectedObservations(new Set()); setOtherObservationText(''); setDropdownPosition({ top: 0, left: 0, width: 0, height: 0 }); }, []);
  useEffect(() => { const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest('.observation-button')) { closeObservationDropdown(); } }; document.addEventListener("mousedown", handleClickOutside); return () => { document.removeEventListener("mousedown", handleClickOutside); }; }, [dropdownRef, closeObservationDropdown]);
  useEffect(() => { document.body.style.backgroundColor = temaEscuro ? '#121212' : '#ffffff'; document.body.style.color = temaEscuro ? '#ffffff' : '#000000'; localStorage.setItem('tema', temaEscuro ? 'escuro' : 'claro'); }, [temaEscuro]);
  const turmasPermitidas = useCallback(() => { let allowedTurmas = []; const usuarioLogadoNormalizado = normalizeTurmaChar(usuarioLogado); if (tipoUsuario === 'gestor') { allowedTurmas = turmasDisponiveis.map(t => normalizeTurmaChar(t.name)); } else { const monitor = monitoresDisponiveis.find(m => normalizeTurmaChar(m.name) === usuarioLogadoNormalizado); if (monitor) { allowedTurmas = monitor.turmas.map(t => normalizeTurmaChar(t)); } } return allowedTurmas; }, [usuarioLogado, tipoUsuario]);
  useEffect(() => { const classes = turmasPermitidas(); if (classes.length > 0 && !turmaSelecionada) { setTurmaSelecionada(classes[0]); } }, [turmasPermitidas, turmaSelecionada]);
  
  // Dados filtrados para a TABELA e para GraficoFaltas/outros relatórios (APENAS ALUNOS ATIVOS)
  const registrosFiltradosParaTabelaEOutros = useMemo(() => {
    return registros
      .filter(a => { 
        // Apenas alunos ATIVOS são exibidos na tabela principal e em outros gráficos/relatórios
        if (a.ativo === false) return false; 

        const turmasDoUsuario = turmasPermitidas();
        const turmaAlunoNormalizada = normalizeTurmaChar(a.turma);
        const pertence = turmasDoUsuario.includes(turmaAlunoNormalizada);
        const turmaSelecionadaNormalizada = normalizeTurmaChar(turmaSelecionada);
        const turmaOk = turmaSelecionada === '' || turmaAlunoNormalizada === turmaSelecionadaNormalizada;

        const buscaTabelaOk = a.nome.toLowerCase().includes(termoBuscaTabela.toLowerCase());

        return pertence && turmaOk && buscaTabelaOk;
      });
  }, [registros, turmaSelecionada, termoBuscaTabela, turmasPermitidas]); // Adicionado useMemo para otimização

  // NOVIDADE FIRESTORE: A função atualizarAlunoRegistro agora interage com o Firestore
  const atualizarAlunoRegistro = useCallback(async (alunoId, alunoAtualizado) => {
    try {
      const alunoDocRef = doc(db, 'alunos', alunoId);
      // Remove o ID do objeto antes de salvar/atualizar, pois o ID já é o nome do documento
      const { id, ...dadosParaSalvar } = alunoAtualizado; 
      await setDoc(alunoDocRef, dadosParaSalvar, { merge: true }); // merge: true para atualizar campos existentes
      
      // Atualiza o estado local após o sucesso no Firestore
      setRegistros(prevRegistros => 
        prevRegistros.map(aluno => aluno.id === alunoId ? { ...aluno, ...alunoAtualizado } : aluno)
      );
      console.log("Aluno atualizado no Firestore com sucesso:", alunoId);
    } catch (error) {
      console.error("Erro ao atualizar aluno no Firestore:", error);
      alert("Erro ao atualizar dados do aluno.");
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
  
  // NOVIDADE FIRESTORE: handleCadastrarAluno agora salva no Firestore
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

    const novoRegistroData = { // Dados que serão salvos no Firestore
      nome: alunoParaCadastro.nome,
      turma: normalizeTurmaChar(alunoParaCadastro.turma),
      contato: alunoParaCadastro.contato,
      responsavel: alunoParaCadastro.responsavel,
      monitor: alunoParaCadastro.monitor,
      justificativas: justificativasIniciais,
      observacoes: {},
      totalDiasLetivos: 100,
      ativo: true 
    };

    try {
      const docRef = doc(collection(db, 'alunos')); // Cria uma nova referência de documento com ID automático
      await setDoc(docRef, novoRegistroData); // Salva os dados do novo aluno no Firestore
      
      // Atualiza o estado local com o novo aluno, incluindo o ID do Firestore
      setRegistros(prev => [...prev, { id: docRef.id, ...novoRegistroData }]);
      setAlunoParaCadastro({ nome: '', turma: '', contato: '', responsavel: '', monitor: '', faltasAnteriores: 0 });
      alert('Aluno(a) cadastrado(a) com sucesso!');
    } catch (error) {
      console.error("Erro ao cadastrar aluno no Firestore:", error);
      alert("Erro ao cadastrar aluno.");
    }
  }, [alunoParaCadastro]);

  // NOVIDADE FIRESTORE: handleExcluirAluno agora atualiza o status 'ativo' no Firestore
  const handleExcluirAluno = useCallback(async (alunoParaExcluir) => { // Recebe o objeto aluno completo
    if (window.confirm("Tem certeza que deseja EXCLUIR este(a) aluno(a)? Ele(a) será removido(a) da lista principal, mas suas faltas e atrasos ANTERIORES continuarão nos relatórios GERAIS (como o Gráfico Semanal).")) { 
      try {
        const alunoDocRef = doc(db, 'alunos', alunoParaExcluir.id); // Pega a referência pelo ID do aluno
        await updateDoc(alunoDocRef, { ativo: false }); // Atualiza apenas o campo 'ativo'
        
        // Atualiza o estado local para refletir a mudança
        setRegistros(prevRegistros => prevRegistros.map(aluno => 
          aluno.id === alunoParaExcluir.id ? { ...aluno, ativo: false } : aluno
        ));
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
      await setDoc(alunoDocRef, dadosParaSalvar, { merge: true }); // merge: true para atualizar campos existentes
      
      // Atualiza o estado local após o sucesso no Firestore
      setRegistros(prevRegistros => 
        prevRegistros.map(aluno => aluno.id === novoAluno.id ? { ...aluno, ...novoAluno } : aluno)
      );
      setEditandoAluno(null);
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
          const chave = `${r.nome}_${normalizeTurmaChar(r.turma)}_${dataSelecionada}`;
          const alunoDocRef = doc(db, 'alunos', r.id);
          const novasJustificativas = { ...r.justificativas, [chave]: motivo };
          batchInstance.update(alunoDocRef, { justificativas: novasJustificativas });
        }
        await batchInstance.commit();

        // Atualiza o estado local após o commit do batch
        setRegistros(prevRegistros => prevRegistros.map(r => {
          if (alunosParaAtualizar.some(a => a.id === r.id)) {
            const chave = `${r.nome}_${normalizeTurmaChar(r.turma)}_${dataSelecionada}`;
            return { ...r, justificativas: { ...r.justificativas, [chave]: motivo } };
          }
          return r;
        }));
        alert("Faltas justificadas no Firestore com sucesso!");
      } catch (error) {
        console.error("Erro ao justificar todos no Firestore:", error);
        alert("Erro ao justificar faltas.");
      }
    } 
  }, [dataSelecionada, usuarioLogado, turmasPermitidas, registrosFiltradosParaTabelaEOutros]);


  // NOVIDADE FIRESTORE: reiniciarAlertas agora atualiza no Firestore (usando batch)
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
            // NÃO remove o aluno, apenas reseta justificativas/observações e o torna ativo
            batchInstance.update(alunoDocRef, { justificativas: {}, observacoes: {}, ativo: true }); 
          });
          await batchInstance.commit();

          // Atualiza o estado local após o commit do batch
          setRegistros(prev => prev.map(aluno => ({...aluno, justificativas: {}, observacoes: {}, ativo: true})));
          alert("Alertas reiniciados no Firestore com sucesso!"); 
        } catch (error) {
          console.error("Erro ao reiniciar alertas no Firestore:", error);
          alert("Erro ao reiniciar alertas.");
        }
      } 
    } else if (senhaDigitada !== null) { alert("Senha incorreta. Reinício cancelado."); } 
  }, [tipoUsuario, senhaUsuario]);

  // NOVIDADE FIRESTORE: handleSaveObservations agora atualiza no Firestore
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

      // Atualiza o estado local
      setRegistros(prevRegistros => prevRegistros.map(aluno => 
        aluno.id === currentAlunoForObservation.id ? { ...aluno, observacoes: updatedObservations } : aluno
      ));
      alert("Observações salvas no Firestore com sucesso!");
      closeObservationDropdown(); 
    } catch (error) {
      console.error("Erro ao salvar observações no Firestore:", error);
      alert("Erro ao salvar observações.");
    }
  }, [currentAlunoForObservation, tempSelectedObservations, otherObservationText, dataSelecionada, closeObservationDropdown]);

  const enviarWhatsapp = useCallback((aluno) => { const [ano, mes, dia] = dataSelecionada.split('-').map(Number); const dataObj = new Date(ano, mes - 1, dia); const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']; const diaSemana = diasSemana[dataObj.getDay()]; const dataFormatada = formatarData(dataSelecionada); const texto = `Olá, ${aluno.responsavel}, informamos que ${aluno.nome} (${normalizeTurmaChar(aluno.turma)}) esteve ausente na escola em ${dataFormatada} (${diaSemana}). Por favor, justificar a ausência.\n\nLembramos que faltas não justificadas podem resultar em notificações formais, conforme as diretrizes educacionais.\n\nAguardamos seu retorno.\n\nAtenciosamente,\nMonitor(a) ${usuarioLogado}\nEscola Cívico-Militar Profª Ana Maria das Graças de Souza Noronha`; const link = `https://wa.me/55${aluno.contato.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(texto)}`; window.open(link, '_blank'); }, [dataSelecionada, usuarioLogado]);
  
  // Arquivo: src/components/Painel.js

// ... (resto do seu código)

  // CORREÇÃO DE SINTAXE E AGORA COMPLETA: exportarPeriodo
  const exportarPeriodo = useCallback(() => { 
    if (!dataInicio || !dataFim) return alert('Selecione o período completo!'); 
    const doc = new jsPDF(); 
    const pageWidth = doc.internal.pageSize.getWidth(); 
    const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`; 
    const logoUrl = '/logo-escola.png'; // Garanta que este arquivo esteja na pasta /public
    let yOffset = 10; 

    const addContentToDoc = () => { 
      doc.setFontSize(10); 
      const reportTitle = `Relatório por Período (${formatarData(dataInicio)} a ${formatarData(dataFim)}) - ${tipoUsuario} ${usuarioLogado}`; 
      doc.text(reportTitle, pageWidth / 2, yOffset, { align: 'center' }); 
      yOffset += 10; 
      const periodo = []; 
      
      registros.filter(a => a.ativo).forEach((aluno) => { 
        if (!aluno.justificativas) return; 

        Object.entries(aluno.justificativas).forEach(([chave, justificativa]) => { 
          const partes = chave.split('_'); 
          const data = partes[2]; 
          const turmasDoUsuario = turmasPermitidas(); 
          const turmaAlunoNormalizada = normalizeTurmaChar(aluno.turma); 

          if (data >= dataInicio && data <= dataFim && turmasDoUsuario.includes(turmaAlunoNormalizada)) { 
            // <--- ESTA É A LINHA PRINCIPAL
            // O último item da lista, `aluno.monitor || ''`, é o que preenche a coluna "Monitor(a)".
            periodo.push([
              aluno.nome, 
              turmaAlunoNormalizada, 
              aluno.contato || '', 
              aluno.responsavel || '', 
              justificativa, 
              formatarData(data), 
              aluno.monitor || '' // Garante que o nome do monitor seja adicionado.
            ]); 
          } 
        }); 
      }); 

      autoTable(doc, { 
        startY: yOffset, 
        head: [['Nome', 'Turma', 'Contato', 'Responsável', 'Justificativa', 'Data', 'Monitor(a)']], 
        body: periodo, 
        styles: { fontSize: 8, halign: 'center' }, 
        headStyles: { fillColor: [37, 99, 235], halign: 'center' }, 
      }); 

      doc.save(`faltas_${dataInicio}_a_${dataFim}.pdf`); 
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
  }, [dataInicio, dataFim, usuarioLogado, tipoUsuario, registros, turmasPermitidas]); 

  // NOVIDADE FIRESTORE: editarAluno agora usa o ID do aluno
  const editarAluno = useCallback((alunoOriginal) => { 
    setNovoAluno(alunoOriginal); // Define o aluno a ser editado
    // Usa o ID do Firestore como chave de edição se existir, senão o originalIndex
    setEditandoAluno(alunoOriginal.id || alunoOriginal.originalIndex); 
  }, []);

  // NOVIDADE FIRESTORE: handleOpenObservationDropdown agora usa o ID do aluno
  const handleOpenObservationDropdown = useCallback((aluno, event) => { // Removido o 'index'
    if (isObservationDropdownOpen && currentAlunoForObservation && currentAlunoForObservation.id === aluno.id) { closeObservationDropdown(); return; } 
    const rect = event.currentTarget.getBoundingClientRect(); 
    setDropdownPosition({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height }); 
    setCurrentAlunoForObservation(aluno); 
    setIsObservationDropdownOpen(true); 
    const chaveObservacao = `${aluno.nome}_${normalizeTurmaChar(aluno.turma)}_${dataSelecionada}`; 
    const existingObservations = aluno.observacoes?.[chaveObservacao] || []; 
    const existingObservationsArray = Array.isArray(existingObservations) ? existingObservations : (existingObservations ? [existingObservations] : []); 
    const initialSet = new Set(); let initialOtherText = ''; existingObservationsArray.forEach(obs => { if (obs.startsWith("Outros: ")) { initialOtherText = obs.replace("Outros: ", ""); initialSet.add("Outros"); } else { initialSet.add(obs); } }); setTempSelectedObservations(initialSet); setOtherObservationText(initialOtherText); 
  }, [isObservationDropdownOpen, currentAlunoForObservation, dataSelecionada, closeObservationDropdown]);
  
  const handleCheckboxChange = useCallback((option) => { setTempSelectedObservations(prev => { const newSet = new Set(prev); if (newSet.has(option)) { newSet.delete(option); } else { newSet.add(option); } return newSet; }); if (option === "Outros" && tempSelectedObservations.has("Outros")) { setOtherObservationText(''); } }, [tempSelectedObservations]);
  const handleOtherTextChange = useCallback((e) => { const text = e.target.value; setOtherObservationText(text); if (text.trim() !== '' && !tempSelectedObservations.has("Outros")) { setTempSelectedObservations(prev => new Set(prev).add("Outros")); } else if (text.trim() === '' && tempSelectedObservations.has("Outros")) { const newSet = new Set(tempSelectedObservations); newSet.delete("Outros"); setTempSelectedObservations(newSet); } }, [tempSelectedObservations]);
  const calculateCompleteReport = useCallback((aluno) => { if (!aluno) return null; const today = getTodayDateString(); const startDate = REPORT_START_DATE; const start = new Date(startDate); const end = new Date(today); let actualDaysInPeriod = 0; for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { const dayOfWeek = d.getDay(); if (dayOfWeek !== 0 && dayOfWeek !== 6) { actualDaysInPeriod++; } } if (actualDaysInPeriod === 0) actualDaysInPeriod = 1; let faltasAluno = 0; const alunoJustificativas = aluno.justificativas || {}; const justificativasNoPeriodo = []; Object.entries(alunoJustificativas).forEach(([chave, justificativa]) => { const partes = chave.split('_'); const data = partes[2]; if (data >= startDate && data <= today && justificativa && justificativa !== "Selecione") { faltasAluno++; justificativasNoPeriodo.push({ data: formatarData(data), justificativa: justificativa.startsWith("Outros: ") ? justificativa.substring(8) : justificativa, }); } }); const totalDiasLetivos = aluno.totalDiasLetivos || 100; const porcentagemAluno = ((faltasAluno / totalDiasLetivos) * 100).toFixed(2); let faltasTurma = 0; let totalAlunosNaTurma = new Set(); 
    // NOVIDADE: Para o relatório completo, consideramos apenas os alunos ATIVOS para as médias comparativas da turma/escola.
    registros.filter(a => a.ativo).forEach(r => { if (normalizeTurmaChar(r.turma) === normalizeTurmaChar(aluno.turma)) { totalAlunosNaTurma.add(r.nome); const rJustificativas = r.justificativas || {}; Object.entries(rJustificativas).forEach(([chave, justificativa]) => { const partes = chave.split('_'); const data = partes[2]; if (data >= startDate && data <= today && justificativa !== "") { faltasTurma++; } }); } }); const numAlunosNaTurma = totalAlunosNaTurma.size > 0 ? totalAlunosNaTurma.size : 1; const totalDiasLetivosTurma = numAlunosNaTurma * actualDaysInPeriod; const porcentagemTurma = totalDiasLetivosTurma > 0 ? ((faltasTurma / totalDiasLetivosTurma) * 100).toFixed(2) : 0; let faltasEscola = 0; let totalAlunosNaEscola = new Set(); 
    registros.filter(a => a.ativo).forEach(r => { totalAlunosNaEscola.add(r.nome); const rJustificativas = r.justificativas || {}; Object.entries(rJustificativas).forEach(([chave, justificativa]) => { const partes = chave.split('_'); const data = partes[2]; if (data >= startDate && data <= today && justificativa !== "") { faltasEscola++; } }); }); const numAlunosNaEscola = totalAlunosNaEscola.size > 0 ? totalAlunosNaEscola.size : 1; const totalDiasLetivosEscola = numAlunosNaEscola * actualDaysInPeriod; const porcentagemEscola = totalDiasLetivosEscola > 0 ? ((faltasEscola / totalDiasLetivosEscola) * 100).toFixed(2) : 0; const observacoesAlunoNoPeriodo = []; Object.entries(aluno.observacoes || {}).forEach(([chave, obsArray]) => { const partes = chave.split('_'); const dataObs = partes[2]; if (dataObs >= startDate && dataObs <= today && Array.isArray(obsArray) && obsArray.length > 0) { observacoesAlunoNoPeriodo.push({ data: formatarData(dataObs), observacoes: obsArray.join('; ') }); } }); return { aluno, periodo: `${formatarData(startDate)} a ${formatarData(today)}`, diasLetivosNoPeriodo: actualDaysInPeriod, faltasAluno, porcentagemAluno, faltasTurma, porcentagemTurma, faltasEscola, porcentagemEscola, observacoesAlunoNoPeriodo, justificativasNoPeriodo }; }, [registros]);
  const handleAbrirRelatorioAluno = useCallback((aluno) => { const reportData = calculateCompleteReport(aluno); setCompleteReportData(reportData); setSelectedStudentForReport(aluno); setShowCompleteReportModal(true); }, [calculateCompleteReport]);
  const exportCompleteReportPDF = useCallback(() => { if (!completeReportData) { alert('Não há dados de relatório para exportar.'); return; } const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); const schoolName = `ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`; const logoUrl = '/logo-escola.png'; let yOffset = 10; const addContentToDoc = () => { doc.setFontSize(14); doc.text(`Relatório do(a) Aluno(a): ${completeReportData.aluno.nome}`, pageWidth / 2, yOffset, { align: 'center' }); yOffset += 10; doc.setFontSize(10); doc.text(`Período do Relatório: ${completeReportData.periodo}`, 14, yOffset); yOffset += 7; doc.text(`Total de Faltas no Período: ${completeReportData.faltasAluno} (${completeReportData.porcentagemAluno}%)`, 14, yOffset); yOffset += 7; doc.text(`Turma: ${normalizeTurmaChar(completeReportData.aluno.turma)}`, 14, yOffset); yOffset += 7; doc.text(`Contato: ${completeReportData.aluno.contato}`, 14, yOffset); yOffset += 7; doc.text(`Responsável: ${completeReportData.aluno.responsavel}`, 14, yOffset); yOffset += 10; doc.setFontSize(12); doc.text('Métricas Comparativas:', 14, yOffset); yOffset += 7; doc.setFontSize(10); doc.text(`Percentual de Faltas do(a) Aluno(a): ${completeReportData.porcentagemAluno}%`, 14, yOffset); yOffset += 7; doc.text(`Média de Faltas da Turma: ${completeReportData.porcentagemTurma}%`, 14, yOffset); yOffset += 7; doc.text(`Média de Faltas da Escola: ${completeReportData.porcentagemEscola}%`, 14, yOffset); yOffset += 10; let finalY = yOffset; if (completeReportData.justificativasNoPeriodo.length > 0) { doc.setFontSize(12); doc.text('Justificativas de Falta no Período:', 14, finalY); finalY += 5; const jusBody = completeReportData.justificativasNoPeriodo.map(jus => [jus.data, jus.justificativa]); autoTable(doc, { startY: finalY, head: [['Data', 'Justificativa']], body: jusBody, styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] } }); finalY = doc.lastAutoTable.finalY; } if (completeReportData.observacoesAlunoNoPeriodo.length > 0) { doc.setFontSize(12); doc.text('Observações no Período:', 14, finalY + 10); finalY += 15; const obsBody = completeReportData.observacoesAlunoNoPeriodo.map(obs => [obs.data, obs.observacoes]); autoTable(doc, { startY: finalY, head: [['Data', 'Observações']], body: obsBody, styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] } }); } doc.save(`relatorio_completo_${completeReportData.aluno.nome.replace(/ /g, '_')}.pdf`); }; const img = new Image(); img.src = logoUrl; img.crossOrigin = "Anonymous"; img.onload = () => { const logoWidth = 20; const logoHeight = (img.height * logoWidth) / img.width; const xLogo = (pageWidth - logoWidth) / 2; doc.addImage(img, 'PNG', xLogo, yOffset, logoWidth, logoHeight); yOffset += logoHeight + 5; doc.setFontSize(9); doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' }); yOffset += 10; addContentToDoc(); }; img.onerror = () => { console.error("Erro ao carregar a logo. Gerando PDF sem a imagem."); doc.setFontSize(12); doc.text(schoolName, pageWidth / 2, yOffset, { align: 'center' }); yOffset += 15; addContentToDoc(); }; }, [completeReportData]);
  const handleAbrirModalRecomposicao = useCallback((aluno) => { setAlunoParaRecompor(aluno); setIsRecomporModalOpen(true); setRecomporDataInicio(''); setRecomporDataFim(''); }, []);
  const handleConfirmarRecomposicao = useCallback(() => { if (!alunoParaRecompor || !recomporDataInicio || !recomporDataFim) { alert("Por favor, selecione o período completo para a recomposição."); return; } if (window.confirm(`Tem certeza que deseja limpar as justificativas de ${alunoParaRecompor.nome} no período de ${formatarData(recomporDataInicio)} a ${formatarData(recomporDataFim)}?`)) { setRegistros(prevRegistros => { const novosRegistros = [...prevRegistros]; const alunoIndex = alunoParaRecompor.originalIndex; const aluno = novosRegistros[alunoIndex]; if (!aluno || !aluno.justificativas) { return prevRegistros; } const novasJustificativas = { ...aluno.justificativas }; Object.keys(novasJustificativas).forEach(chave => { const dataDaFalta = chave.split('_')[2]; if (dataDaFalta >= recomporDataInicio && dataDaFalta <= recomporDataFim) { delete novasJustificativas[chave]; } }); novosRegistros[alunoIndex] = { ...aluno, justificativas: novasJustificativas, }; alert("Justificativas do período foram limpas com sucesso!"); return novosRegistros; }); setIsRecomporModalOpen(false); setAlunoParaRecompor(null); } }, [alunoParaRecompor, recomporDataInicio, recomporDataFim]);

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
              <input 
                id="faltas-anteriores"
                type="number" 
                placeholder="0" 
                value={alunoParaCadastro.faltasAnteriores} 
                onChange={e => setAlunoParaCadastro({ ...alunoParaCadastro, faltasAnteriores: e.target.value })} 
                className="block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
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
          <p className="mt-4 text-lg text-gray-800 dark:text-gray-200">
            **{alunoInfoEncontrado.nome}** pertence à turma **{normalizeTurmaChar(alunoInfoEncontrado.turma)}**.
          </p>
        )}
        {termoBuscaInformativa.length >= 3 && !alunoInfoEncontrado && (
          <p className="mt-4 text-red-500">Aluno(a) não encontrado(a).</p>
        )}
        {termoBuscaInformativa.length < 3 && (
            <p className="mt-4 text-gray-500 dark:text-gray-400">Digite pelo menos 3 caracteres para pesquisar.</p>
        )}
      </div>
      {/* Fim do novo mecanismo de busca informativa */}

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
        <button onClick={exportarPeriodo} className="ml-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
          🖨 PDF
        </button>
      </div>
      
      <div className="mt-5">
        <button onClick={() => setMostrarGrafico(!mostrarGrafico)} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200 shadow-md">
          {mostrarGrafico ? '➖ Ocultar Gráficos' : '➕ Mostrar Gráficos'}
        </button>
      </div>

      {loading && ( // NOVIDADE FIRESTORE: Indicador de carregamento
        <div style={{ textAlign: 'center', fontSize: '1.2em', margin: '20px 0' }}>
          Carregando dados dos alunos...
        </div>
      )}
      {!loading && ( // Renderiza o conteúdo apenas depois de carregar
        <>
            {mostrarGrafico && (
              <>
                  <GraficoSemanal 
                      registros={registros} // NOVIDADE: AJUSTE PARA GRÁFICO SEMANAL - Recebe TODOS os registros (ativos e inativos)
                      dataInicio={dataInicio || REPORT_START_DATE} 
                      dataFim={dataFim || getTodayDateString()} 
                  />
                  <GraficoFaltas 
                      registros={registrosFiltradosParaTabelaEOutros} // NOVIDADE: AJUSTE PARA GRÁFICO SEMANAL - Recebe APENAS os registros ativos
                      dataInicio={dataInicio || REPORT_START_DATE} 
                      dataFim={dataFim || getTodayDateString()} 
                      turmaSelecionada={turmaSelecionada} 
                      tipoUsuario={tipoUsuario} 
                      turmasPermitidas={turmasPermitidas()} 
                  />
              </>
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
            />

            {editandoAluno !== null && (
              <div className="mt-8 border border-gray-300 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                <h4 className="text-xl font-semibold mb-4">Editar Aluno(a)</h4>
                <input placeholder="Nome" value={novoAluno.nome} onChange={e => setNovoAluno({ ...novoAluno, nome: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Turma" value={novoAluno.turma} onChange={e => setNovoAluno({ ...novoAluno, turma: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Contato" value={novoAluno.contato} onChange={e => setNovoAluno({ ...novoAluno, contato: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Responsável" value={novoAluno.responsavel} onChange={e => setNovoAluno({ ...novoAluno, responsavel: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <input placeholder="Monitor(a)" value={novoAluno.monitor} onChange={e => setNovoAluno({ ...novoAluno, monitor: e.target.value })} className="block w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600" /><br />
                <button onClick={salvarEdicao} className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors duration-200 shadow-md">
                  Salvar
                </button>
                <button onClick={() => setEditandoAluno(null)} className="ml-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-md">
                  Cancelar
                </button>
              </div>
            )}

            {isObservationDropdownOpen && currentAlunoForObservation && (
                <div ref={dropdownRef} className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-3" style={{ top: dropdownPosition.top + dropdownPosition.height + 5, left: dropdownPosition.left, minWidth: '250px', maxWidth: '350px', }}>
                  <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Selecione as Observações para {currentAlunoForObservation.nome}:</h4>
                  <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
                      {opcoesObservacao.map((opcao, i) => (<div key={i} className="flex items-center">{opcao === "Outros" ? (<label className="flex items-center w-full"><input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded" checked={tempSelectedObservations.has("Outros")} onChange={() => handleCheckboxChange("Outros")} /><span className="ml-2 text-gray-700 dark:text-gray-300">Outros:</span><input type="text" value={otherObservationText} onChange={handleOtherTextChange} placeholder="Digite sua observação personalizada" className="ml-2 flex-grow p-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" /></label>) : (<label className="flex items-center"><input type="checkbox" className="form-checkbox h-4 w-4 text-blue-600 rounded" checked={tempSelectedObservations.has(opcao)} onChange={() => handleCheckboxChange(opcao)} /><span className="ml-2 text-gray-700 dark:text-gray-300">{opcao}</span></label>)}</div>))}
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                      <button onClick={closeObservationDropdown} className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors duration-200 shadow-sm">Cancelar</button>
                      <button onClick={handleSaveObservations} className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs hover:bg-green-600 transition-colors duration-200 shadow-sm">Salvar</button>
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
                              <p className="text-gray-700 dark:text-gray-300 mb-3"><strong>Responsável:</strong> {completeReportData.aluno.responsavel}</p>

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
        </>
      )} {/* Fim da renderização condicional do loading */}
    </div>
  );
};

export default Painel;