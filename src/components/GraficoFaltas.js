// Arquivo: src/components/GraficoFaltas.js
// ATUALIZAÇÃO: Lógica de permissão implementada para diferenciar a visão de gestores e monitores.
// ATUALIZAÇÃO 2: Gráfico 'Faltas por Justificativa (na Turma)' agora exibe contagens inteiras.
// ATUALIZAÇÃO 3: Gráfico 'Porcentagem de Faltas por Turma' agora exibe TODAS as turmas.
// CORREÇÃO: Ajustado o eixo Y para números inteiros no gráfico 'Porcentagem de Faltas por Aluno (na Turma)'.
// CORREÇÃO FINAL: Eixo Y do gráfico 'Faltas por Justificativa (na Turma)' agora exibe números inteiros.
// NOVIDADE: Gráfico 'Porcentagem de Faltas por Aluno' agora exibe dados de TODOS os alunos (todas as turmas).
// CORREÇÃO ESSENCIAL: Gráfico 'Porcentagem de Faltas por Turma' agora garante que TODAS as 22 turmas sejam exibidas.
// CORREÇÃO DE ERRO: Importado 'turmasDisponiveis' para resolver 'ReferenceError'.
// CORREÇÃO DE EXPORTAÇÃO: Ref do gráfico 'Porcentagem de Faltas por Aluno' agora é passada corretamente para o Chart.js.
// NOVIDADE DE UI: Botão 'Alunos PDF' movido ao lado de 'Justificativas PDF' e com período no label.
// MODIFICAÇÃO DE EXPORTAÇÃO: Botão de exportação do gráfico de alunos agora está neste componente.
// CORREÇÃO REFERENCEREEROR: A variável 'cores' foi movida para ser declarada antes de seu uso.
// CORREÇÃO VISUAL DE CORES: O gráfico 'Faltas por Justificativa (na Turma)' agora é um gráfico de barras simples
//                           (não empilhado) que mostra o total de faltas por tipo de justificativa,
//                           com cores consistentes para cada barra.
// NOVIDADE: Adicionado o total de faltas do período no título do gráfico 'Faltas por Justificativa (na Turma)'.
// NOVIDADE: Adicionado o percentual de cada justificativa no tooltip do gráfico 'Faltas por Justificativa (na Turma)'.
// NOVIDADE: O gráfico 'Porcentagem de Faltas por Aluno' agora exibe APENAS os alunos da turma selecionada.
// NOVIDADE: Adicionados botões individuais para ocultar/mostrar cada um dos três gráficos.
// NOVIDADE: Os três gráficos individuais agora começam ocultos por padrão.
// NOVIDADE DE UI: Botões de exportação PDF movidos para uma linha superior separada.

import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { turmasDisponiveis } from '../dados'; // CORREÇÃO: Importado turmasDisponiveis

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const formatarData = (dataStr) => {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
};

const normalizeTurmaChar = (turma) => {
    return String(turma).replace(/°/g, 'º');
};

// MODIFICAÇÃO: Adicionado 'chartRef' como prop
const GraficoFaltas = ({ registros, dataInicio, dataFim, turmaSelecionada, tipoUsuario, turmasPermitidas, chartRef }) => {
  const [mostrarGrafico, setMostrarGrafico] = useState(true); // Controla o bloco principal dos gráficos
  // NOVOS ESTADOS: Inicializados como FALSE para começar ocultos
  const [mostrarJustificativaChart, setMostrarJustificativaChart] = useState(false);
  const [mostrarAlunosChart, setMostrarAlunosChart] = useState(false);
  const [mostrarTurmasChart, setMostrarTurmasChart] = useState(false);

  // Declarar 'cores' AQUI, antes do seu primeiro uso
  const cores = ['rgba(75,192,192,0.6)', 'rgba(255,99,132,0.6)', 'rgba(255,206,86,0.6)', 'rgba(54,162,235,0.6)', 'rgba(153,102,255,0.6)', 'rgba(255,159,64,0.6)'];

  // Filtra os registros para o gráfico de justificativa (ainda baseado na turma selecionada)
  const registrosParaGraficoJustificativa = registros.filter(aluno => 
    normalizeTurmaChar(aluno.turma) === normalizeTurmaChar(turmaSelecionada)
  );

  // --- Cálculos para Gráfico de Faltas por Justificativa (na Turma) ---
  // Alterado para contar o TOTAL de faltas por TIPO de justificativa
  const contagemTotalPorJustificativa = {}; 
  registrosParaGraficoJustificativa.forEach(aluno => {
    if (!aluno.justificativas) return;

    Object.entries(aluno.justificativas).forEach(([chave, justificativa]) => {
      const [, , data] = chave.split('_');
      if (data >= dataInicio && data <= dataFim) {
        // Agora, apenas conta o total para cada justificativa
        contagemTotalPorJustificativa[justificativa] = (contagemTotalPorJustificativa[justificativa] || 0) + 1;
      }
    });
  });

  // Garante que as justificativas sejam ordenadas de forma consistente
  const labelsJustificativa = Object.keys(contagemTotalPorJustificativa).sort();
  const dataJustificativa = labelsJustificativa.map(just => contagemTotalPorJustificativa[just]);

  // Calcular o total de faltas no período para este gráfico
  const totalFaltasNoGraficoJustificativa = dataJustificativa.reduce((sum, count) => sum + count, 0);

  const dadosGraficoJustificativa = {
    labels: labelsJustificativa,
    datasets: [{
      label: 'Número de Faltas',
      data: dataJustificativa,
      // Atribui uma cor diferente para cada barra com base no seu índice nos labels
      backgroundColor: labelsJustificativa.map((_, idx) => cores[idx % cores.length]),
      borderColor: labelsJustificativa.map((_, idx) => cores[idx % cores.length].replace('0.6', '1')),
      borderWidth: 1,
    }],
  };


  // --- Cálculos para Gráfico de Porcentagem de Faltas por Aluno (APENAS alunos da turma selecionada) ---
  const totalFaltasPorAlunosNaTurmaSelecionada = {};
  // NOVIDADE: Filtra os registros para incluir APENAS os alunos da turma selecionada
  registros
    .filter(aluno => normalizeTurmaChar(aluno.turma) === normalizeTurmaChar(turmaSelecionada))
    .forEach(aluno => { 
    const totalDiasLetivosAluno = aluno.totalDiasLetivos || 100;
    if (!totalFaltasPorAlunosNaTurmaSelecionada[aluno.nome]) {
      totalFaltasPorAlunosNaTurmaSelecionada[aluno.nome] = { faltas: 0, totalDiasLetivos: totalDiasLetivosAluno };
    }
    if (!aluno.justificativas) return;

    Object.entries(aluno.justificativas).forEach(([chave, justificativa]) => {
      const [, , data] = chave.split('_');
      if (data >= dataInicio && data <= dataFim) {
        totalFaltasPorAlunosNaTurmaSelecionada[aluno.nome].faltas += 1;
      }
    });
  });

  const porcentagensAlunosNaTurmaSelecionada = Object.keys(totalFaltasPorAlunosNaTurmaSelecionada).map(nomeAluno => {
    const dadosAluno = totalFaltasPorAlunosNaTurmaSelecionada[nomeAluno];
    const porcentagem = (dadosAluno.faltas / dadosAluno.totalDiasLetivos) * 100;
    return { nome: nomeAluno, porcentagem: porcentagem.toFixed(2) };
  });

  // --- Cálculos para Gráficos de Turma e Escola (Usa dados completos) ---
  // MODIFICAÇÃO ESSENCIAL: Inicializa faltasPorTurma com TODAS as turmas disponíveis
  const faltasPorTurma = {};
  turmasDisponiveis.forEach(turma => {
    const turmaNormalizada = normalizeTurmaChar(turma.name);
    faltasPorTurma[turmaNormalizada] = { faltas: 0, alunos: new Set(), totalDiasLetivos: 0 };
  });


  let totalFaltasEscola = 0;
  let totalDiasLetivosEscola = 0;

  registros.forEach(aluno => {
    const turmaNormalizada = normalizeTurmaChar(aluno.turma);
    const totalDiasLetivosAluno = aluno.totalDiasLetivos || 100;
    
    // Garante que a turma existe no objeto, mesmo que não estivesse nos turmasDisponiveis (caso de dados inconsistentes)
    if (!faltasPorTurma[turmaNormalizada]) {
      faltasPorTurma[turmaNormalizada] = { faltas: 0, alunos: new Set(), totalDiasLetivos: 0 };
    }
    faltasPorTurma[turmaNormalizada].alunos.add(aluno.nome);
    faltasPorTurma[turmaNormalizada].totalDiasLetivos += totalDiasLetivosAluno;
    
    totalDiasLetivosEscola += totalDiasLetivosAluno;

    if (!aluno.justificativas) return;

    Object.entries(aluno.justificativas).forEach(([chave, justificativa]) => {
      const [, , data] = chave.split('_');
      if (data >= dataInicio && data <= dataFim) {
        faltasPorTurma[turmaNormalizada].faltas += 1;
        totalFaltasEscola += 1;
      }
    });
  });

  // --- Cálculo das Porcentagens de Turmas ---
  const porcentagensTurmas = Object.keys(faltasPorTurma)
    .map(turma => {
      const dadosTurma = faltasPorTurma[turma];
      const numAlunosNaTurma = dadosTurma.alunos.size;
      // Se não houver alunos na turma, use 1 para evitar divisão por zero e exibir 0%
      const totalDiasLetivosTurma = numAlunosNaTurma > 0 ? numAlunosNaTurma * 100 : 1; 
      const porcentagem = (dadosTurma.faltas / totalDiasLetivosTurma) * 100;
      return { turma, porcentagem: porcentagem.toFixed(2) };
    });
  
  // Garante que as turmas sejam ordenadas para exibição consistente
  porcentagensTurmas.sort((a, b) => a.turma.localeCompare(b.turma));


  const porcentagemEscola = totalDiasLetivosEscola > 0 ? ((totalFaltasEscola / totalDiasLetivosEscola) * 100).toFixed(2) : 0;

  // --- Dados para os Gráficos ---
  
  const dadosGraficoAlunos = { 
    labels: porcentagensAlunosNaTurmaSelecionada.map(p => p.nome), 
    datasets: [{ 
      label: 'Porcentagem de Faltas', 
      data: porcentagensAlunosNaTurmaSelecionada.map(p => parseFloat(p.porcentagem)), 
      backgroundColor: cores[0], 
      borderColor: cores[0].replace('0.6', '1'), 
      borderWidth: 1, 
    }] 
};
  const dadosGraficoTurmas = { labels: porcentagensTurmas.map(p => p.turma), datasets: [{ label: 'Porcentagem de Faltas', data: porcentagensTurmas.map(p => parseFloat(p.porcentagem)), backgroundColor: cores[1], borderColor: cores[1].replace('0.6', '1'), borderWidth: 1, }] };

  const exportarGraficoPDF = async (chartId, title) => {
    const element = document.getElementById(chartId);
    if (!element) {
      // Adiciona uma verificação para o período antes de alertar sobre o gráfico
      if (!dataInicio || !dataFim) {
        alert('Selecione o período completo para exportar o gráfico.');
        return;
      }
      alert('Gráfico não encontrado para exportação. Certifique-se de que ele está visível.');
      return;
    }

    // Adicionado setTimeout para garantir que o gráfico esteja renderizado
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const canvas = await html2canvas(element, { 
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
  };

  return (
    <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-2xl font-bold mb-4">📊 Gráficos de Faltas e Porcentagens</h3>
      {/* NOVA LINHA PARA BOTÕES DE EXPORTAÇÃO */}
      <div className="flex flex-wrap gap-3 mb-4"> {/* Adicionada uma nova div para os botões de exportação */}
        {mostrarGrafico && (
          <>
            {mostrarJustificativaChart && <button onClick={() => exportarGraficoPDF('grafico-justificativa', `Gráfico de Faltas por Justificativa (${formatarData(dataInicio)} a ${formatarData(dataFim)}) - Total: ${totalFaltasNoGraficoJustificativa}`)} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
              🖨 Justificativas PDF
            </button>}
            {mostrarAlunosChart && <button onClick={() => exportarGraficoPDF('grafico-alunos', `Porcentagem de Faltas por Aluno (Turma Selecionada: ${turmaSelecionada}) (${formatarData(dataInicio)} a ${formatarData(dataFim)})`)} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
              🖨 Alunos PDF ({formatarData(dataInicio)} a {formatarData(dataFim)})
            </button>}
            {mostrarTurmasChart && <button onClick={() => exportarGraficoPDF('grafico-turmas', `Porcentagem de Faltas por Turma (${formatarData(dataInicio)} a ${formatarData(dataFim)})`)} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
              🖨 Turmas PDF
            </button>}
          </>
        )}
      </div>

      {/* LINHA COM BOTÕES DE VISIBILIDADE DOS GRÁFICOS */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => setMostrarGrafico(!mostrarGrafico)} className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors duration-200 shadow-md">
          {mostrarGrafico ? '🔽 Ocultar Todos os Gráficos' : '▶️ Mostrar Todos os Gráficos'}
        </button>
        {mostrarGrafico && (
          <>
            {/* Botões individuais para mostrar/ocultar os gráficos */}
            <button onClick={() => setMostrarJustificativaChart(!mostrarJustificativaChart)} className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200 shadow-md">
              {mostrarJustificativaChart ? '➖ Ocultar Faltas por Justificativa' : '➕ Mostrar Faltas por Justificativa'}
            </button>
            <button onClick={() => setMostrarAlunosChart(!mostrarAlunosChart)} className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200 shadow-md">
              {mostrarAlunosChart ? '➖ Ocultar Faltas por Aluno' : '➕ Mostrar Faltas por Aluno'}
            </button>
            <button onClick={() => setMostrarTurmasChart(!mostrarTurmasChart)} className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors duration-200 shadow-md">
              {mostrarTurmasChart ? '➖ Ocultar Faltas por Turma' : '➕ Mostrar Faltas por Turma'}
            </button>
          </>
        )}
      </div>

      {mostrarGrafico && ( // Este bloco mestre ainda é controlado por 'mostrarGrafico'
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(mostrarGrafico && mostrarJustificativaChart) && ( // NOVIDADE: Condicional para visibilidade individual
          <div id="grafico-justificativa" className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold mb-3 text-center">
              Faltas por Justificativa (na Turma) - Total: {totalFaltasNoGraficoJustificativa}
            </h4>
            <Bar data={dadosGraficoJustificativa} options={{ 
              responsive: true, 
              plugins: { 
                legend: { position: 'top' }, 
                title: { display: true, text: `Faltas por Justificativa (${formatarData(dataInicio)} a ${formatarData(dataFim)}) - Total: ${totalFaltasNoGraficoJustificativa}` },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            const count = context.parsed.y;
                            label += count; 
                            if (totalFaltasNoGraficoJustificativa > 0) {
                                const percentage = ((count / totalFaltasNoGraficoJustificativa) * 100).toFixed(1);
                                label += ` (${percentage}%)`; 
                            }
                            return label;
                        }
                    }
                }
              }, 
              scales: { 
                x: { 
                  stacked: false 
                }, 
                y: { 
                  stacked: false, 
                  beginAtZero: true, 
                  ticks: { precision: 0 } 
                }, 
              }, 
            }} />
          </div>
          )}

          {(mostrarGrafico && mostrarAlunosChart) && ( // NOVIDADE: Condicional para visibilidade individual
          <div id="grafico-alunos" className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold mb-3 text-center">
                Porcentagem de Faltas por Aluno (Turma Selecionada: {turmaSelecionada}) 
            </h4> 
            <Bar ref={chartRef} data={dadosGraficoAlunos} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: true, text: `Porcentagem de Faltas por Aluno (Turma Selecionada: ${turmaSelecionada}) (${formatarData(dataInicio)} a ${formatarData(dataFim)})` }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += `${context.parsed.y}%`; } return label; } } } }, scales: { x: { beginAtZero: true }, y: { beginAtZero: true, max: 100, title: { display: true, text: 'Porcentagem (%)' }, ticks: { precision: 0 } }, }, }} />
          </div>
          )}

          {(mostrarGrafico && mostrarTurmasChart) && ( // NOVIDADE: Condicional para visibilidade individual
          <div id="grafico-turmas" className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold mb-3 text-center">Porcentagem de Faltas por Turma</h4>
            <Bar data={dadosGraficoTurmas} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: true, text: `Porcentagem de Faltas por Turma (${formatarData(dataInicio)} a ${formatarData(dataFim)})` }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += `${context.parsed.y}%`; } return label; } } } }, scales: { x: { beginAtZero: true }, y: { beginAtZero: true, max: 100, title: { display: true, text: 'Porcentagem (%)' } }, }, }} />
          </div>
          )}

          <div className="md:col-span-2 lg:col-span-3 bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-md text-center">
            <h4 className="text-2xl font-bold mb-2">Porcentagem de Faltas da Escola:</h4>
            <p className="text-4xl font-extrabold text-blue-700 dark:text-blue-300">{porcentagemEscola}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              (Calculado com base no total de faltas sobre o total de dias letivos de todos os alunos no período selecionado)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraficoFaltas;