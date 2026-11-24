// Utility functions for establishment validation

export interface EstablishmentData {
  business_name: string | null;
  business_type: string | null;
  address: string | null;
  phone: string | null;
  delivery_fee: number | null;
  minimum_order: number | null;
  delivery_time_min: number | null;
  delivery_time_max: number | null;
}

/**
 * Check if an establishment profile is complete with all required fields
 */
export const isEstablishmentComplete = (establishment: EstablishmentData): boolean => {
  const requiredFields: (keyof EstablishmentData)[] = [
    'business_name',
    'business_type', 
    'address',
    'phone',
    'delivery_fee',
    'minimum_order',
    'delivery_time_min',
    'delivery_time_max'
  ];
  
  return requiredFields.every(field => {
    const value = establishment[field];
    return value !== null && value !== undefined && value !== '';
  });
};

/**
 * Get missing required fields for an establishment
 */
export const getMissingEstablishmentFields = (establishment: EstablishmentData): string[] => {
  const requiredFields: { field: keyof EstablishmentData; label: string }[] = [
    { field: 'business_name', label: 'Nome do Negócio' },
    { field: 'business_type', label: 'Tipo de Negócio' },
    { field: 'address', label: 'Endereço' },
    { field: 'phone', label: 'Telefone' },
    { field: 'delivery_fee', label: 'Taxa de Entrega' },
    { field: 'minimum_order', label: 'Pedido Mínimo' },
    { field: 'delivery_time_min', label: 'Tempo Mínimo de Entrega' },
    { field: 'delivery_time_max', label: 'Tempo Máximo de Entrega' },
  ];
  
  return requiredFields
    .filter(({ field }) => {
      const value = establishment[field];
      return value === null || value === undefined || value === '';
    })
    .map(({ label }) => label);
};