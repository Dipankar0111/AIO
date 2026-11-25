/**
 * Image processing utilities for Snap-to-Notes
 * Handles HTML5 Canvas compression, resizing, and markdown title parsing
 */

/**
 * Compresses and resizes an image using HTML5 Canvas
 * Ensures max dimensions do not exceed maxDimension (default 1600px)
 * and exports as JPEG with high quality (default 0.85) to avoid payload limit issues.
 */
export async function compressImage(
  input: string | File,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImageSrc = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;
        if (!width || !height) {
          width = 800;
          height = 400;
        }

        // Downscale proportionally if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(src);
          return;
        }

        // Fill background before drawing so transparent PNGs/SVGs convert cleanly to JPEG
        ctx.fillStyle = src.startsWith('data:image/svg+xml') ? '#211E1A' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (e) {
          console.warn('Canvas export failed, falling back to original source:', e);
          resolve(src);
        }
      };

      img.onerror = err => {
        console.warn('Image load error during compression, using raw source:', err);
        resolve(src);
      };

      img.src = src;
    };

    if (typeof input === 'string') {
      processImageSrc(input);
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        processImageSrc(result);
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Extracts a clean H1 title from Markdown if present on the first few lines,
 * returning the extracted title and the clean content body.
 */
export function extractTitleFromMarkdown(
  content: string,
  fallbackTitle: string = 'Extracted Note'
): { title: string; body: string } {
  if (!content) return { title: fallbackTitle, body: '' };

  const lines = content.split('\n');
  let extractedTitle = '';
  const bodyLines = [...lines];

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (/^#{1,2}\s+/.test(trimmed)) {
      extractedTitle = trimmed.replace(/^#{1,2}\s+/, '').replace(/\*+/g, '').trim();
      bodyLines.splice(i, 1);
      break;
    }
    if (/^title\s*:/i.test(trimmed)) {
      extractedTitle = trimmed.replace(/^title\s*:/i, '').replace(/\*+/g, '').trim();
      bodyLines.splice(i, 1);
      break;
    }
    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      extractedTitle = trimmed.replace(/\*+/g, '').trim();
      bodyLines.splice(i, 1);
      break;
    }
  }

  const cleanBody = bodyLines.join('\n').trim();

  return {
    title: extractedTitle || fallbackTitle,
    body: cleanBody || content
  };
}
