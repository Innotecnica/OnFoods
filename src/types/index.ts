// ============================================================================
// CENTRAL TYPE DEFINITIONS - Elimina redundâncias de interfaces
// ============================================================================

// ============================================================================
// ESTABLISHMENT TYPES
// ============================================================================

export interface BaseEstablishment {
  id: string;
  business_name: string;
  business_type: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  description: string;
  logo_url: string;
  banner_url: string;
  delivery_fee: number;
  minimum_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_active: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
  payment_gateway?: PaymentGateway;
}

export interface EstablishmentDetail extends BaseEstablishment {
  establishment_subscriptions?: {
    status: string;
    current_period_end: string;
  }[];
}

export interface EstablishmentSearchResult extends BaseEstablishment {
  search_rank?: number;
}

export interface EstablishmentSearchFilters {
  searchQuery?: string;
  businessType?: string;
  city?: string;
  state?: string;
  minRating?: number;
  minDeliveryFee?: number;
  maxDeliveryFee?: number;
  maxDeliveryTime?: number;
  onlyActive?: boolean;
  onlyOpen?: boolean;
  limit?: number;
}

export interface EstablishmentFavorite {
  id: string;
  user_id: string;
  establishment_id: string;
  created_at: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface BaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  preparation_time: number;
  created_at: string;
  establishment_id: string;
}

export interface ProductWithCategory extends BaseProduct {
  category_name?: string;
  categories?: { id: string; name: string };
  rating?: number;
  total_reviews?: number;
}

export interface ProductDetail extends BaseProduct {
  ingredients: string[];
  allergens: string[];
  nutritional_info: NutritionalInfo;
  category?: ProductCategory;
  tags: string[];
  variants: ProductVariant[];
  average_rating: number;
  review_count: number;
  has_promotion: boolean;
}

export interface ProductSearchResult extends ProductDetail {
  establishment: {
    id: string;
    business_name: string;
    phone?: string;
    rating: number;
    address: string;
    logo_url?: string;
    delivery_fee: number;
    minimum_order: number;
    delivery_time_min: number;
    delivery_time_max: number;
    delivery_time: string;
    payment_gateway: string;
    establishment_subscriptions?: {
      status: string;
      current_period_end: string;
    };
  };
  delivery_distance?: number;
}

export interface ProductSearchFilters extends Record<string, unknown> {
  query?: string;
  category_id?: string;
  establishment_id?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  only_available?: boolean;
  sort_by?: 'relevance' | 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'delivery_time' | 'reviews';
  limit?: number;
  city?: string;
  state?: string;
}

export interface ProductVariant {
  id?: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  is_available?: boolean;
  additional_info?: {
    ingredients?: string[];
    allergens?: string[];
    nutritional_info?: NutritionalInfo;
  };
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface ProductReview {
  id: string;
  customer_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  establishment_response?: string;
  establishment_response_at?: string;
}

export interface CreateProductReviewData {
  product_id: string;
  rating: number;
  comment?: string;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchResult {
  establishments: EstablishmentSearchResult[];
  products: ProductSearchResult[];
}

export interface LocationBasedSearchParams {
  city: string;
  state: string;
  type: 'establishments' | 'products';
}

export interface LocationBasedSearchResult {
  success: boolean;
  establishments?: EstablishmentSearchResult[];
  products?: ProductSearchResult[];
  location: {
    city: string;
    state: string;
  };
  count: number;
  error?: string;
}

// ============================================================================
// LOCATION TYPES
// ============================================================================

export interface LocationData {
  city: string;
  state: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  type: 'customer' | 'establishment';
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// ============================================================================
// NUTRITIONAL & CONTENT TYPES
// ============================================================================

export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

// ============================================================================
// ORDER & CART TYPES
// ============================================================================

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    establishment_id: string;
  };
}

export interface Cart {
  id: string;
  user_id: string;
  establishment_id: string;
  items: CartItem[];
  total: number;
  establishment: {
    id: string;
    business_name: string;
    payment_gateway: string;
    phone: string;
    delivery_fee: number;
    minimum_order: number;
  };
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash' | 'mercado_pago_pix' | 'mercado_pago_credit' | 'mercado_pago_debit' | 'mercado_pago_wallet' | 'card_on_delivery';
export type PaymentGateway = 'stripe' | 'whatsapp' | 'mercado_pago' | 'none';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface SearchMetrics {
  queryTime: number;
  cacheHit: boolean;
  resultCount: number;
  filters: Record<string, unknown>;
}

export interface HomePageStats {
  totalEstablishments: number;
  totalProducts: number;
  totalCustomers: number;
}
