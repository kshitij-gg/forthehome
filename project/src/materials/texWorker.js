// Texture synthesis worker: runs the procedural generators off the main thread and ships the
// results back as transferable ImageBitmaps (+ optional encoded blobs for the IndexedDB cache).
import * as T from './textures.js';

self.onmessage = async (e) => {
  const { id, fn, args, encode } = e.data;
  try {
    const res = T[fn](args || {});
    const parts = {}; const transfer = [];
    const pack = async (key, tex) => {
      const cv = tex.image, srgb = tex.colorSpace === 'srgb';
      let blob = null;
      if (encode && cv.convertToBlob) { try { blob = await cv.convertToBlob(srgb ? { type: 'image/webp', quality: 0.95 } : { type: 'image/png' }); } catch { blob = null; } }
      const bmp = cv.transferToImageBitmap();
      parts[key] = { bitmap: bmp, blob, srgb, repeat: [tex.repeat.x, tex.repeat.y], rotation: tex.rotation };
      transfer.push(bmp);
    };
    if (res && res.isTexture) await pack('_', res);
    else for (const [k, v] of Object.entries(res)) if (v && v.isTexture) await pack(k, v);
    self.postMessage({ id, parts }, transfer);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.stack || err) });
  }
};
