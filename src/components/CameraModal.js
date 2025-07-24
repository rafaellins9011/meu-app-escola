// src/components/CameraModal.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import ReactCrop, { centerCrop, makeCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const CameraModal = ({ aluno, onClose, onUploadSuccess }) => {
    const cloudName = 'davrx0jt9';
    const uploadPreset = 'fotoalunos';

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [fotoTiradaUrl, setFotoTiradaUrl] = useState(null); // The original captured photo URL or existing photo
    const [croppedImageUrl, setCroppedImageUrl] = useState(null); // The URL of the final cropped image
    const [loading, setLoading] = useState(false);
    const [facingMode, setFacingMode] = useState('environment');
    const [isCameraReady, setIsCameraReady] = useState(false);

    // ReactCrop states
    const [crop, setCrop] = useState(); // Controlled crop state
    const [imageRef, setImageRef] = useState(null); // Reference to the image being cropped
    const [completedCrop, setCompletedCrop] = useState(null); // Final completed crop data

    // Function to stop the current camera stream
    const stopCurrentStream = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        let streamLocal = null;
        let isCancelled = false;

        setIsCameraReady(false); // Reset camera ready state on start

        const startCamera = async () => {
            // If an existing photo is provided, load it directly for cropping
            if (aluno.fotoUrl && !fotoTiradaUrl) { // Only load if not already loaded and no new photo taken
                console.log("Loading existing photo for editing:", aluno.fotoUrl);
                setFotoTiradaUrl(aluno.fotoUrl);
                setIsCameraReady(true); // Treat as ready for editing
                return;
            }

            // If no existing photo or retaking, start camera
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
                        videoRef.current.onloadedmetadata = () => setIsCameraReady(true);
                    }
                    setStream(streamLocal);
                }
            } catch (err) {
                if (isCancelled) return;

                console.error("Error accessing camera:", err);
                let errorMessage = "Erro ao acessar a câmera. Verifique as permissões do navegador.";

                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    errorMessage = "Acesso à câmera negado. Por favor, PERMITA o acesso à câmera nas configurações do seu navegador.";
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    errorMessage = "Nenhuma câmera encontrada.";
                } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    errorMessage = "A câmera está em uso por outro aplicativo.";
                } else if (facingMode === 'environment') {
                    console.log("Falha ao abrir a câmera traseira, tentando câmera frontal...");
                    setFacingMode('user');
                    return; // Re-run useEffect with new facingMode
                }

                alert(errorMessage);
                onClose();
            }
        };

        // Only start camera if no photo is currently being processed/edited
        if (!fotoTiradaUrl && !croppedImageUrl) {
            startCamera();
        }


        return () => {
            isCancelled = true;
            if (streamLocal) {
                streamLocal.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode, fotoTiradaUrl, croppedImageUrl, onClose, aluno.fotoUrl]);

    const handleSwitchCamera = () => {
        stopCurrentStream(); // Stop current stream before switching
        setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
    };

    const tirarFoto = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

            const initialPhotoUrl = canvas.toDataURL('image/jpeg');
            setFotoTiradaUrl(initialPhotoUrl);
            stopCurrentStream(); // Stop camera once photo is taken

            // Reset crop state for the new image (no initial auto-crop)
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    }, [stopCurrentStream]);

    // Function to get the cropped image blob from canvas
    const getCroppedImageBlob = useCallback(async () => {
        if (!imageRef || !completedCrop || !canvasRef.current) {
            return null;
        }

        const scaleX = imageRef.naturalWidth / imageRef.width;
        const scaleY = imageRef.naturalHeight / imageRef.height;
        const ctx = canvasRef.current.getContext('2d');

        canvasRef.current.width = completedCrop.width;
        canvasRef.current.height = completedCrop.height;

        ctx.drawImage(
            imageRef,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width,
            completedCrop.height
        );

        return new Promise((resolve) => {
            canvasRef.current.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    resolve(null);
                    return;
                }
                resolve(blob);
            }, 'image/jpeg', 0.9); // Use 0.9 for initial quality before compression
        });
    }, [imageRef, completedCrop]);

    const handleUpload = async () => {
        if (!aluno) return;
        setLoading(true);

        try {
            const blob = await getCroppedImageBlob();
            if (!blob) {
                throw new Error("Falha ao obter o blob da imagem recortada.");
            }

            // Options for image compression
            const options = {
                maxSizeMB: 0.1,         // Max size in MB (100KB)
                maxWidthOrHeight: 400,  // Max width or height in pixels
                useWebWorker: true      // Use web worker for faster compression
            };
            const compressedFile = await imageCompression(blob, options);

            const formData = new FormData();
            formData.append('file', compressedFile, `${aluno.id || aluno.nome}.jpg`);
            formData.append('upload_preset', uploadPreset);

            const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
            const response = await fetch(url, { method: 'POST', body: formData });
            const data = await response.json();

            if (data.secure_url) {
                onUploadSuccess(data.secure_url);
            } else {
                throw new Error('URL da imagem não retornada pelo Cloudinary.');
            }
        } catch (error) {
            console.error("Falha ao enviar imagem para o Cloudinary:", error);
            alert(`Falha ao enviar imagem. Verifique sua conexão ou as configurações do Cloudinary. Detalhes: ${error.message}`);
        } finally {
            setLoading(false); // Ensure loading is reset
        }
    };

    const handleClose = () => {
        stopCurrentStream();
        onClose();
    }

    const handleRetake = () => {
        setFotoTiradaUrl(null);
        setCroppedImageUrl(null);
        setCrop(undefined);
        setCompletedCrop(undefined);
        setFacingMode('environment'); // Reset to default camera facing mode
        // Camera will restart via useEffect
    }

    const handleConfirmCrop = useCallback(async () => {
        const blob = await getCroppedImageBlob();
        if (blob) {
            setCroppedImageUrl(URL.createObjectURL(blob)); // Display the final cropped image
        } else {
            alert("Não foi possível gerar a imagem recortada. Tente novamente.");
        }
    }, [getCroppedImageBlob]);

    const modalTitle = aluno.fotoUrl && !fotoTiradaUrl && !croppedImageUrl ? `Editar Foto de ${aluno.nome}` : `Foto de ${aluno.nome}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div
                className="bg-white p-4 rounded-lg text-black max-w-sm w-full max-h-[90vh] overflow-y-auto"
                style={{ transform: 'translateX(30px)' }} // <-- Linha modificada aqui!
            >
                <h2 className="text-xl font-bold mb-3 text-center">{modalTitle}</h2>
                <div className="relative w-full h-64 bg-black rounded overflow-hidden mb-3 flex items-center justify-center">
                    {croppedImageUrl ? ( // Step 3: Display the final cropped image
                        <img src={croppedImageUrl} alt="Preview da Imagem Recortada" className="w-full h-full object-contain" />
                    ) : fotoTiradaUrl ? ( // Step 2: Show the cropping interface
                        <ReactCrop
                            crop={crop}
                            onChange={c => setCrop(c)}
                            onComplete={c => setCompletedCrop(c)}
                            // Removed 'aspect' prop to allow free cropping
                        >
                            <img
                                src={fotoTiradaUrl}
                                alt="Imagem para recortar"
                                onLoad={(e) => setImageRef(e.currentTarget)} // Capture the image ref for cropping
                                className="w-full h-full object-contain" // object-contain to fit within crop area
                            />
                        </ReactCrop>
                    ) : ( // Step 1: Show the camera feed
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>
                {/* Hidden canvas for image processing */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div className="flex justify-between items-center mt-4">
                    <button onClick={handleClose} className="text-sm text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100">Cancelar</button>

                    {croppedImageUrl ? ( // After cropping, show "Retake" and "Save"
                        <div className="flex gap-2">
                            <button onClick={handleRetake} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Retake / Nova Foto</button>
                            <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                {loading ? 'Salvando...' : 'Salvar Foto'}
                            </button>
                        </div>
                    ) : fotoTiradaUrl ? ( // After taking photo or loading existing, show "Retake" and "Crop"
                        <div className="flex gap-2">
                            <button onClick={handleRetake} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Retake / Nova Foto</button>
                            <button onClick={handleConfirmCrop} disabled={!completedCrop} className={`px-4 py-2 text-white rounded-lg transition-colors ${!completedCrop ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                Recortar Imagem
                            </button>
                        </div>
                    ) : ( // Before taking photo, show "Switch Camera" and "Capture"
                        <div className="flex items-center gap-2">
                            <button onClick={handleSwitchCamera} className="p-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" title="Trocar Câmera">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><path d="m20 12-3-3-3 3"/><path d="m4 12 3 3 3-3"/></svg>
                            </button>
                            <button
                                onClick={tirarFoto}
                                disabled={!isCameraReady}
                                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                                    isCameraReady
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-blue-300 cursor-not-allowed'
                                }`}
                            >
                                {isCameraReady ? 'Capturar Foto' : 'Aguardando...'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraModal;