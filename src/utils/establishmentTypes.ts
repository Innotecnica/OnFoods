export interface EstablishmentType {
  value: string;
  label: string;
  emoji: string;
  description?: string;
}

export const ESTABLISHMENT_TYPES: EstablishmentType[] = [
  { value: 'restaurant', label: 'Restaurante', emoji: '🍽️', description: 'Restaurante tradicional' },
  { value: 'pizzaria', label: 'Pizzaria', emoji: '🍕', description: 'Especializada em pizzas' },
  { value: 'hamburgueria', label: 'Hamburgueria', emoji: '🍔', description: 'Especializada em hambúrgueres' },
  { value: 'padaria', label: 'Padaria', emoji: '🥖', description: 'Pães e produtos de padaria' },
  { value: 'lanchonete', label: 'Lanchonete', emoji: '🥪', description: 'Lanches rápidos e salgados' },
  { value: 'confeitaria', label: 'Confeitaria', emoji: '🍰', description: 'Doces, bolos e sobremesas' },
  { value: 'sorveteria', label: 'Sorveteria', emoji: '🍦', description: 'Sorvetes e gelados' },
  { value: 'bar', label: 'Bar', emoji: '🍺', description: 'Bebidas e petiscos' },
  { value: 'cafe', label: 'Café', emoji: '☕', description: 'Cafés e bebidas quentes' },
  { value: 'japonesa', label: 'Japonesa', emoji: '🍣', description: 'Culinária japonesa e sushi' },
  { value: 'italiana', label: 'Italiana', emoji: '🍝', description: 'Culinária italiana' },
  { value: 'brasileira', label: 'Brasileira', emoji: '🇧🇷', description: 'Culinária típica brasileira' },
  { value: 'mexicana', label: 'Mexicana', emoji: '🌮', description: 'Culinária mexicana' },
  { value: 'chinesa', label: 'Chinesa', emoji: '🥢', description: 'Culinária chinesa' },
  { value: 'farmacia', label: 'Farmácia', emoji: '💊', description: 'Medicamentos e produtos de saúde' },
  { value: 'mercado', label: 'Mercado', emoji: '🛒', description: 'Supermercado e conveniência' },
  { value: 'outros', label: 'Outros', emoji: '🏪', description: 'Outros tipos de estabelecimento' }
];

export const getEstablishmentTypeByValue = (value: string): EstablishmentType | undefined => {
  return ESTABLISHMENT_TYPES.find(type => type.value === value);
};

export const getEstablishmentTypeData = (value: string | null) => {
  if (!value) return { emoji: '🏪', label: 'Estabelecimento' };
  
  const type = getEstablishmentTypeByValue(value);
  return type ? { emoji: type.emoji, label: type.label } : { emoji: '🏪', label: 'Estabelecimento' };
};

export const CATEGORY_MAPPING = [
  {
    name: "Pizza",
    icon: "🍕",
    businessTypes: ['pizzaria']
  },
  {
    name: "Hambúrguer", 
    icon: "🍔",
    businessTypes: ['hamburgueria']
  },
  {
    name: "Japonesa",
    icon: "🍣", 
    businessTypes: ['japonesa']
  },
  {
    name: "Italiana",
    icon: "🍝",
    businessTypes: ['italiana']
  },
  {
    name: "Brasileira",
    icon: "🇧🇷",
    businessTypes: ['brasileira', 'restaurant']
  },
  {
    name: "Doces",
    icon: "🍰",
    businessTypes: ['padaria', 'confeitaria', 'sorveteria']
  },
  {
    name: "Lanchonete", 
    icon: "🥪",
    businessTypes: ['lanchonete']
  },
  {
    name: "Café",
    icon: "☕", 
    businessTypes: ['cafe']
  },
  {
    name: "Bar",
    icon: "🍺",
    businessTypes: ['bar'] 
  },
  {
    name: "Mexicana",
    icon: "🌮",
    businessTypes: ['mexicana']
  },
  {
    name: "Chinesa", 
    icon: "🥢",
    businessTypes: ['chinesa']
  },
  {
    name: "Farmácia",
    icon: "💊",
    businessTypes: ['farmacia']
  },
  {
    name: "Mercado",
    icon: "🛒", 
    businessTypes: ['mercado']
  }
];