// src/scripts/popularFirestore.js

import { db } from '../firebaseConfig.js';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import alunos from '../dados.js'; // Importa a lista de alunos do seu arquivo

// O Firestore tem um limite de 500 operações por batch.
// Esta função divide um array grande em pedaços menores.
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// --- FUNÇÃO PARA APAGAR TODOS OS DOCUMENTOS DE UMA COLEÇÃO ---
async function apagarColecao(collectionPath) {
  console.log(`Iniciando a exclusão da coleção: ${collectionPath}...`);
  const collectionRef = collection(db, collectionPath);
  const querySnapshot = await getDocs(collectionRef);

  if (querySnapshot.empty) {
    console.log(`Coleção "${collectionPath}" já está vazia. Nenhum documento para apagar.`);
    return;
  }

  // Divide os documentos em pedaços de 500 para não exceder o limite do batch
  const docChunks = chunkArray(querySnapshot.docs, 500);

  for (const chunk of docChunks) {
    const batch = writeBatch(db);
    chunk.forEach(doc => {
      batch.delete(doc.ref);
    });
    console.log(`Apagando um lote de ${chunk.length} documentos...`);
    await batch.commit();
  }

  console.log(`✅ Coleção "${collectionPath}" foi limpa com sucesso!`);
}


// --- FUNÇÃO PARA IMPORTAR OS ALUNOS DO dados.js ---
async function importarAlunos() {
  console.log(`Iniciando a importação de ${alunos.length} alunos do arquivo dados.js...`);
  const collectionRef = collection(db, 'alunos');
  
  // Divide os alunos em pedaços de 500
  const alunoChunks = chunkArray(alunos, 500);

  for (const chunk of alunoChunks) {
    const batch = writeBatch(db);
    chunk.forEach(aluno => {
      // Cria uma nova referência de documento (ID aleatório) para cada aluno
      const docRef = doc(collectionRef); 
      batch.set(docRef, aluno);
    });
    console.log(`Importando um lote de ${chunk.length} alunos...`);
    await batch.commit();
  }

  console.log(`✅ Importação de ${alunos.length} alunos concluída com sucesso!`);
}


// --- FUNÇÃO PRINCIPAL QUE EXECUTA TUDO ---
async function resetarEImportar() {
  try {
    // 1. Apagar a coleção 'alunos' existente
    await apagarColecao('alunos');
    
    console.log("\n-----------------------------------\n");

    // 2. Importar os alunos do arquivo dados.js
    await importarAlunos();

    console.log("\n🚀 Processo finalizado com sucesso! Seu Firestore foi atualizado.");
    
  } catch (error) {
    console.error("❌ Ocorreu um erro durante o processo:", error);
    console.error("Seu banco de dados pode estar em um estado inconsistente. Verifique o console do Firebase.");
  }
}


// Executa a função principal
resetarEImportar();