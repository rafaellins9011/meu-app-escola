// Arquivo: src/components/ZipDownloadModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { turmasDisponiveis } from '../dados'; // Importa as turmas disponíveis

// Função normalizeTurmaChar adicionada a este arquivo
const normalizeTurmaChar = (turma) => {
    return String(turma).replace(/°/g, 'º');
};

const ZipDownloadModal = ({ isOpen, onClose, onDownload, turmasPermitidas, isDownloading }) => {
    const [selectedTurmas, setSelectedTurmas] = useState(new Set());

    // Reinicia a seleção quando o modal é aberto
    useEffect(() => {
        if (isOpen) {
            setSelectedTurmas(new Set());
        }
    }, [isOpen]);

    const handleCheckboxChange = useCallback((turmaName) => {
        setSelectedTurmas(prev => {
            const newSet = new Set(prev);
            if (newSet.has(turmaName)) {
                newSet.delete(turmaName);
            } else {
                newSet.add(turmaName);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedTurmas.size === turmasPermitidas.length) {
            setSelectedTurmas(new Set()); // Desseleciona todos
        } else {
            setSelectedTurmas(new Set(turmasPermitidas)); // Seleciona todos
        }
    }, [selectedTurmas, turmasPermitidas]);

    const handleConfirmDownload = () => {
        if (selectedTurmas.size === 0) {
            alert('Por favor, selecione pelo menos uma turma para baixar.');
            return;
        }
        onDownload(Array.from(selectedTurmas));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    Baixar Relatórios por Turma (ZIP)
                </h3>

                <p className="mb-4 text-gray-600 dark:text-gray-300">
                    Selecione as turmas para as quais deseja baixar os relatórios completos dos alunos em formato PDF, organizados em pastas ZIP.
                </p>

                <div className="mb-4 border p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">Turmas Disponíveis:</h4>
                        <button
                            onClick={handleSelectAll}
                            className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition-colors duration-200 shadow-sm"
                            disabled={isDownloading}
                        >
                            {selectedTurmas.size === turmasPermitidas.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                        {turmasDisponiveis
                            .filter(t => turmasPermitidas.includes(normalizeTurmaChar(t.name)))
                            .map(turma => (
                                <label key={turma.name} className="flex items-center text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                        checked={selectedTurmas.has(normalizeTurmaChar(turma.name))}
                                        onChange={() => handleCheckboxChange(normalizeTurmaChar(turma.name))}
                                        disabled={isDownloading}
                                    />
                                    <span className="ml-2 text-sm">{turma.name}</span>
                                </label>
                            ))}
                    </div>
                </div>

                {isDownloading && (
                    <div className="text-center text-blue-500 font-semibold mb-4">
                        Gerando e compactando relatórios... Isso pode levar um tempo.
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors duration-200 shadow-md"
                        disabled={isDownloading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmDownload}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors duration-200 shadow-md"
                        disabled={isDownloading || selectedTurmas.size === 0}
                    >
                        {isDownloading ? 'Baixando...' : 'Baixar ZIP'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ZipDownloadModal;
