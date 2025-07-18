// Arquivo: src/components/GraficoFaltas.js
// ATUALIZAÇÃO: Lógica de permissão implementada para diferenciar a visão de gestores e monitores.

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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const formatarData = (dataStr) => {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
};

const normalizeTurmaChar = (turma) => {
    return String(turma).replace(/°/g, 'º');
};

const GraficoFaltas = ({ registros, dataInicio, dataFim, turmaSelecionada, tipoUsuario, turmasPermitidas }) => {
  const [mostrarGrafico, setMostrarGrafico] = useState(true);

  // Filtra os registros para os gráficos de aluno e justificativa, baseados na turma selecionada no Painel.
  const registrosParaGraficosDeAlunos = registros.filter(aluno => 
    normalizeTurmaChar(aluno.turma) === normalizeTurmaChar(turmaSelecionada)
  );

  // --- Cálculos para Gráficos de Alunos e Justificativas (Usa dados filtrados pela turma selecionada) ---
  const contagemPorJustificativa = {};
  const totalFaltasPorAluno = {};

  registrosParaGraficosDeAlunos.forEach(aluno => {
    const totalDiasLetivosAluno = aluno.totalDiasLetivos || 100;
    if (!totalFaltasPorAluno[aluno.nome]) {
      totalFaltasPorAluno[aluno.nome] = { faltas: 0, totalDiasLetivos: totalDiasLetivosAluno };
    }
    if (!aluno.justificativas) return;

    Object.entries(aluno.justificativas).forEach(([chave, justificativa]) => {
      const [, , data] = chave.split('_');
      if (data >= dataInicio && data <= dataFim) {
        if (!contagemPorJustificativa[justificativa]) {
          contagemPorJustificativa[justificativa] = {};
        }
        contagemPorJustificativa[justificativa][aluno.nome] = (contagemPorJustificativa[justificativa][aluno.nome] || 0) + 1;
        totalFaltasPorAluno[aluno.nome].faltas += 1;
      }
    });
  });

  // --- Cálculos para Gráficos de Turma e Escola (Usa dados completos) ---
  const faltasPorTurma = {};
  let totalFaltasEscola = 0;
  let totalDiasLetivosEscola = 0;

  registros.forEach(aluno => {
    const turmaNormalizada = normalizeTurmaChar(aluno.turma);
    const totalDiasLetivosAluno = aluno.totalDiasLetivos || 100;
    
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

  // --- Cálculo das Porcentagens ---
  const porcentagensAlunos = Object.keys(totalFaltasPorAluno).map(nomeAluno => {
    const dadosAluno = totalFaltasPorAluno[nomeAluno];
    const porcentagem = (dadosAluno.faltas / dadosAluno.totalDiasLetivos) * 100;
    return { nome: nomeAluno, porcentagem: porcentagem.toFixed(2) };
  });

  const porcentagensTurmas = Object.keys(faltasPorTurma)
    .filter(turma => {
      // Gestor vê todas as turmas, monitor vê apenas as suas.
      return tipoUsuario === 'gestor' ? true : turmasPermitidas.includes(turma);
    })
    .map(turma => {
      const dadosTurma = faltasPorTurma[turma];
      const numAlunosNaTurma = dadosTurma.alunos.size;
      const totalDiasLetivosTurma = numAlunosNaTurma * 100; // Assumindo 100 dias por aluno
      const porcentagem = totalDiasLetivosTurma > 0 ? (dadosTurma.faltas / totalDiasLetivosTurma) * 100 : 0;
      return { turma, porcentagem: porcentagem.toFixed(2) };
    });

  const porcentagemEscola = totalDiasLetivosEscola > 0 ? ((totalFaltasEscola / totalDiasLetivosEscola) * 100).toFixed(2) : 0;

  // --- Dados para os Gráficos ---
  const cores = ['rgba(75,192,192,0.6)', 'rgba(255,99,132,0.6)', 'rgba(255,206,86,0.6)', 'rgba(54,162,235,0.6)', 'rgba(153,102,255,0.6)', 'rgba(255,159,64,0.6)'];
  const labelsJustificativa = Object.keys(totalFaltasPorAluno);
  const datasetsJustificativa = Object.entries(contagemPorJustificativa).map(([just, dados], idx) => ({
    label: just,
    data: labelsJustificativa.map(nomeAluno => dados[nomeAluno] || 0),
    backgroundColor: cores[idx % cores.length],
    stack: 'Stack 0'
  }));
  const dadosGraficoJustificativa = { labels: labelsJustificativa, datasets: datasetsJustificativa };
  const dadosGraficoAlunos = { labels: porcentagensAlunos.map(p => p.nome), datasets: [{ label: 'Porcentagem de Faltas', data: porcentagensAlunos.map(p => parseFloat(p.porcentagem)), backgroundColor: cores[0], borderColor: cores[0].replace('0.6', '1'), borderWidth: 1, }] };
  const dadosGraficoTurmas = { labels: porcentagensTurmas.map(p => p.turma), datasets: [{ label: 'Porcentagem de Faltas', data: porcentagensTurmas.map(p => parseFloat(p.porcentagem)), backgroundColor: cores[1], borderColor: cores[1].replace('0.6', '1'), borderWidth: 1, }] };

  const exportarGraficoPDF = async (chartId, title) => {
    const element = document.getElementById(chartId);
    if (!element) return alert('Gráfico não encontrado.');
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({ orientation: 'landscape' });
    const imgWidth = 280;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    doc.text(`ESCOLA ESTADUAL CÍVICO-MILITAR PROFESSORA ANA MARIA DAS GRAÇAS DE SOUZA NORONHA`, 14, 10);
    doc.text(title, 14, 20);
    doc.addImage(imgData, 'PNG', 10, 30, imgWidth, imgHeight);
    doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
  };

  return (
    <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h3 className="text-2xl font-bold mb-4">📊 Gráficos de Faltas e Porcentagens</h3>
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => setMostrarGrafico(!mostrarGrafico)} className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors duration-200 shadow-md">
          {mostrarGrafico ? '🔽 Ocultar Gráficos' : '▶️ Mostrar Gráficos'}
        </button>
        {mostrarGrafico && (
          <>
            <button onClick={() => exportarGraficoPDF('grafico-justificativa', `Gráfico de Faltas por Justificativa (${formatarData(dataInicio)} a ${formatarData(dataFim)})`)} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
              🖨 Justificativas PDF
            </button>
            <button onClick={() => exportarGraficoPDF('grafico-alunos', `Porcentagem de Faltas por Aluno (${formatarData(dataInicio)} a ${formatarData(dataFim)})`)} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
              🖨 Alunos PDF
            </button>
            <button onClick={() => exportarGraficoPDF('grafico-turmas', `Porcentagem de Faltas por Turma (${formatarData(dataInicio)} a ${formatarData(dataFim)})`)} className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 shadow-md">
              🖨 Turmas PDF
            </button>
          </>
        )}
      </div>

      {mostrarGrafico && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div id="grafico-justificativa" className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold mb-3 text-center">Faltas por Justificativa (na Turma)</h4>
            <Bar data={dadosGraficoJustificativa} options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: `Faltas por Justificativa (${formatarData(dataInicio)} a ${formatarData(dataFim)})` }, }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true }, }, }} />
          </div>

          <div id="grafico-alunos" className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold mb-3 text-center">Porcentagem de Faltas por Aluno (na Turma)</h4>
            <Bar data={dadosGraficoAlunos} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: true, text: `Porcentagem de Faltas por Aluno (${formatarData(dataInicio)} a ${formatarData(dataFim)})` }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += `${context.parsed.y}%`; } return label; } } } }, scales: { x: { beginAtZero: true }, y: { beginAtZero: true, max: 100, title: { display: true, text: 'Porcentagem (%)' } }, }, }} />
          </div>

          <div id="grafico-turmas" className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold mb-3 text-center">Porcentagem de Faltas por Turma</h4>
            <Bar data={dadosGraficoTurmas} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: true, text: `Porcentagem de Faltas por Turma (${formatarData(dataInicio)} a ${formatarData(dataFim)})` }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += `${context.parsed.y}%`; } return label; } } } }, scales: { x: { beginAtZero: true }, y: { beginAtZero: true, max: 100, title: { display: true, text: 'Porcentagem (%)' } }, }, }} />
          </div>

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
