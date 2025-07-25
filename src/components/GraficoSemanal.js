// src/components/GraficoSemanal.js
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  // NOVIDADE CRÍTICA AQUI: Importando os controladores de gráfico
  LineController,
  BarController,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  // NOVIDADE CRÍTICA AQUI: Registrando os controladores de gráfico
  LineController,
  BarController
);

// Função para pegar a data de início da semana (domingo) no formato YYYY-MM-DD
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Ajusta para o domingo
  const sunday = new Date(d.setDate(diff));
  return sunday.toISOString().split('T')[0];
};

const formatarDataLabel = (dataStr) => {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}`;
}

// Função para obter todas as datas entre duas datas
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  // Adiciona 'T00:00:00' para evitar problemas com fuso horário
  let currentDate = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

const GraficoSemanal = ({
  registros = [], // MODIFICAÇÃO CHAVE AQUI: Define registros como um array vazio por padrão
  chartRef,
  dataInicio = '2025-07-20',
  dataFim = '2025-07-26'
}) => {
  // Agora 'registros' é garantidamente um array, então .length é seguro
  const totalAlunosMatriculados = registros.length;
  // Garante que não é zero para evitar divisão por zero nos cálculos de porcentagem
  const alunosParaCalculo = totalAlunosMatriculados > 0 ? totalAlunosMatriculados : 1;

  const inicioPeriodo = dataInicio;
  const fimPeriodo = dataFim;

  const faltasPorSemana = {};
  const atrasosPorSemana = {};
  const faltasPorDia = {};
  const atrasosPorDia = {};

  let totalFaltasPeriodo = 0;
  let totalAtrasosPeriodo = 0;

  const allDailyLabels = getDatesBetween(inicioPeriodo, fimPeriodo);

  allDailyLabels.forEach(date => {
    faltasPorDia[date] = 0;
    atrasosPorDia[date] = 0;
  });

  registros.forEach(aluno => { // Agora 'registros' é garantidamente um array
    if (aluno.justificativas) {
      Object.keys(aluno.justificativas).forEach(chave => {
        const dataFalta = chave.split('_')[2];
        if (dataFalta && dataFalta >= inicioPeriodo && dataFalta <= fimPeriodo) {
          const semanaDeInicio = getStartOfWeek(dataFalta + 'T00:00:00');
          faltasPorSemana[semanaDeInicio] = (faltasPorSemana[semanaDeInicio] || 0) + 1;
          faltasPorDia[dataFalta] = (faltasPorDia[dataFalta] || 0) + 1;
          totalFaltasPeriodo += 1;
        }
      });
    }
    if (aluno.observacoes) {
      Object.entries(aluno.observacoes).forEach(([chave, obsArray]) => {
        const dataObs = chave.split('_')[2];
        if (dataObs && dataObs >= inicioPeriodo && dataObs <= fimPeriodo) {
          if (Array.isArray(obsArray) && obsArray.includes("Chegou atrasado(a).")) {
            const semanaDeInicio = getStartOfWeek(dataObs + 'T00:00:00');
            atrasosPorSemana[semanaDeInicio] = (atrasosPorSemana[semanaDeInicio] || 0) + 1;
            atrasosPorDia[dataObs] = (atrasosPorDia[dataObs] || 0) + 1;
            totalAtrasosPeriodo += 1;
          }
        }
      });
    }
  });

  const dataFaltasSemanal = allDailyLabels.map(date => {
    const startOfWeek = getStartOfWeek(date + 'T00:00:00');
    return date === startOfWeek ? (faltasPorSemana[startOfWeek] || 0) : 0;
  });

  const dataAtrasosSemanal = allDailyLabels.map(date => {
    const startOfWeek = getStartOfWeek(date + 'T00:00:00');
    return date === startOfWeek ? (atrasosPorSemana[startOfWeek] || 0) : 0;
  });

  const dataFaltasDiario = allDailyLabels.map(date => faltasPorDia[date] || 0);
  const dataAtrasosDiario = allDailyLabels.map(date => atrasosPorDia[date] || 0);

  const data = {
    labels: allDailyLabels.map(date => formatarDataLabel(date)),
    datasets: [
      {
        type: 'bar',
        label: 'Faltas por Semana',
        data: dataFaltasSemanal,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        order: 2,
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              const count = context.parsed.y;
              label += count;
              if (alunosParaCalculo > 0) {
                const percentage = ((count / alunosParaCalculo) * 100).toFixed(1);
                label += ` (${percentage}%)`;
              }
              return label;
            }
          }
        }
      },
      {
        type: 'bar',
        label: 'Atrasos por Semana',
        data: dataAtrasosSemanal,
        backgroundColor: 'rgba(255, 206, 86, 0.6)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
        order: 2,
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              const count = context.parsed.y;
              label += count;
              if (alunosParaCalculo > 0) {
                const percentage = ((count / alunosParaCalculo) * 100).toFixed(1);
                label += ` (${percentage}%)`;
              }
              return label;
            }
          }
        }
      },
      {
        type: 'line',
        label: 'Faltas por Dia',
        data: dataFaltasDiario,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.1,
        pointRadius: 5,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        order: 1,
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              const count = context.parsed.y;
              label += count;
              if (alunosParaCalculo > 0) {
                const percentage = ((count / alunosParaCalculo) * 100).toFixed(1);
                label += ` (${percentage}%)`;
              }
              return label;
            }
          }
        }
      },
      {
        type: 'line',
        label: 'Atrasos por Dia',
        data: dataAtrasosDiario,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
        tension: 0.1,
        pointRadius: 5,
        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
        order: 1,
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              const count = context.parsed.y;
              label += count;
              if (alunosParaCalculo > 0) {
                const percentage = ((count / alunosParaCalculo) * 100).toFixed(1);
                label += ` (${percentage}%)`;
              }
              return label;
            }
          }
        }
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Faltas e Atrasos (Semanal e Diário) - Total da Escola',
        font: {
          size: 18,
        }
      },
    },
    scales: {
      x: {
        stacked: false,
        title: {
          display: true,
          text: 'Data'
        }
      },
      y: {
        stacked: false,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantidade de Ocorrências'
        },
        ticks: {
          stepSize: 1,
          precision: 0
        }
      }
    }
  };

  return (
    <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <Bar ref={chartRef} data={data} options={options} />
      <div className="mt-4 text-center">
        <p className="text-lg font-semibold">Total de Alunos Matriculados: <span className="text-blue-600">{totalAlunosMatriculados}</span></p>
      </div>
    </div>
  );
};

export default GraficoSemanal;
