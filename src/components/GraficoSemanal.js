// src/components/GraficoSemanal.js
import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
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
    let currentDate = new Date(startDate + 'T00:00:00'); // Garante que a data seja tratada consistentemente (UTC ou local)
    const end = new Date(endDate + 'T00:00:00');

    while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

// NOVIDADE: Recebe dataInicio e dataFim como props
const GraficoSemanal = ({ registros, chartRef, dataInicio, dataFim }) => {
  // CORREÇÃO: Usando as props dataInicio e dataFim passadas do Painel.js
  const inicioPeriodo = dataInicio;
  const fimPeriodo = dataFim;

  const faltasPorSemana = {};
  const atrasosPorSemana = {};

  const faltasPorDia = {};
  const atrasosPorDia = {};

  // Geração de todas as labels de dias para o eixo X
  const allDailyLabels = getDatesBetween(inicioPeriodo, fimPeriodo);

  // Inicializa contadores diários para todos os dias no período
  allDailyLabels.forEach(date => {
    faltasPorDia[date] = 0;
    atrasosPorDia[date] = 0;
  });


  registros.forEach(aluno => {
    // 1. Processar Justificativas (Faltas)
    if (aluno.justificativas) {
      Object.keys(aluno.justificativas).forEach(chave => {
        const dataFalta = chave.split('_')[2];
        // CORREÇÃO: Usando inicioPeriodo e fimPeriodo para filtrar
        if (dataFalta && dataFalta >= inicioPeriodo && dataFalta <= fimPeriodo) {
          const semanaDeInicio = getStartOfWeek(dataFalta + 'T00:00:00');
          faltasPorSemana[semanaDeInicio] = (faltasPorSemana[semanaDeInicio] || 0) + 1;
          faltasPorDia[dataFalta] = (faltasPorDia[dataFalta] || 0) + 1;
        }
      });
    }
    // 2. Processar Observações (Atrasos)
    if (aluno.observacoes) {
        Object.entries(aluno.observacoes).forEach(([chave, obsArray]) => {
            const dataObs = chave.split('_')[2];
            // CORREÇÃO: Usando inicioPeriodo e fimPeriodo para filtrar
            if (dataObs && dataObs >= inicioPeriodo && dataObs <= fimPeriodo) {
                if (Array.isArray(obsArray) && obsArray.includes("Chegou atrasado(a).")) {
                    const semanaDeInicio = getStartOfWeek(dataObs + 'T00:00:00');
                    atrasosPorSemana[semanaDeInicio] = (atrasosPorSemana[semanaDeInicio] || 0) + 1;
                    atrasosPorDia[dataObs] = (atrasosPorDia[dataObs] || 0) + 1;
                }
            }
        });
    }
  });

  // Prepara os dados para os gráficos
  const dataFaltasSemanal = allDailyLabels.map(date => {
    const startOfWeek = getStartOfWeek(date + 'T00:00:00');
    // Só coloca o valor da semana no primeiro dia da semana no eixo X
    return date === startOfWeek ? (faltasPorSemana[startOfWeek] || 0) : 0;
  });

  const dataAtrasosSemanal = allDailyLabels.map(date => {
    const startOfWeek = getStartOfWeek(date + 'T00:00:00');
    // Só coloca o valor da semana no primeiro dia da semana no eixo X
    return date === startOfWeek ? (atrasosPorSemana[startOfWeek] || 0) : 0;
  });

  const dataFaltasDiario = allDailyLabels.map(date => faltasPorDia[date] || 0);
  const dataAtrasosDiario = allDailyLabels.map(date => atrasosPorDia[date] || 0);


  const data = {
    labels: allDailyLabels.map(date => formatarDataLabel(date)), // Labels diárias para o eixo X
    datasets: [
      {
        type: 'bar',
        label: 'Faltas por Semana',
        data: dataFaltasSemanal,
        backgroundColor: 'rgba(54, 162, 235, 0.6)', // Azul
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        order: 2, // Garante que as barras fiquem por trás das linhas
      },
      {
        type: 'bar',
        label: 'Atrasos por Semana',
        data: dataAtrasosSemanal,
        backgroundColor: 'rgba(255, 206, 86, 0.6)', // Amarelo
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
        order: 2, // Garante que as barras fiquem por trás das linhas
      },
      {
        type: 'line',
        label: 'Faltas por Dia',
        data: dataFaltasDiario,
        borderColor: 'rgba(255, 99, 132, 1)', // Vermelho
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.1,
        pointRadius: 5, // Para mostrar o "pontinho"
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        order: 1, // Garante que as linhas fiquem por cima das barras
      },
      {
        type: 'line',
        label: 'Atrasos por Dia',
        data: dataAtrasosDiario,
        borderColor: 'rgba(75, 192, 192, 1)', // Verde-água
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
        tension: 0.1,
        pointRadius: 5, // Para mostrar o "pontinho"
        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
        order: 1, // Garante que as linhas fiquem por cima das barras
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
      tooltip: {
        callbacks: {
          // Garante que os tooltips mostrem valores inteiros
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += Math.round(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
        x: {
            stacked: false, // Não empilha barras e linhas
            title: {
                display: true,
                text: 'Data'
            }
        },
        y: {
            stacked: false, // Não empilha barras e linhas
            beginAtZero: true,
            title: {
                display: true,
                text: 'Quantidade de Ocorrências'
            },
            ticks: {
                // NOVIDADE: Garante que os ticks do eixo Y sejam números inteiros
                stepSize: 1,
                precision: 0 // Garante que não haja casas decimais
            }
        }
    }
  };

  return (
    <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <Bar ref={chartRef} data={data} options={options} />
    </div>
  );
};

export default GraficoSemanal;
