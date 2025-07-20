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
    let currentDate = new Date(startDate + 'T00:00:00'); // Garante que a data seja tratada consistentemente
    const end = new Date(endDate + 'T00:00:00');

    if (currentDate > end) return []; // Retorna array vazio se a data de início for maior que a de fim

    while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

// MODIFICAÇÃO: O componente agora recebe 'data' pré-calculada do Painel.js
const GraficoSemanal = ({ data, chartRef }) => {
  
  // Se não houver dados, não renderiza nada ou mostra uma mensagem
  if (!data) {
    return <div className="text-center p-8">Não há dados para exibir no período selecionado.</div>;
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        type: 'line',
        label: 'Faltas por Dia',
        data: data.faltasData,
        borderColor: 'rgba(255, 99, 132, 1)', // Vermelho
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.1,
        pointRadius: 5,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        order: 1, // Garante que as linhas fiquem por cima das barras
      },
      {
        type: 'line',
        label: 'Atrasos por Dia',
        data: data.atrasosData,
        borderColor: 'rgba(75, 192, 192, 1)', // Verde-água
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
        tension: 0.1,
        pointRadius: 5,
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
        text: 'Faltas e Atrasos Diários - Total da Escola',
        font: {
          size: 18,
        }
      },
      tooltip: {
        callbacks: {
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
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

export default GraficoSemanal;
