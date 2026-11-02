import { useState } from 'react';
import { request } from '../api.js';

const MAX_SIDE = 1600;
const MAX_BYTES = 2 * 1024 * 1024;
const QUALITIES = [0.85, 0.6];

const encode = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

// Reduz no navegador antes de enviar: as imagens ficam no banco, que tem espaco limitado.
async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of QUALITIES) {
    const blob = await encode(canvas, quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('A imagem continua grande demais depois de reduzida');
}

export function ImageField({ label, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const upload = async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await request('/api/admin/images', { method: 'POST', blob: await shrink(file) });
      onChange(url);
    } catch (failure) {
      setError(failure.message || 'Não foi possível usar esta imagem');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="image-field">
      <div className="image-field-row">
        <label className="field">
          {label}
          <input value={value} placeholder="https://..." onChange={(event) => onChange(event.target.value)} />
        </label>
        <label className="button button--quiet file-button">
          {busy ? 'Enviando…' : 'Enviar do computador'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={upload} disabled={busy} />
        </label>
      </div>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      {value && <img className="image-field-preview" src={value} alt={`Prévia: ${label}`} />}
    </div>
  );
}
