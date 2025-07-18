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

// Atualizado: define intervalo fixo de 22/07/2025 até hoje
const GraficoSemanal = ({ registros }) => {
  const dataInicio = '2025-07-22';
  const dataFim = new Date().toISOString().split('T')[0];

  const faltasPorSemana = {};
  const atrasosPorSemana = {}; // NOVO: Objeto para contar os atrasos

  registros.forEach(aluno => {
    // 1. Processar Justificativas (Faltas)
    if (aluno.justificativas) {
      Object.keys(aluno.justificativas).forEach(chave => {
        const dataFalta = chave.split('_')[2];
        if (dataFalta && dataFalta >= dataInicio && dataFalta <= dataFim) {
          const semanaDeInicio = getStartOfWeek(dataFalta + 'T00:00:00');
          faltasPorSemana[semanaDeInicio] = (faltasPorSemana[semanaDeInicio] || 0) + 1;
        }
      });
    }
    // 2. Processar Observações (Atrasos)
    if (aluno.observacoes) {
        Object.entries(aluno.observacoes).forEach(([chave, obsArray]) => {
            const dataObs = chave.split('_')[2];
            if (dataObs && dataObs >= dataInicio && dataObs <= dataFim) {
                if (Array.isArray(obsArray) && obsArray.includes("Chegou atrasado(a).")) {
                    const semanaDeInicio = getStartOfWeek(dataObs + 'T00:00:00');
                    atrasosPorSemana[semanaDeInicio] = (atrasosPorSemana[semanaDeInicio] || 0) + 1;
                }
            }
        });
    }
  });

  // 3. Unificar e ordenar as semanas de ambas as fontes de dados
  const todasAsSemanas = [...Object.keys(faltasPorSemana), ...Object.keys(atrasosPorSemana)];
  const semanasUnicas = [...new Set(todasAsSemanas)].sort();
  
  const labels = semanasUnicas.map(semana => `Semana de ${formatarDataLabel(semana)}`);
  
  const dataFaltas = semanasUnicas.map(semana => faltasPorSemana[semana] || 0);
  const dataAtrasos = semanasUnicas.map(semana => atrasosPorSemana[semana] || 0);

  const data = {
    labels: labels,
    datasets: [
      {
        type: 'bar',
        label: 'Total de Faltas',
        data: dataFaltas,
        backgroundColor: 'rgba(54, 162, 235, 0.6)', // Azul
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        type: 'bar',
        label: 'Total de Atrasos',
        data: dataAtrasos,
        backgroundColor: 'rgba(255, 206, 86, 0.6)', // Amarelo
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
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
        text: 'Faltas e Atrasos por Semana (Total da Escola)',
        font: {
          size: 18,
        }
      },
    },
    scales: {
        x: {
            stacked: false,
        },
        y: {
            stacked: false,
            beginAtZero: true,
            title: {
                display: true,
                text: 'Quantidade de Ocorrências'
            }
        }
    }
  };

  return (
    <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <Bar data={data} options={options} />
    </div>
  );
};

export default GraficoSemanal;