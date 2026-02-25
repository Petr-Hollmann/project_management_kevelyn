/**
 * Náhrada za Base44 integrace.
 * UploadFile, SendEmail atd. – základní implementace.
 */

import { supabase } from '@/lib/supabase-client';

const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.82;

/**
 * Zkomprimuje obrázek na canvas před uploadem.
 * Zachová poměr stran, max 1920px na delší straně, JPEG kvalita 82%.
 * PDF a ostatní soubory projdou beze změny.
 */
async function compressImageIfNeeded(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION && file.size < 300 * 1024) {
        // Malý obrázek – nepotřebuje kompresi
        resolve(file);
        return;
      }

      // Zmenšení při překročení max rozměru
      if (width > height && width > MAX_IMAGE_DIMENSION) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else if (height > MAX_IMAGE_DIMENSION) {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(`Image compressed: ${(file.size / 1024).toFixed(0)} KB → ${(compressed.size / 1024).toFixed(0)} KB`);
          resolve(compressed);
        },
        'image/jpeg',
        IMAGE_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Nahrání souboru do Supabase Storage.
 * Vrací veřejnou URL souboru.
 */
export async function UploadFile({ file, bucket = 'files', folder = '', path = undefined }) {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Upload session:', session ? `user=${session.user.id}` : 'NO SESSION');

  const processedFile = await compressImageIfNeeded(file);

  const filePath = path ?? `${folder ? folder + '/' : ''}${Date.now()}_${processedFile.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, processedFile, { upsert: true });

  if (error) {
    console.error('UploadFile error full object:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { file_url: urlData.publicUrl };
}

/**
 * Odeslání emailu – zatím jen stub (vyžaduje edge function nebo SMTP).
 * Implementuj dle potřeby.
 */
export async function SendEmail({ to, subject, body }) {
  console.warn('SendEmail: not yet implemented. Set up Supabase Edge Functions or external SMTP.');
  return { success: false, message: 'Email sending not configured' };
}

/**
 * Odeslání SMS – stub.
 */
export async function SendSMS({ to, message }) {
  console.warn('SendSMS: not yet implemented.');
  return { success: false };
}

/**
 * Volání AI (LLM) – stub.
 */
export async function InvokeLLM({ prompt, model }) {
  console.warn('InvokeLLM: not yet implemented.');
  return { output: '' };
}

/**
 * Generování obrázku – stub.
 */
export async function GenerateImage({ prompt }) {
  console.warn('GenerateImage: not yet implemented.');
  return { image_url: '' };
}

/**
 * Extrakce dat z nahraného souboru – stub.
 */
export async function ExtractDataFromUploadedFile({ file_url }) {
  console.warn('ExtractDataFromUploadedFile: not yet implemented.');
  return { data: {} };
}

export const Core = {
  InvokeLLM,
  SendEmail,
  SendSMS,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
};
