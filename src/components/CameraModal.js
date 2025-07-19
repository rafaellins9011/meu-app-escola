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
  // NOVO: Estado para controlar a câmera (traseira ou frontal)
  const [facingMode, setFacingMode] = useState('environment'); // Inicia com a traseira ('environment')

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
      // MODIFICADO: Usa o estado 'facingMode' para selecionar a câmera
      const streamLocal = await navigator.mediaDevices.getUserMedia({ 
          video: { 
              width: { ideal: 640 }, 
              height: { ideal: 480 }, 
              facingMode: facingMode 
            } 
        });

      if (videoRef.current) {
        videoRef.current.srcObject = streamLocal;
        setStream(streamLocal);
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      let errorMessage = "Erro ao acessar a câmera. Verifique as permissões do navegador.";

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Acesso à câmera negado. Por favor, PERMITA o acesso à câmera nas configurações do seu navegador para este site (procure pelo ícone de cadeado na barra de endereço ou nas configurações de privacidade do navegador).";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "Nenhuma câmera encontrada. Certifique-se de que uma câmera está conectada e funcionando.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "A câmera está em uso por outro aplicativo ou não pode ser acessada. Feche outros aplicativos que possam estar usando a câmera e tente novamente.";
      } else if (facingMode === 'environment') {
        // NOVO: Se falhar com a traseira, tenta a frontal como fallback
        console.log("Falha ao abrir câmera traseira, tentando a frontal...");
        setFacingMode('user'); // Troca para a câmera frontal e tentará novamente
        return;
      }

      alert(errorMessage);
      onClose();
    }
  }, [onClose, stream, facingMode]); // MODIFICADO: Adicionado facingMode como dependência

  const stopCamera = useCallback(() => { if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); } }, [stream]);
  
  // MODIFICADO: O useEffect agora reage à mudança de facingMode
  useEffect(() => { 
    startCamera(); 
    return () => stopCamera(); 
}, [startCamera, stopCamera]);


  // NOVO: Função para trocar a câmera
  const handleSwitchCamera = () => {
    setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
  };

  const tirarFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      const targetHeight = Math.min(videoHeight, videoWidth * (4 / 3)); 
      const targetWidth = targetHeight * (3 / 4);

      const xOffset = (videoWidth - targetWidth) / 2;
      const yOffset = (videoHeight - targetHeight) / 2;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
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
      <div className="bg-white p-4 rounded-lg text-black max-w-sm w-full max-h-[90vh] overflow-y-auto"> 
        <h2 className="text-xl font-bold mb-3 text-center">Foto de {aluno.nome}</h2>
        <div className="relative w-full h-64 bg-black rounded overflow-hidden mb-3">
          <div className="absolute top-0 left-0 w-full h-full">
            {fotoTiradaUrl ? <img src={fotoTiradaUrl} alt="Pré-visualização" className="w-full h-full object-cover" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="flex justify-between items-center"> 
          <button onClick={() => { stopCamera(); onClose(); }} className="text-sm text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
          {fotoTiradaUrl ? (
            <div className="flex gap-2">
              <button onClick={() => { setFotoTiradaUrl(null); startCamera(); }} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Tirar Outra</button>
              <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"> {loading ? 'Salvando...' : 'Salvar Foto'} </button>
            </div>
          ) : ( 
            // MODIFICADO: Adicionado um contêiner para os botões de ação da câmera
            <div className="flex items-center gap-2">
                {/* NOVO: Botão para trocar de câmera */}
                <button onClick={handleSwitchCamera} className="p-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" title="Trocar Câmera">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><path d="m20 12-3-3-3 3"/><path d="m4 12 3 3 3-3"/></svg>
                </button>
                <button onClick={tirarFoto} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Capturar Foto</button> 
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;