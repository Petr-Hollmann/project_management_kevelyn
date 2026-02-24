/**
 * Náhrada za Base44 integrace.
 * UploadFile, SendEmail atd. – základní implementace.
 */

import { supabase } from '@/lib/supabase-client';

/**
 * Nahrání souboru do Supabase Storage.
 * Vrací veřejnou URL souboru.
 */
export async function UploadFile({ file, bucket = 'files', folder = '', path = undefined }) {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Upload session:', session ? `user=${session.user.id}` : 'NO SESSION');

  const filePath = path ?? `${folder ? folder + '/' : ''}${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

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
