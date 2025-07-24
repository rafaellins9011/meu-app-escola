import React, { useState, useRef, useCallback, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop'; // Importa a biblioteca de corte
import { getCroppedImg } from './cropImage'; // Importa nossa função auxiliar

const CameraModal = ({ aluno, onClose, onUploadSuccess }) => {
  const cloudName = 'davrx0jt9';
  const uploadPreset = 'fotoalunos';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [fotoTiradaUrl, setFotoTiradaUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Estados para o editor de corte
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // useEffect com os logs de diagnóstico para ligar a câmera
  useEffect(() => {
    console.log('1. Iniciando o useEffect para ligar a câmera...');

    if (fotoTiradaUrl) {
      return; 
    }

    let streamLocal = null;
    let isCancelled = false;
    setIsCameraReady(false);

    const startCamera = async () => {
      try {
        console.log('2. Tentando obter permissão e ligar a câmera com facingMode:', facingMode);

        streamLocal = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: facingMode
          }
        });

        console.log('3. Câmera ligada com sucesso! Stream recebido.');

        if (!isCancelled) {
          if (videoRef.current) {
            videoRef.current.srcObject = streamLocal;
          }
          setStream(streamLocal);
        }
      } catch (err) {
        if (isCancelled) return;
        
        console.error('ERRO DETALHADO AO TENTAR LIGAR A CÂMERA:', err);

        let errorMessage = "Erro ao acessar a câmera. Verifique as permissões do navegador.";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = "Acesso à câmera negado. Por favor, PERMITA o acesso à câmera nas configurações do seu navegador.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = "Nenhuma câmera encontrada neste dispositivo.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = "A câmera já está em uso por outro aplicativo ou aba do navegador.";
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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setFotoTiradaUrl(canvas.toDataURL('image/jpeg'));
      stopCurrentStream();
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // handleUpload com os logs de diagnóstico para o processo de salvamento
  const handleUpload = useCallback(async () => {
    console.log('1. Clicou em Salvar. Verificando dados...');
    console.log('URL da foto-fonte:', fotoTiradaUrl ? 'OK' : 'FALHOU');
    console.log('Pixels de corte:', croppedAreaPixels);

    if (!fotoTiradaUrl || !croppedAreaPixels) {
      console.error('Upload cancelado: Faltam dados da foto ou da área de corte.');
      return;
    }
    setLoading(true);

    try {
      console.log('2. Iniciando o corte da imagem...');
      const croppedImageBlob = await getCroppedImg(fotoTiradaUrl, croppedAreaPixels);
      
      console.log('3. Imagem cortada com sucesso. Iniciando compressão...');
      const options = { maxSizeMB: 0.1, maxWidthOrHeight: 400, useWebWorker: true };
      const compressedFile = await imageCompression(croppedImageBlob, options);

      console.log('4. Imagem comprimida com sucesso. Enviando para Cloudinary...');
      const formData = new FormData();
      formData.append('file', compressedFile, `${aluno.id || aluno.nome}.jpg`);
      formData.append('upload_preset', uploadPreset);

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const response = await fetch(url, { method: 'POST', body: formData });
      const data = await response.json();
      
      console.log('5. Upload concluído. Resposta do Cloudinary:', data);

      if (data.secure_url) {
        console.log('6. SUCESSO! URL segura obtida:', data.secure_url);
        onUploadSuccess(data.secure_url);
      } else {
        throw new Error('URL da imagem não retornada pelo Cloudinary. Verifique o upload_preset.');
      }
    } catch (error) {
      console.error('ERRO NO PROCESSO DE UPLOAD:', error);
      alert("Falha no upload da imagem. Verifique o console de erros (F12).");
      setLoading(false);
    }
  }, [fotoTiradaUrl, croppedAreaPixels, aluno, onUploadSuccess, uploadPreset, cloudName]);

  const handleClose = () => {
    stopCurrentStream();
    onClose();
  };

  const handleRetake = () => {
    setFotoTiradaUrl(null);
    setCroppedAreaPixels(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg text-black max-w-sm w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <h2 className="text-xl font-bold mb-3 text-center">
          {fotoTiradaUrl ? `Ajuste a foto de ${aluno.nome}` : `Foto de ${aluno.nome}`}
        </h2>
        
        <div className="relative w-full h-80 bg-black rounded overflow-hidden mb-3">
          {fotoTiradaUrl ? (
            <Cropper
              image={fotoTiradaUrl}
              crop={crop}
              zoom={zoom}
              aspect={3 / 4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              onCanPlay={() => setIsCameraReady(true)}
            />
          )}
        </div>
        
        {fotoTiradaUrl && (
          <div className="flex flex-col items-center gap-2 mb-3">
            <label htmlFor="zoom-slider" className="text-sm">Zoom</label>
            <input
              id="zoom-slider"
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className="w-full"
            />
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div className="flex justify-between items-center mt-auto">
          <button onClick={handleClose} className="text-sm text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>
          
          {fotoTiradaUrl ? (
            <div className="flex gap-2">
              <button onClick={handleRetake} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Tirar Outra</button>
              <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300">
                {loading ? 'Salvando...' : 'Salvar Foto'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleSwitchCamera} className="p-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300" title="Trocar Câmera">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><path d="m20 12-3-3-3 3"/><path d="m4 12 3 3 3-3"/></svg>
              </button>
              <button 
                onClick={tirarFoto} 
                disabled={!isCameraReady}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${isCameraReady ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'}`}
              >
                {isCameraReady ? 'Capturar Foto' : 'Aguarde...'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;