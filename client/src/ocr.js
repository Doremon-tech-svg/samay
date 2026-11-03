import { createWorker, PSM } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

let workerPromise;
let progressListener = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng+hin', 1, {
      logger: (event) => {
        if (event.status === 'recognizing text') {
          progressListener?.(Math.round((event.progress || 0) * 100));
        }
      }
    }).catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

async function prepareForOcr(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  const bitmap = await createImageBitmap(file);
  try {
    // Small phone screenshots/receipts have very few pixels per printed character.
    // Enlarge small images, but cap the result to avoid excessive browser memory use.
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(4, Math.max(1, 1800 / longestSide));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      // Mild contrast enhancement keeps faint printed text while reducing colored backgrounds.
      const enhanced = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
      pixels[i] = enhanced;
      pixels[i + 1] = enhanced;
      pixels[i + 2] = enhanced;
    }
    context.putImageData(image, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not prepare the image for reading')), 'image/png');
    });
  } finally {
    bitmap.close?.();
  }
}

// Color-preserving, size-limited payload for the optional Gemini vision check.
// This is intentionally separate from grayscale OCR preprocessing.
export async function prepareVisionImage(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    throw new Error('This browser cannot prepare the photo for AI reading.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    let blob;
    for (let attempt = 0; attempt < 4; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the photo for AI reading.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82 - attempt * 0.08));
      if (blob && blob.size <= 1_100_000) break;
      scale *= 0.8;
    }
    if (!blob || blob.size > 1_200_000) throw new Error('Photo is too large to send securely. Try a smaller image.');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the compressed photo.'));
      reader.readAsDataURL(blob);
    });
    return { imageBase64: String(dataUrl).split(',')[1], mimeType: 'image/jpeg', fileName: file.name || '' };
  } finally {
    bitmap.close?.();
  }
}

/**
 * Runs local browser OCR on a receipt photo. Returns raw recognized text and OCR confidence.
 * This does not send the image to SAMAY's server or verify the extracted values.
 */
export async function ocrImage(file, { onProgress } = {}) {
  progressListener = onProgress ?? null;
  try {
    const image = await prepareForOcr(file);
    const worker = await getWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1'
    });
    let result = await worker.recognize(image);

    // Try the standard automatic page layout as a second opinion only for very weak reads.
    if ((result.data.confidence ?? 0) < 50) {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      const retry = await worker.recognize(image);
      if ((retry.data.confidence ?? 0) > (result.data.confidence ?? 0)) result = retry;
    }

    return {
      text: result.data.text ?? '',
      confidence: Math.round(result.data.confidence ?? 0)
    };
  } finally {
    progressListener = null;
  }
}

export async function extractPdfText(file) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF notice to extract the list text.');
  }

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) pages.push(`Page ${pageNumber}\n${pageText}`);
  }

  if (!pages.length) {
    throw new Error('The PDF did not contain readable text. Try a clearer PDF or paste the text manually.');
  }

  return pages.join('\n\n');
}
