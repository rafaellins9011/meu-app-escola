// src/components/GraficoSemanal.js
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement, // Re-importado
  PointElement, // Re-importado
  Title,
  Tooltip,
  Legend,
  LineController, // Re-importado
  BarController,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement, // Re-registrado
  PointElement, // Re-registrado
  Title,
  Tooltip,
  Legend,
  LineController, // Re-registrado
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

// Função para formatar a data para o label da semana (ex: 22/07)
const formatarDataLabel = (dataStr) => {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}`;
}

// Função para obter todas as datas letivas entre duas datas (ainda útil para filtrar eventos)
const getActualSchoolDatesBetween = (startDate, endDate, nonSchoolDaysArray) => {
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
};

// NOVIDADE: Função para obter as datas de início de cada semana letiva no período
const getUniqueSchoolWeeksInPeriod = (startDate, endDate, nonSchoolDaysArray) => {
  const weeks = new Set();
  let currentDate = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  while (currentDate <= end) {
    const dateString = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    const isNonSchool = nonSchoolDaysArray.some(day => day.date === dateString);

    // Se for um dia letivo, adiciona o início da semana desse dia ao conjunto de semanas
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isNonSchool) {
      weeks.add(getStartOfWeek(dateString + 'T00:00:00'));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return Array.from(weeks).sort(); // Retorna as semanas únicas ordenadas
};


const GraficoSemanal = ({
  registros = [],
  chartRef,
  dataInicio = '2025-07-20',
  dataFim = '2025-07-26',
  nonSchoolDays = []
}) => {
  const totalAlunosMatriculados = registros.length;
  const alunosParaCalculo = totalAlunosMatriculados > 0 ? totalAlunosMatriculados : 1;

  const inicioPeriodo = dataInicio;
  const fimPeriodo = dataFim;

  // NOVIDADE: Agora os labels do gráfico serão as semanas únicas
  const weeklyLabels = useMemo(() => {
    return getUniqueSchoolWeeksInPeriod(inicioPeriodo, fimPeriodo, nonSchoolDays);
  }, [inicioPeriodo, fimPeriodo, nonSchoolDays]);

  // Use allActualSchoolDates para filtrar corretamente as faltas/atrasos
  const allActualSchoolDates = useMemo(() => {
      return getActualSchoolDatesBetween(inicioPeriodo, fimPeriodo, nonSchoolDays);
  }, [inicioPeriodo, fimPeriodo, nonSchoolDays]);


  const faltasPorSemana = {};
  const atrasosPorSemana = {};
  const faltasPorDia = {}; // Re-introduzido
  const atrasosPorDia = {}; // Re-introduzido

  // Inicializa contadores para cada semana letiva no período
  weeklyLabels.forEach(weekStart => {
    faltasPorSemana[weekStart] = 0;
    atrasosPorSemana[weekStart] = 0;
  });

  // Inicializa contadores para todos os dias letivos no período (para as linhas diárias)
  allActualSchoolDates.forEach(date => {
    faltasPorDia[date] = 0;
    atrasosPorDia[date] = 0;
  });


  registros.forEach(aluno => {
    // Processa justificativas (faltas)
    if (aluno.justificativas) {
      Object.keys(aluno.justificativas).forEach(chave => {
        const dataFalta = chave.split('_')[2];
        // Verifica se a data da falta é um dia letivo dentro do período
        if (allActualSchoolDates.includes(dataFalta)) {
          const weekStart = getStartOfWeek(dataFalta + 'T00:00:00');
          faltasPorSemana[weekStart] = (faltasPorSemana[weekStart] || 0) + 1;
          faltasPorDia[dataFalta] = (faltasPorDia[dataFalta] || 0) + 1; // Contagem diária
        }
      });
    }
    // Processa observações (atrasos)
    if (aluno.observacoes) {
      Object.entries(aluno.observacoes).forEach(([chave, obsArray]) => {
        const dataObs = chave.split('_')[2];
        // Verifica se a data da observação é um dia letivo dentro do período
        if (allActualSchoolDates.includes(dataObs)) {
          if (Array.isArray(obsArray) && obsArray.includes("Chegou atrasado(a).")) {
            const weekStart = getStartOfWeek(dataObs + 'T00:00:00');
            atrasosPorSemana[weekStart] = (atrasosPorSemana[weekStart] || 0) + 1;
            atrasosPorDia[dataObs] = (atrasosPorDia[dataObs] || 0) + 1; // Contagem diária
          }
        }
      });
    }
  });

  // Prepara os dados para os datasets do Chart.js
  const dataFaltasSemanalChart = weeklyLabels.map(weekStart => faltasPorSemana[weekStart] || 0);
  const dataAtrasosSemanalChart = weeklyLabels.map(weekStart => atrasosPorSemana[weekStart] || 0);

  // NOVIDADE: Dados diários para as linhas - mapeados para os allActualSchoolDates
  const dataFaltasDiarioChart = allActualSchoolDates.map(date => faltasPorDia[date] || 0);
  const dataAtrasosDiarioChart = allActualSchoolDates.map(date => atrasosPorDia[date] || 0);


  const data = {
    labels: allActualSchoolDates.map(date => formatarDataLabel(date)), // Labels são os dias letivos
    datasets: [
      {
        type: 'bar',
        label: 'Faltas por Semana',
        // NOVIDADE: Mapeia os dados semanais para as datas diárias.
        // A barra só terá valor no primeiro dia letivo da semana.
        data: allActualSchoolDates.map(date => {
            const weekStart = getStartOfWeek(date + 'T00:00:00');
            // Verifica se este é o primeiro dia letivo da semana
            const isFirstSchoolDayOfWeek = allActualSchoolDates.indexOf(date) === allActualSchoolDates.findIndex(d => getStartOfWeek(d + 'T00:00:00') === weekStart);
            return isFirstSchoolDayOfWeek ? (faltasPorSemana[weekStart] || 0) : 0;
        }),
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
        // NOVIDADE: Mapeia os dados semanais para as datas diárias.
        // A barra só terá valor no primeiro dia letivo da semana.
        data: allActualSchoolDates.map(date => {
            const weekStart = getStartOfWeek(date + 'T00:00:00');
            // Verifica se este é o primeiro dia letivo da semana
            const isFirstSchoolDayOfWeek = allActualSchoolDates.indexOf(date) === allActualSchoolDates.findIndex(d => getStartOfWeek(d + 'T00:00:00') === weekStart);
            return isFirstSchoolDayOfWeek ? (atrasosPorSemana[weekStart] || 0) : 0;
        }),
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
        type: 'line', // Re-introduzido
        label: 'Faltas por Dia',
        data: dataFaltasDiarioChart, // Usa os dados diários
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
        type: 'line', // Re-introduzido
        label: 'Atrasos por Dia',
        data: dataAtrasosDiarioChart, // Usa os dados diários
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
        {/* REMOVIDA: A linha de explicação do cálculo */}
      </div>
    </div>
  );
};

export default GraficoSemanal;
