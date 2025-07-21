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
  const [facingMode, setFacingMode] = useState('environment');

  useEffect(() => {
    if (fotoTiradaUrl) {
      return;
    }

    let streamLocal = null;
    let isCancelled = false;

    const startCamera = async () => {
      try {
        streamLocal = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: facingMode
          }
        });

        if (!isCancelled) {
          if (videoRef.current) {
            videoRef.current.srcObject = streamLocal;
          }
          setStream(streamLocal);
        }
      } catch (err) {
        if (isCancelled) return;

        console.error("Erro ao acessar a câmera:", err);
        let errorMessage = "Erro ao acessar a câmera. Verifique as permissões do navegador.";

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = "Acesso à câmera negado. Por favor, PERMITA o acesso à câmera nas configurações do seu navegador.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = "Nenhuma câmera encontrada.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = "A câmera está em uso por outro aplicativo.";
        } else if (facingMode === 'environment') {
          console.log("Falha ao abrir câmera traseira, tentando a frontal...");
          setFacingMode('user');
          return;
        }
        
        alert(errorMessage);
        onClose();
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (streamLocal) {
        streamLocal.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, fotoTiradaUrl, onClose]);

  const stopCurrentStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleSwitchCamera = () => {
    setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
  };

  const tirarFoto = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Definir a proporção de aspecto desejada para RETRATO (largura / altura)
        // Ex: 3:4 significa que para cada 3 unidades de largura, há 4 de altura.
        const desiredPortraitAspectRatio = 3 / 4; 

        let sourceWidth, sourceHeight; // Dimensões da área a ser cortada do vídeo
        let sourceX, sourceY; // Posição inicial do corte no vídeo

        // Calcular a área máxima de retrato que cabe no feed de vídeo
        // Tentamos usar a altura total do vídeo e ajustar a largura
        sourceHeight = videoHeight;
        sourceWidth = videoHeight * desiredPortraitAspectRatio;

        // Se a largura calculada for maior que a largura do vídeo,
        // significa que a largura do vídeo é o limitante.
        if (sourceWidth > videoWidth) {
          sourceWidth = videoWidth;
          sourceHeight = videoWidth / desiredPortraitAspectRatio;
        }

        // Calcular offsets para centralizar o corte na área do vídeo
        sourceX = (videoWidth - sourceWidth) / 2;
        sourceY = (videoHeight - sourceHeight) / 2;

        // Definir as dimensões do canvas de saída (resolução da foto final)
        // Mantém a proporção 3:4 retrato.
        // A resolução de 300x400 é um bom balanço entre qualidade e tamanho de arquivo.
        const outputCanvasWidth = 300; 
        const outputCanvasHeight = outputCanvasWidth / desiredPortraitAspectRatio; 

        canvas.width = outputCanvasWidth;
        canvas.height = outputCanvasHeight;

        // Desenha a imagem cortada do vídeo para preencher todo o canvas
        context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

        setFotoTiradaUrl(canvas.toDataURL('image/jpeg'));
        stopCurrentStream();
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
  
  const handleClose = () => {
      stopCurrentStream();
      onClose();
  }

  const handleRetake = () => {
    setFotoTiradaUrl(null);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg text-black max-w-sm w-full max-h-[90vh] overflow-y-auto"> 
        <h2 className="text-xl font-bold mb-3 text-center">Foto de {aluno.nome}</h2>
        <div className="relative w-full h-64 bg-black rounded overflow-hidden mb-3">
          <div className="absolute top-0 left-0 w-full h-full">
            {fotoTiradaUrl ? <img src={fotoTiradaUrl} alt="Pré-visualização" className="w-full h-full object-contain" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="flex justify-between items-center"> 
          <button onClick={handleClose} className="text-sm text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
          {fotoTiradaUrl ? (
            <div className="flex gap-2">
              <button onClick={handleRetake} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Tirar Outra</button>
              <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"> {loading ? 'Salvando...' : 'Salvar Foto'} </button>
            </div>
          ) : ( 
            <div className="flex items-center gap-2">
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