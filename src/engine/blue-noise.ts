// Blue noise dithering using a pre-baked 64x64 texture
// Organic, random-looking results with no visible grid pattern

let blueNoiseData: Float32Array | null = null;
let loadPromise: Promise<Float32Array> | null = null;

const BLUE_NOISE_SIZE = 64;

/**
 * Generate a procedural blue noise texture (void-and-cluster approximation).
 * Used as fallback if the PNG texture fails to load.
 */
function generateProceduralBlueNoise(): Float32Array {
  const size = BLUE_NOISE_SIZE;
  const data = new Float32Array(size * size);

  // Use a simple hash-based approach that creates a reasonable blue noise pattern
  // This won't be as good as a proper void-and-cluster but works as a fallback
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Interleaved gradient noise (Jorge Jimenez)
      const v = (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1;
      data[y * size + x] = (v + 1) % 1;
    }
  }
  return data;
}

/**
 * Load or generate the blue noise texture. Returns a 64x64 Float32Array (0-1).
 */
export async function loadBlueNoise(): Promise<Float32Array> {
  if (blueNoiseData) return blueNoiseData;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const img = new Image();
      img.src = '/blue-noise-64x64.png';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load blue noise texture'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = BLUE_NOISE_SIZE;
      canvas.height = BLUE_NOISE_SIZE;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, BLUE_NOISE_SIZE, BLUE_NOISE_SIZE);
      const imageData = ctx.getImageData(0, 0, BLUE_NOISE_SIZE, BLUE_NOISE_SIZE);

      const data = new Float32Array(BLUE_NOISE_SIZE * BLUE_NOISE_SIZE);
      for (let i = 0; i < data.length; i++) {
        data[i] = imageData.data[i * 4] / 255; // Use red channel
      }
      blueNoiseData = data;
      return data;
    } catch {
      // Fallback to procedural blue noise
      blueNoiseData = generateProceduralBlueNoise();
      return blueNoiseData;
    }
  })();

  return loadPromise;
}

/**
 * Get the blue noise threshold for a given pixel coordinate.
 */
export function getBlueNoiseThreshold(
  data: Float32Array,
  x: number,
  y: number,
  ditherScale: number
): number {
  const sx = Math.floor(x / ditherScale) % BLUE_NOISE_SIZE;
  const sy = Math.floor(y / ditherScale) % BLUE_NOISE_SIZE;
  return data[sy * BLUE_NOISE_SIZE + sx];
}
