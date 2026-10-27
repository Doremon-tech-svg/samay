// Browser OCR for slip photos using tesseract.js (English + Hindi). NOTE: it downloads language data on first use,
// so for the offline demo, warm the cache once while online (or host the traineddata files locally).
// If OCR is unavailable the UI falls back to the text box, so the demo never depends on it.
export async function ocrImage(file) {
  const { default: Tesseract } = await import('tesseract.js');
  const { data } = await Tesseract.recognize(file, 'eng+hin');
  return data.text;
}
