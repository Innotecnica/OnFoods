import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const uploadImage = async (
    file: File, 
    bucket: 'avatars' | 'establishment-logos' | 'establishment-banners' | 'product-images',
    folder?: string
  ): Promise<string> => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    console.log(`🔄 Iniciando upload para bucket: ${bucket}, pasta: ${folder || 'raiz'}`);
    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder ? folder + '/' : ''}${Date.now()}.${fileExt}`;
      
      console.log(`📝 Nome do arquivo: ${fileName}`);
      console.log(`📊 Tamanho do arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        throw error;
      }

      console.log('✅ Upload realizado com sucesso:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      console.log('🔗 URL pública gerada:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('💥 Erro durante upload:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Erro ao fazer upload da imagem'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (
    bucket: 'avatars' | 'establishment-logos' | 'establishment-banners' | 'product-images',
    filePath: string
  ) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Erro ao excluir imagem'
      );
    }
  };

  return {
    uploadImage,
    deleteImage,
    isUploading,
  };
}