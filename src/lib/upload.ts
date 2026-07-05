import { supabase } from "@/integrations/supabase/client";
import { fileInputToDataUrl } from "./file-input";

const BUCKET = "mdink-media";

/**
 * يرفع ملف على Supabase Storage ويرجّع الـ public URL.
 * لو Storage فشل لأي سبب، يرجّع data URL كـ fallback عشان الصفحة ما تكسرش.
 */
export async function uploadMedia(file: File, folder = "general"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  try {
    const db = supabase as any;
    const { error } = await db.storage.from(BUCKET).upload(safeName, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = db.storage.from(BUCKET).getPublicUrl(safeName);
    if (data?.publicUrl) return data.publicUrl as string;
    throw new Error("No public URL");
  } catch {
    // Fallback: data URL (يشتغل من غير Storage)
    return fileInputToDataUrl(file, 4);
  }
}

/**
 * يرفع ملف فيديو على Supabase Storage ويرجّع الـ public URL.
 * على عكس الصور، لا يوجد fallback إلى data URL — ملفات الفيديو كبيرة،
 * فإن فشل الرفع نرمي الخطأ ليظهر للمستخدم بدل تضمين ملف ضخم في الصفحة.
 */
export async function uploadVideo(file: File, folder = "videos"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const db = supabase as any;
  const { error } = await db.storage.from(BUCKET).upload(safeName, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = db.storage.from(BUCKET).getPublicUrl(safeName);
  if (!data?.publicUrl) throw new Error("تعذّر الحصول على رابط الفيديو");
  return data.publicUrl as string;
}

export const ACCEPT_IMAGE = "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml";
export const ACCEPT_FILE = "image/png,image/jpeg,image/jpg,image/webp,application/pdf";
export const ACCEPT_VIDEO = "video/mp4,video/webm,video/ogg,video/quicktime";
