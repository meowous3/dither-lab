export interface LoadedImage {
  name: string;
  buffer: Float32Array;
  width: number;
  height: number;
}

export function loadImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imgData.data;

      const buf = new Float32Array(img.width * img.height * 3);
      for (let i = 0; i < img.width * img.height; i++) {
        buf[i * 3] = pixels[i * 4] / 255;
        buf[i * 3 + 1] = pixels[i * 4 + 1] / 255;
        buf[i * 3 + 2] = pixels[i * 4 + 2] / 255;
      }

      URL.revokeObjectURL(url);
      resolve({ name: file.name, buffer: buf, width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}
