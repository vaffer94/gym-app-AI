/**
 * Comprime una foto lato client: max 320px, WebP ~50KB, ritorna un dataURL.
 * Salvata direttamente nel documento Firestore (niente Firebase Storage -> resta tutto gratis).
 */
export function compressPhoto(file, maxSize = 320, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/webp', quality)
      // fallback jpeg per browser senza webp encoder
      resolve(dataUrl.startsWith('data:image/webp') ? dataUrl : canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Immagine non valida'))
    }
    img.src = url
  })
}
