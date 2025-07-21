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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
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

// ALTERAÇÃO: Adicionado valores padrão para dataInicio e dataFim
// A semana de 22/07/2025 (terça) começa em 20/07/2025 (domingo) e termina em 26/07/2025 (sábado)
const GraficoSemanal = ({
    registros,
    chartRef,
    dataInicio = '2025-07-20',
    dataFim = '2025-07-26'
}) => {
  // Se as props dataInicio e dataFim forem passadas, elas serão usadas.
  // Se não, os valores padrão acima serão usados.
  const inicioPeriodo = dataInicio;
  const fimPeriodo = dataFim;

  // O restante do seu código permanece exatamente o mesmo.
  const faltasPorSemana = {};
  const atrasosPorSemana = {};
  const faltasPorDia = {};
  const atrasosPorDia = {};

  // NOVIDADE: Variáveis para contar o total de faltas e atrasos no período
  let totalFaltasPeriodo = 0;
  let totalAtrasosPeriodo = 0;

  const allDailyLabels = getDatesBetween(inicioPeriodo, fimPeriodo);

  allDailyLabels.forEach(date => {
    faltasPorDia[date] = 0;
    atrasosPorDia[date] = 0;
  });

  registros.forEach(aluno => {
    if (aluno.justificativas) {
      Object.keys(aluno.justificativas).forEach(chave => {
        const dataFalta = chave.split('_')[2];
        if (dataFalta && dataFalta >= inicioPeriodo && dataFalta <= fimPeriodo) {
          const semanaDeInicio = getStartOfWeek(dataFalta + 'T00:00:00');
          faltasPorSemana[semanaDeInicio] = (faltasPorSemana[semanaDeInicio] || 0) + 1;
          faltasPorDia[dataFalta] = (faltasPorDia[dataFalta] || 0) + 1;
          // NOVIDADE: Contar o total de faltas
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
                    // NOVIDADE: Contar o total de atrasos
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
        // NOVIDADE: Callback para o tooltip exibir a porcentagem semanal de faltas
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    const count = context.parsed.y;
                    label += count;
                    if (totalFaltasPeriodo > 0) {
                        const percentage = ((count / totalFaltasPeriodo) * 100).toFixed(1);
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
        // NOVIDADE: Callback para o tooltip exibir a porcentagem semanal de atrasos
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    const count = context.parsed.y;
                    label += count;
                    if (totalAtrasosPeriodo > 0) {
                        const percentage = ((count / totalAtrasosPeriodo) * 100).toFixed(1);
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
        // NOVIDADE: Callback para o tooltip exibir a porcentagem diária de faltas
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    const count = context.parsed.y;
                    label += count;
                    if (totalFaltasPeriodo > 0) {
                        const percentage = ((count / totalFaltasPeriodo) * 100).toFixed(1);
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
        // NOVIDADE: Callback para o tooltip exibir a porcentagem diária de atrasos
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    const count = context.parsed.y;
                    label += count;
                    if (totalAtrasosPeriodo > 0) {
                        const percentage = ((count / totalAtrasosPeriodo) * 100).toFixed(1);
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
      // O tooltip global foi removido aqui pois cada dataset tem seu próprio callback agora.
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
      {/* NOVIDADE: Exibindo o total de faltas e atrasos */}
      <div className="mt-4 text-center">
        <p className="text-lg font-semibold">Total de Faltas no Período: <span className="text-red-600">{totalFaltasPeriodo}</span></p>
        <p className="text-lg font-semibold">Total de Atrasos no Período: <span className="text-yellow-600">{totalAtrasosPeriodo}</span></p>
      </div>
    </div>
  );
};

export default GraficoSemanal;