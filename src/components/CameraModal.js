// src/components/CameraModal.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

const CameraModal = ({ aluno, onClose, onUploadSuccess }) => {
  const cloudName = 'davrx0jt9';
  const uploadPreset = 'fotoalunos';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [fotoTiradaUrl, setFotoTiradaUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (stream) return;
      // Ajustado para uma resolução mais comum e que se encaixe melhor em modais menores
      const streamLocal = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = streamLocal;
        setStream(streamLocal);
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      let errorMessage = "Erro ao acessar a câmera. Verifique as permissões do navegador.";

      // Mensagem mais específica para erros de permissão
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Acesso à câmera negado. Por favor, PERMITA o acesso à câmera nas configurações do seu navegador para este site (procure pelo ícone de cadeado na barra de endereço ou nas configurações de privacidade do navegador).";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "Nenhuma câmera encontrada. Certifique-se de que uma câmera está conectada e funcionando.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "A câmera está em uso por outro aplicativo ou não pode ser acessada. Feche outros aplicativos que possam estar usando a câmera e tente novamente.";
      }

      alert(errorMessage);
      onClose();
    }
  }, [onClose, stream]);

  const stopCamera = useCallback(() => { if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); } }, [stream]);
  
  useEffect(() => { startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);

  const tirarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ajusta a largura e altura do canvas para a proporção 3:4 da foto
      // e usa o tamanho real do vídeo para o corte
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      const targetHeight = Math.min(videoHeight, videoWidth * (4 / 3)); // Garante que a altura não exceda a do vídeo
      const targetWidth = targetHeight * (3 / 4);

      // Centraliza o corte, se necessário
      const xOffset = (videoWidth - targetWidth) / 2;
      const yOffset = (videoHeight - targetHeight) / 2;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      // Desenha a imagem do vídeo no canvas, aplicando o corte central
      context.drawImage(video, xOffset, yOffset, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
      
      setFotoTiradaUrl(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }
  };

  const handleUpload = async () => {
    if (!canvasRef.current || !aluno) return;
    setLoading(true);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) { setLoading(false); return; }
      const options = { maxSizeMB: 0.1, maxWidthOrHeight: 400, useWebWorker: true };
      try {
        const compressedFile = await imageCompression(blob, options);
        const formData = new FormData();
        formData.append('file', compressedFile, `${aluno.id || aluno.nome}.jpg`);
        formData.append('upload_preset', uploadPreset);
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const response = await fetch(url, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.secure_url) { onUploadSuccess(data.secure_url); } 
        else { throw new Error('URL da imagem não retornada pelo Cloudinary.'); }
      } catch (error) { 
        console.error("Falha no upload da imagem para o Cloudinary:", error);
        alert("Falha no upload da imagem. Verifique sua conexão ou as configurações do Cloudinary."); 
        setLoading(false); 
      }
    }, 'image/jpeg');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      {/* ATUALIZAÇÃO LAYOUT: Modal mais compacto, com max-w-sm e max-h para evitar overflow */}
      <div className="bg-white p-4 rounded-lg text-black max-w-sm w-full max-h-[90vh] overflow-y-auto"> 
        <h2 className="text-xl font-bold mb-3 text-center">Foto de {aluno.nome}</h2> {/* Centralizado e margem menor */}
        {/* Contêiner da visualização da câmera/foto com altura fixa para controle */}
        <div className="relative w-full h-64 bg-black rounded overflow-hidden mb-3"> {/* h-64 para altura fixa, mb-3 para margem */}
          <div className="absolute top-0 left-0 w-full h-full">
            {fotoTiradaUrl ? <img src={fotoTiradaUrl} alt="Pré-visualização" className="w-full h-full object-cover" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {/* ATUALIZAÇÃO LAYOUT: Botões logo abaixo da foto, sem margin-top extra */}
        <div className="flex justify-between items-center"> 
          <button onClick={() => { stopCamera(); onClose(); }} className="text-sm text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
          {fotoTiradaUrl ? (
            <div className="flex gap-2"> {/* Reduzido o gap entre os botões */}
              <button onClick={() => { setFotoTiradaUrl(null); startCamera(); }} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Tirar Outra</button>
              <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"> {loading ? 'Salvando...' : 'Salvar Foto'} </button>
            </div>
          ) : ( <button onClick={tirarFoto} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Capturar Foto</button> )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
