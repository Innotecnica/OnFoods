export interface ProductCategory {
  name: string;
  icon: string;
  description?: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  // Comidas principais
  { name: "Pizza", icon: "🍕", description: "Pizzas tradicionais e especiais" },
  { name: "Hambúrguer", icon: "🍔", description: "Hambúrgueres artesanais e tradicionais" },
  { name: "Sushi", icon: "🍣", description: "Comida japonesa e sushi" },
  { name: "Pasta", icon: "🍝", description: "Massas e comida italiana" },
  { name: "Tacos", icon: "🌮", description: "Comida mexicana" },
  { name: "Sanduíches", icon: "🥪", description: "Sanduíches variados" },
  { name: "Saladas", icon: "🥗", description: "Saladas frescas e saudáveis" },
  { name: "Sopas", icon: "🍲", description: "Sopas e caldos" },
  { name: "Churrasco", icon: "🥩", description: "Carnes grelhadas e churrasco" },
  { name: "Frango", icon: "🍗", description: "Pratos com frango" },
  
  // Comida regional/internacional
  { name: "Brasileira", icon: "🇧🇷", description: "Comida típica brasileira" },
  { name: "Italiana", icon: "🇮🇹", description: "Culinária italiana" },
  { name: "Japonesa", icon: "🇯🇵", description: "Culinária japonesa" },
  { name: "Chinesa", icon: "🇨🇳", description: "Culinária chinesa" },
  { name: "Mexicana", icon: "🇲🇽", description: "Culinária mexicana" },
  { name: "Indiana", icon: "🇮🇳", description: "Culinária indiana" },
  { name: "Árabe", icon: "🧆", description: "Culinária árabe" },
  { name: "Francesa", icon: "🇫🇷", description: "Culinária francesa" },
  { name: "Tailandesa", icon: "🇹🇭", description: "Culinária tailandesa" },
  { name: "Coreana", icon: "🇰🇷", description: "Culinária coreana" },
  { name: "Peruana", icon: "🇵🇪", description: "Culinária peruana" },
  { name: "Americana", icon: "🇺🇸", description: "Culinária americana" },
  { name: "Mediterrânea", icon: "🫒", description: "Culinária mediterrânea" },
  { name: "Grega", icon: "🇬🇷", description: "Culinária grega" },
  { name: "Espanhola", icon: "🇪🇸", description: "Culinária espanhola" },
  
  // Tipos específicos de estabelecimento
  { name: "Fast Food", icon: "🍟", description: "Comida rápida" },
  { name: "Vegetariana", icon: "🥬", description: "Pratos vegetarianos" },
  { name: "Vegana", icon: "🌱", description: "Pratos veganos" },
  { name: "Orgânica", icon: "🌿", description: "Alimentos orgânicos" },
  { name: "Fit", icon: "💪", description: "Comida fitness e saudável" },
  { name: "Low Carb", icon: "🥑", description: "Pratos com baixo carboidrato" },
  { name: "Sem Glúten", icon: "🌾", description: "Opções sem glúten" },
  { name: "Sem Lactose", icon: "🥛", description: "Opções sem lactose" },
  
  // Doces e sobremesas
  { name: "Doces", icon: "🍰", description: "Bolos, tortas e doces" },
  { name: "Sorvetes", icon: "🍦", description: "Sorvetes e gelatos" },
  { name: "Açaí", icon: "🍇", description: "Açaí e vitaminas" },
  { name: "Brigadeiros", icon: "🍫", description: "Brigadeiros e chocolates" },
  { name: "Churros", icon: "🥨", description: "Churros e doces fritos" },
  { name: "Pudins", icon: "🍮", description: "Pudins e sobremesas cremosas" },
  { name: "Cookies", icon: "🍪", description: "Cookies e biscoitos" },
  { name: "Cupcakes", icon: "🧁", description: "Cupcakes e muffins" },
  { name: "Pastéis", icon: "🥧", description: "Pastéis doces" },
  
  // Bebidas
  { name: "Café", icon: "☕", description: "Café e bebidas quentes" },
  { name: "Sucos", icon: "🧃", description: "Sucos naturais e vitaminas" },
  { name: "Smoothies", icon: "🥤", description: "Smoothies e batidas" },
  { name: "Chás", icon: "🍵", description: "Chás e infusões" },
  { name: "Refrigerantes", icon: "🥤", description: "Refrigerantes e bebidas gaseificadas" },
  { name: "Águas", icon: "💧", description: "Águas e bebidas isotônicas" },
  { name: "Cervejas", icon: "🍺", description: "Cervejas artesanais" },
  { name: "Vinhos", icon: "🍷", description: "Vinhos e espumantes" },
  { name: "Coquetéis", icon: "🍹", description: "Coquetéis e drinks" },
  
  // Lanches e petiscos
  { name: "Petiscos", icon: "🍤", description: "Petiscos variados" },
  { name: "Salgados", icon: "🥟", description: "Salgados assados e fritos" },
  { name: "Pastéis Salgados", icon: "🥙", description: "Pastéis e esfihas" },
  { name: "Coxinhas", icon: "🍗", description: "Coxinhas e salgados brasileiros" },
  { name: "Empadas", icon: "🥧", description: "Empadas e tortas salgadas" },
  { name: "Pães", icon: "🍞", description: "Pães e padaria" },
  { name: "Croissants", icon: "🥐", description: "Croissants e folhados" },
  { name: "Bagels", icon: "🥯", description: "Bagels e pães especiais" },
  
  // Comidas de rua e regionais
  { name: "Acarajé", icon: "🫘", description: "Comida baiana" },
  { name: "Tapioca", icon: "🌯", description: "Tapiocas e crepes" },
  { name: "Pamonha", icon: "🌽", description: "Pamonha e milho verde" },
  { name: "Espetinhos", icon: "🍢", description: "Espetinhos e churrasquinho" },
  { name: "Hot Dog", icon: "🌭", description: "Cachorros-quentes" },
  { name: "Batata Frita", icon: "🍟", description: "Batatas fritas e porções" },
  { name: "Onion Rings", icon: "🧅", description: "Anéis de cebola" },
  
  // Pratos específicos
  { name: "Feijoada", icon: "🍛", description: "Feijoada brasileira" },
  { name: "Marmitas", icon: "🍱", description: "Marmitas e pratos executivos" },
  { name: "Risotto", icon: "🍚", description: "Risotos diversos" },
  { name: "Paella", icon: "🥘", description: "Paella espanhola" },
  { name: "Lasanha", icon: "🧀", description: "Lasanhas e gratinados" },
  { name: "Ramen", icon: "🍜", description: "Ramen e sopas asiáticas" },
  { name: "Poke", icon: "🐟", description: "Poke bowls" },
  { name: "Wraps", icon: "🌯", description: "Wraps e burritos" },
  { name: "Quiches", icon: "🥧", description: "Quiches e tortas salgadas" },
  { name: "Crepes", icon: "🥞", description: "Crepes doces e salgados" },
  
  // Frutos do mar
  { name: "Frutos do Mar", icon: "🦐", description: "Peixes e frutos do mar" },
  { name: "Salmão", icon: "🍣", description: "Pratos com salmão" },
  { name: "Camarão", icon: "🦐", description: "Pratos com camarão" },
  { name: "Bacalhau", icon: "🐟", description: "Pratos com bacalhau" },
  
  // Especiais
  { name: "Buffet", icon: "🍽️", description: "Restaurantes com buffet" },
  { name: "Rodízio", icon: "🔄", description: "Rodízios diversos" },
  { name: "À la Carte", icon: "📜", description: "Pratos à la carte" },
  { name: "Degustação", icon: "🍷", description: "Menus degustação" },
  { name: "Brunch", icon: "🍳", description: "Brunch e café da manhã especial" },
  
  // Dietas específicas
  { name: "Keto", icon: "🥓", description: "Dieta cetogênica" },
  { name: "Paleo", icon: "🥩", description: "Dieta paleolítica" },
  { name: "Detox", icon: "🥒", description: "Sucos e pratos detox" },
  { name: "Proteína", icon: "💪", description: "Alto teor de proteína" },
  { name: "Low Sodium", icon: "🧂", description: "Baixo teor de sódio" },
  
  // Ocasiões especiais
  { name: "Festa", icon: "🎉", description: "Comidas para festas" },
  { name: "Romântico", icon: "❤️", description: "Jantar romântico" },
  { name: "Família", icon: "👨‍👩‍👧‍👦", description: "Pratos para família" },
  { name: "Infantil", icon: "🧒", description: "Comida para crianças" },
  { name: "Almoço Executivo", icon: "💼", description: "Almoços executivos" },
  
  // Tipos de preparo
  { name: "Grelhados", icon: "🔥", description: "Pratos grelhados" },
  { name: "Assados", icon: "🔥", description: "Pratos assados" },
  { name: "Fritos", icon: "🍤", description: "Pratos fritos" },
  { name: "Crus", icon: "🥒", description: "Pratos crus e frescos" },
  { name: "Defumados", icon: "💨", description: "Pratos defumados" },
  
  // Complementos
  { name: "Acompanhamentos", icon: "🥔", description: "Acompanhamentos diversos" },
  { name: "Molhos", icon: "🍯", description: "Molhos e temperos" },
  { name: "Queijos", icon: "🧀", description: "Variedade de queijos" },
  { name: "Frutas", icon: "🍎", description: "Frutas frescas" },
  { name: "Nuts", icon: "🥜", description: "Nozes e castanhas" }
];

export const getCategoryByName = (name: string): ProductCategory | undefined => {
  return PRODUCT_CATEGORIES.find(category => 
    category.name.toLowerCase() === name.toLowerCase()
  );
};

export const getCategoriesByType = (type: 'main' | 'regional' | 'dessert' | 'drinks' | 'snacks'): ProductCategory[] => {
  const typeMapping = {
    main: PRODUCT_CATEGORIES.slice(0, 10),
    regional: PRODUCT_CATEGORIES.slice(10, 25),
    dessert: PRODUCT_CATEGORIES.slice(25, 35),
    drinks: PRODUCT_CATEGORIES.slice(35, 45),
    snacks: PRODUCT_CATEGORIES.slice(45, 55)
  };
  
  return typeMapping[type] || [];
};

export const searchCategories = (query: string): ProductCategory[] => {
  const searchTerm = query.toLowerCase();
  return PRODUCT_CATEGORIES.filter(category =>
    category.name.toLowerCase().includes(searchTerm) ||
    category.description?.toLowerCase().includes(searchTerm)
  );
};