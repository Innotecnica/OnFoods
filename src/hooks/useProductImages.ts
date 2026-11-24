import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImageUpload } from "@/hooks/useImageUpload";

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function useProductImages(productId?: string) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { uploadImage, deleteImage } = useImageUpload();
  const { user } = useAuth();

  const loadProductImages = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading product images:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProductImages();
  }, [loadProductImages]);

  const addImage = async (file: File): Promise<string> => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Upload the image first
    const imageUrl = await uploadImage(file, 'product-images', 'products');
    
    // If we have a product ID, save to database
    if (productId) {
      const nextOrder = images.length;
      const isPrimary = images.length === 0; // First image is primary

      const { data, error } = await supabase
        .from('product_images')
        .insert([{
          product_id: productId,
          image_url: imageUrl,
          display_order: nextOrder,
          is_primary: isPrimary,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setImages(prev => [...prev, data]);
    }

    return imageUrl;
  };

  const removeImage = async (imageId: string) => {
      const imageToRemove = images.find(img => img.id === imageId);
      if (!imageToRemove) return;

      // Delete from database
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Try to delete from storage (don't fail if this fails)
      try {
        const urlParts = imageToRemove.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${user?.id}/products/${fileName}`;
        await deleteImage('product-images', filePath);
      } catch (storageError) {
        console.warn('Could not delete image from storage:', storageError);
      }

      // Update local state
      setImages(prev => prev.filter(img => img.id !== imageId));

      // If we removed the primary image, set the first remaining image as primary
      if (imageToRemove.is_primary && images.length > 1) {
        const remainingImages = images.filter(img => img.id !== imageId);
        if (remainingImages.length > 0) {
          await setPrimaryImage(remainingImages[0].id);
        }
      }
  };

  const setPrimaryImage = async (imageId: string) => {
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      // Update local state
      setImages(prev => prev.map(img => ({
        ...img,
        is_primary: img.id === imageId
      })));
  };

  const reorderImages = async (newOrder: ProductImage[]) => {
      // Update each image's display_order individually
      for (const [index, image] of newOrder.entries()) {
        const { error } = await supabase
          .from('product_images')
          .update({ display_order: index })
          .eq('id', image.id);

        if (error) throw error;
      }

      // Update local state
      setImages(newOrder.map((image, index) => ({
        ...image,
        display_order: index
      })));
  };

  const saveImagesForProduct = async (productId: string, imageUrls: string[]) => {
      if (imageUrls.length === 0) return;

      const imagesToInsert = imageUrls.map((url, index) => ({
        product_id: productId,
        image_url: url,
        display_order: index,
        is_primary: index === 0, // First image is primary
      }));

      const { error } = await supabase
        .from('product_images')
        .insert(imagesToInsert);

      if (error) throw error;
  };

  const getPrimaryImage = (): ProductImage | null => {
    return images.find(img => img.is_primary) || images[0] || null;
  };

  const getImageUrls = (): string[] => {
    return images.map(img => img.image_url);
  };

  return {
    images,
    isLoading,
    addImage,
    removeImage,
    setPrimaryImage,
    reorderImages,
    saveImagesForProduct,
    getPrimaryImage,
    getImageUrls,
    refetch: loadProductImages,
  };
}
