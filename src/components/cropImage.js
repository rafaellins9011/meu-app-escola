// src/components/cropImage.js

/**
 * Esta função pega uma URL de imagem e os pixels de corte do react-easy-crop
 * e retorna uma nova imagem cortada como um Blob.
 */
export const getCroppedImg = (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  image.crossOrigin = 'Anonymous'; // Importante para evitar erros de CORS no canvas

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto 2D do canvas.'));
        return;
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          reject(new Error('Canvas está vazio'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg');
    };
    image.onerror = (error) => {
      reject(error);
    };
  });
};