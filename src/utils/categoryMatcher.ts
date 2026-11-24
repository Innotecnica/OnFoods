import { PRODUCT_CATEGORIES, ProductCategory, searchCategories } from "./productCategories";

/**
 * Mapeia sabores/palavras-chave para categorias de produtos
 */
const FLAVOR_CATEGORY_MAP: Record<string, string[]> = {
  // Sabores de pizza
  "margherita": ["Pizza", "Italiana"],
  "calabresa": ["Pizza", "Brasileira"],
  "portuguesa": ["Pizza", "Portuguesa"],
  "frango": ["Pizza", "Frango"],
  "catupiry": ["Pizza", "Frango"],
  "pepperoni": ["Pizza", "Americana"],
  "quattro": ["Pizza", "Italiana"],
  "napolitana": ["Pizza", "Italiana"],
  "romana": ["Pizza", "Italiana"],
  "siciliana": ["Pizza", "Italiana"],
  
  // Sabores de hambúrguer
  "bacon": ["Hambúrguer", "Americana", "Churrasco"],
  "cheddar": ["Hambúrguer", "Americana"],
  "smash": ["Hambúrguer", "Americana"],
  "artesanal": ["Hambúrguer", "Gourmet"],
  "veggie": ["Hambúrguer", "Vegetariana"],
  
  // Sabores de açaí
  "morango": ["Açaí", "Frutas", "Sorvetes"],
  "banana": ["Açaí", "Frutas", "Sorvetes"],
  "granola": ["Açaí", "Fit", "Orgânica"],
  "leite condensado": ["Açaí", "Doces"],
  "paçoca açaí": ["Açaí", "Doces", "Brasileira"],
  
  // Sabores de sorvete
  "chocolate": ["Sorvetes", "Doces", "Chocolate"],
  "baunilha": ["Sorvetes", "Doces"],
  "pistache": ["Sorvetes", "Doces", "Nuts"],
  "coco": ["Sorvetes", "Doces", "Frutas"],
  "flocos": ["Sorvetes", "Doces", "Brasileira"],
  
  // Sabores de sushi
  "salmão": ["Sushi", "Japonesa", "Salmão", "Frutos do Mar"],
  "atum": ["Sushi", "Japonesa", "Frutos do Mar"],
  "skin": ["Sushi", "Japonesa", "Salmão"],
  "califórnia": ["Sushi", "Japonesa"],
  "philadelphia": ["Sushi", "Japonesa", "Salmão"],
  "temaki": ["Sushi", "Japonesa"],
  "hossomaki": ["Sushi", "Japonesa"],
  "uramaki": ["Sushi", "Japonesa"],
  
  // Sabores de massa
  "carbonara": ["Pasta", "Italiana"],
  "bolonhesa": ["Pasta", "Italiana", "Carne"],
  "alfredo": ["Pasta", "Italiana"],
  "pesto": ["Pasta", "Italiana"],
  "arrabbiata": ["Pasta", "Italiana"],
  "aglio": ["Pasta", "Italiana"],
  
  // Sabores de café
  "espresso": ["Café"],
  "cappuccino": ["Café"],
  "mocha": ["Café", "Chocolate"],
  "macchiato": ["Café"],
  "americano": ["Café", "Americana"],
  "latte": ["Café"],
  
  // Sabores regionais brasileiros
  "carne de sol": ["Brasileira", "Churrasco"],
  "baião": ["Brasileira"],
  "acarajé": ["Acarajé", "Brasileira", "Baiana"],
  "farofa": ["Brasileira"],
  "mandioca": ["Brasileira"],
  "queijo coalho": ["Brasileira", "Queijos"],
  "rapadura": ["Brasileira", "Doces"],
  
  // Doces brasileiros
  "brigadeiro": ["Brigadeiros", "Doces", "Chocolate", "Brasileira"],
  "beijinho": ["Doces", "Brasileira", "Coco"],
  "quindim": ["Doces", "Brasileira"],
  "pudim": ["Pudins", "Doces", "Brasileira"],
  "paçoca doce": ["Doces", "Brasileira", "Nuts"],
  "cocada": ["Doces", "Brasileira", "Coco"],
  
  // Bebidas
  "caipirinha": ["Coquetéis", "Brasileira"],
  "mojito": ["Coquetéis"],
  "margarita": ["Coquetéis", "Mexicana"],
  "sangria": ["Coquetéis", "Espanhola"],
  "suco verde": ["Sucos", "Detox", "Fit"],
  "vitamina": ["Sucos", "Frutas", "Fit"],
  
  // Pratos específicos
  "feijoada": ["Feijoada", "Brasileira"],
  "picanha": ["Churrasco", "Brasileira"],
  "linguiça": ["Churrasco", "Brasileira"],
  "costela": ["Churrasco", "Brasileira"],
  "alcatra": ["Churrasco", "Brasileira"],
  "fraldinha": ["Churrasco", "Brasileira"],
  
  // Frutos do mar
  "camarão": ["Camarão", "Frutos do Mar"],
  "lagosta": ["Frutos do Mar"],
  "polvo": ["Frutos do Mar"],
  "lula": ["Frutos do Mar"],
  "bacalhau": ["Bacalhau", "Frutos do Mar", "Portuguesa"],
  "sardinha": ["Frutos do Mar", "Portuguesa"],
  
  // Tipos de preparo
  "grelhado": ["Grelhados"],
  "assado": ["Assados"],
  "frito": ["Fritos"],
  "defumado": ["Defumados"],
  "cru": ["Crus"],
  
  // Dietas
  "sem glúten": ["Sem Glúten"],
  "sem lactose": ["Sem Lactose"],
  "vegano": ["Vegana"],
  "vegetariano": ["Vegetariana"],
  "low carb": ["Low Carb"],
  "keto": ["Keto"],
  "fitness": ["Fit"],
  "detox": ["Detox"],
  "orgânico": ["Orgânica"],
  "proteína": ["Proteína", "Fit"]
};

/**
 * Extrai possíveis categorias baseado em uma query de busca
 */
export function extractCategoriesFromQuery(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const foundCategories = new Set<string>();
  
  // Busca direta por sabores/palavras-chave
  Object.entries(FLAVOR_CATEGORY_MAP).forEach(([flavor, categories]) => {
    if (normalizedQuery.includes(flavor.toLowerCase())) {
      categories.forEach(cat => foundCategories.add(cat));
    }
  });
  
  // Busca por categorias existentes
  const categoryMatches = searchCategories(normalizedQuery);
  categoryMatches.forEach(cat => foundCategories.add(cat.name));
  
  // Busca por palavras individuais
  const words = normalizedQuery.split(' ').filter(word => word.length > 2);
  words.forEach(word => {
    Object.entries(FLAVOR_CATEGORY_MAP).forEach(([flavor, categories]) => {
      if (flavor.toLowerCase().includes(word) || word.includes(flavor.toLowerCase())) {
        categories.forEach(cat => foundCategories.add(cat));
      }
    });
  });
  
  return Array.from(foundCategories);
}

/**
 * Obtém a categoria mais relevante para uma query
 */
export function getPrimaryCategory(query: string): string | null {
  const categories = extractCategoriesFromQuery(query);
  
  if (categories.length === 0) return null;
  
  // Prioriza categorias mais específicas
  const priorityOrder = [
    'Pizza', 'Hambúrguer', 'Sushi', 'Açaí', 'Sorvetes', 'Café',
    'Feijoada', 'Churrasco', 'Frutos do Mar', 'Brasileira',
    'Italiana', 'Japonesa', 'Mexicana', 'Americana'
  ];
  
  for (const priority of priorityOrder) {
    if (categories.includes(priority)) {
      return priority;
    }
  }
  
  return categories[0];
}

/**
 * Constrói filtros de busca baseado na query
 */
export function buildSearchFilters(query: string) {
  const categories = extractCategoriesFromQuery(query);
  const primaryCategory = getPrimaryCategory(query);
  
  return {
    categories,
    primaryCategory,
    hasCategories: categories.length > 0
  };
}