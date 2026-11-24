// Utility functions for generating share links with Onfoods.co domain
import { buildEstablishmentShareText } from '@/utils/whatsappMessages'

const BASE_DOMAIN = 'https://onfoods.co';

export function generateProductShareUrl(productId: string, establishmentId: string): string {
  return `${BASE_DOMAIN}/establishments/${establishmentId}/products/${productId}`;
}

export function generateEstablishmentShareUrl(establishmentId: string): string {
  return `${BASE_DOMAIN}/establishments/${establishmentId}`;
}

export function generateProductShareText(product: {
  name: string;
  description?: string;
  price: number;
  establishment?: { business_name: string };
  rating?: number;
}): { fullText: string; shortText: string } {
  const productPrice = product.price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const fullText = `🍽️ ${product.name} por apenas ${productPrice}! 
${product.description ? product.description.substring(0, 100) + '...' : 'Produto delicioso disponível agora!'} 
⭐ ${product.rating ? `${product.rating}/5 estrelas` : 'Bem avaliado'} 
🏪 ${product.establishment?.business_name || 'Estabelecimento parceiro'}

Peça já no OnFoods.co! 🚀`;

  const shortText = `🍽️ ${product.name} - ${productPrice} | ${product.establishment?.business_name || 'OnFoods.co'} 🚀`;

  return { fullText, shortText };
}

export function generateEstablishmentShareText(establishmentName: string): string {
  return buildEstablishmentShareText(establishmentName)
}

export function generateWhatsAppShareUrl(text: string, url: string): string {
  const whatsappText = `${text}\n\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
}

export function generateFacebookShareUrl(url: string, quote?: string): string {
  const baseUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return quote ? `${baseUrl}&quote=${encodeURIComponent(quote)}` : baseUrl;
}

export function generateTwitterShareUrl(text: string, url: string, hashtags: string[] = []): string {
  const hashtagString = hashtags.length > 0 ? `&hashtags=${hashtags.join(',')}` : '';
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}${hashtagString}`;
}
