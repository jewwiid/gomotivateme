export type PreparedImage = {
  display: File;
  thumbnail?: File;
};

const DISPLAY_MAX_DIMENSION = 1920;
const THUMBNAIL_MAX_DIMENSION = 640;

/**
 * Produce display-appropriate WebP copies in the browser before upload.
 * This keeps the original camera file out of storage while retaining a sharp
 * full-size image and a much smaller responsive variant for feeds/grids.
 */
export async function prepareProgressImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");

  // Re-encoding animated or vector formats would lose their intended content.
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { display: file };
  }

  try {
    const image = await loadImage(file);
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const displayCandidate = await renderWebp(image, DISPLAY_MAX_DIMENSION, 0.82, file.name);
    const display =
      displayCandidate && (longestEdge > DISPLAY_MAX_DIMENSION || displayCandidate.size < file.size)
        ? displayCandidate
        : file;

    const thumbnail =
      longestEdge > THUMBNAIL_MAX_DIMENSION
        ? await renderWebp(image, THUMBNAIL_MAX_DIMENSION, 0.72, file.name)
        : undefined;

    return {
      display,
      thumbnail:
        thumbnail && thumbnail.size < display.size ? thumbnail : undefined,
    };
  } catch {
    // Browser-decoding support varies for formats such as HEIC/AVIF. The
    // server still validates the input, and the original remains usable.
    return { display: file };
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(source);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("This image could not be prepared"));
    };
    image.src = source;
  });
}

async function renderWebp(
  image: HTMLImageElement,
  maxDimension: number,
  quality: number,
  originalName: string
) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) return undefined;

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );
  if (!blob || blob.type !== "image/webp") return undefined;

  return new File([blob], `${fileStem(originalName)}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function fileStem(name: string) {
  const stem = name.replace(/\.[^/.]+$/, "").trim() || "progress-photo";
  return stem.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "progress-photo";
}
