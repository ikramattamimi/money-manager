import type { Tables } from '@/lib/database.types';
import { compressImage } from '@/lib/imageCompression';
import { useSupabase } from '@/lib/supabase';
import { uuid } from '@/lib/uuid';

export type Profile = Tables<'profiles'>;

const BUCKET = 'avatars';

/** Path file di bucket dari URL publiknya (untuk menghapus foto lama) */
function pathOf(url: string | null): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  return url && at >= 0 ? decodeURIComponent(url.slice(at + marker.length).split('?')[0]!) : null;
}

export const profileApi = {
  async get(userId: string): Promise<Profile> {
    const { data, error } = await useSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw new Error('Gagal memuat profil.', { cause: error });
    return data;
  },

  async updateName(userId: string, name: string): Promise<void> {
    const { error } = await useSupabase()
      .from('profiles')
      .update({ display_name: name.trim().slice(0, 60) })
      .eq('id', userId);
    if (error) throw new Error('Gagal menyimpan nama.', { cause: error });
  },

  /**
   * Foto profil: dikecilkan jadi 512 px, diunggah dengan nama acak ke folder
   * user, lalu foto lama dihapus. Mengembalikan URL publik yang baru.
   */
  async uploadAvatar(userId: string, file: File, previous: string | null): Promise<string> {
    const supabase = useSupabase();
    const image = await compressImage(file, 512, 0.85);
    const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${uuid()}.${ext}`;
    const upload = await supabase.storage
      .from(BUCKET)
      .upload(path, image, { contentType: image.type || 'image/jpeg', upsert: false });
    if (upload.error)
      throw new Error('Gagal mengunggah foto. Pakai JPG/PNG di bawah 1 MB.', {
        cause: upload.error,
      });

    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error('Gagal menyimpan foto profil.', { cause: error });
    }
    const old = pathOf(previous);
    if (old) await supabase.storage.from(BUCKET).remove([old]);
    return url;
  },

  async removeAvatar(userId: string, previous: string | null): Promise<void> {
    const supabase = useSupabase();
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
    if (error) throw new Error('Gagal menghapus foto profil.', { cause: error });
    const old = pathOf(previous);
    if (old) await supabase.storage.from(BUCKET).remove([old]);
  },
};
