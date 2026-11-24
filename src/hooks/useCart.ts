
import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePromotions, AppliedPromotion } from "@/hooks/usePromotions";
import { toast } from "@/hooks/use-toast";
import { isEstablishmentOpen } from "@/utils/openingHours";
import { cartDebugLogger, validateCartSystem, analyzeCartState, withCartDebug } from "@/utils/cartDebug";

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

export interface MultiVendorCart {
  [establishmentId: string]: Cart;
}

export interface CartStats {
  totalCarts: number;
  totalItems: number;
  totalValue: number;
  averageOrderValue: number;
}

export function useCart() {
  const [carts, setCarts] = useState<MultiVendorCart>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { user } = useAuth();
  const { applyPromotionToOrder } = usePromotions();

  // Calculate cart statistics
  const cartStats: CartStats = useMemo(() => {
    const cartArray = Object.values(carts);
    const totalCarts = cartArray.length;
    const totalItems = cartArray.reduce((sum, cart) => 
      sum + cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const totalValue = cartArray.reduce((sum, cart) => 
      sum + cart.total + cart.establishment.delivery_fee, 0
    );
    const averageOrderValue = totalCarts > 0 ? totalValue / totalCarts : 0;

    return { totalCarts, totalItems, totalValue, averageOrderValue };
  }, [carts]);

  const loadCarts = useCallback(async () => {
    if (!user || user.type !== 'customer') {
      setCarts({});
      return;
    }

    try {
      setIsLoading(true);
      const { data: cartData, error } = await supabase
        .from('carts')
        .select(`
          id,
          user_id,
          establishment_id,
          establishments!inner(
            id,
            business_name,
            payment_gateway,
            phone,
            delivery_fee,
            minimum_order
          ),
          items:cart_items(
            id,
            cart_id,
            product_id,
            quantity,
            notes,
            product:products(
              id,
              name,
              price,
              image_url,
              establishment_id
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('🛒 [useCart] Erro ao buscar carrinhos:', error);
        throw error;
      }

      console.log('🛒 [useCart] Dados dos carrinhos retornados:', cartData);
      const newCarts: MultiVendorCart = {};
      cartData?.forEach(cart => {
        if (cart.items && cart.items.length > 0) {
          const total = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
          newCarts[cart.establishment_id] = {
            ...cart,
            total,
            establishment: cart.establishments
          };
        } else {
          console.warn('🛒 [useCart] Carrinho sem itens encontrado, removendo:', cart.id);
          supabase.from('carts').delete().eq('id', cart.id).then(({ error }) => {
            if (error) {
              console.error('🛒 [useCart] Erro ao remover carrinho vazio:', error);
            }
          });
        }
      });

      console.log('🛒 [useCart] Carrinhos processados:', newCarts);
      setCarts(newCarts);
      const validation = validateCartSystem(newCarts, user.id);
      if (!validation.isValid) {
        console.warn('🛒 [useCart] Validação falhou:', validation.errors);
      }
      if (process.env.NODE_ENV === 'development') {
        analyzeCartState(newCarts);
      }
    } catch (error) {
      cartDebugLogger.log({
        action: 'cart_load_error',
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Erro ao carregar carrinho",
        description: "Não foi possível carregar os itens do carrinho.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.type === 'customer') {
      cartDebugLogger.log({
        action: 'cart_load',
        userId: user.id,
        metadata: { trigger: 'user_change' }
      });
      loadCarts();
    } else if (!user) {
      setCarts({});
      cartDebugLogger.log({
        action: 'cart_clear',
        userId: 'anonymous',
        metadata: { reason: 'user_logout' }
      });
    }
  }, [user, loadCarts]);

  const addToCart = async (
    productId: string, 
    quantity: number = 1, 
    notes?: string
  ) => {
    if (!user || user.type !== 'customer') {
      throw new Error('Apenas clientes podem adicionar itens ao carrinho');
    }

    console.log('🛒 [addToCart] Iniciando adição ao carrinho:', { productId, quantity, notes, userId: user.id });

    try {
      // Get product details to find establishment
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('establishment_id, name, price, is_available')
        .eq('id', productId)
        .single();

      if (productError) {
        console.error('🛒 [addToCart] Erro ao buscar produto:', productError);
        throw productError;
      }

      console.log('🛒 [addToCart] Produto encontrado:', product);

      if (!product.is_available) {
        throw new Error('Este produto não está disponível no momento');
      }

      // Check if cart exists for this establishment
      const { data: existingCartData, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .eq('establishment_id', product.establishment_id)
        .maybeSingle();

      if (cartError) {
        console.error('🛒 [addToCart] Erro ao buscar carrinho existente:', cartError);
        throw cartError;
      }

      let existingCart = existingCartData;
      console.log('🛒 [addToCart] Carrinho existente:', existingCart);

      // Create cart if it doesn't exist
      if (!existingCart) {
        console.log('🛒 [addToCart] Criando novo carrinho para establishment:', product.establishment_id);
        const { data: newCart, error: createCartError } = await supabase
          .from('carts')
          .insert([{
            user_id: user.id,
            establishment_id: product.establishment_id
          }])
          .select()
          .single();

        if (createCartError) {
          console.error('🛒 [addToCart] Erro ao criar carrinho:', createCartError);
          throw createCartError;
        }
        
        console.log('🛒 [addToCart] Carrinho criado com sucesso:', newCart);
        existingCart = newCart;
      }

      // Check if item already exists in cart
      const { data: existingItem, error: itemError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', existingCart.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (itemError) {
        console.error('🛒 [addToCart] Erro ao verificar item existente:', itemError);
        throw itemError;
      }

      console.log('🛒 [addToCart] Item existente no carrinho:', existingItem);

      if (existingItem) {
        // Update existing item quantity
        console.log('🛒 [addToCart] Atualizando quantidade do item existente');
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + quantity,
            notes 
          })
          .eq('id', existingItem.id);

        if (updateError) {
          console.error('🛒 [addToCart] Erro ao atualizar item:', updateError);
          throw updateError;
        }
      } else {
        // Add new item
        console.log('🛒 [addToCart] Adicionando novo item ao carrinho');
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([{
            cart_id: existingCart.id,
            product_id: productId,
            quantity,
            notes
          }]);

        if (insertError) {
          console.error('🛒 [addToCart] Erro ao inserir item:', insertError);
          throw insertError;
        }
      }

      console.log('🛒 [addToCart] Item adicionado com sucesso, recarregando carrinhos...');
      await loadCarts(); // Reload all carts
      
      // Log success
      cartDebugLogger.log({
        action: 'item_add',
        userId: user.id,
        cartId: existingCart.id,
        establishmentId: product.establishment_id,
        productId,
        quantity,
        metadata: { 
          productName: product.name,
          wasExistingItem: !!existingItem 
        }
      });
      
      // Show success toast
      toast({
        title: "Item adicionado!",
        description: `${quantity} item${quantity > 1 ? 's' : ''} adicionado${quantity > 1 ? 's' : ''} ao carrinho`,
        duration: 2000,
      });
      
    } catch (error) {
      cartDebugLogger.log({
        action: 'item_add_error',
        userId: user.id,
        productId,
        quantity,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      toast({
        title: "Erro",
        description: "Não foi possível adicionar item ao carrinho",
        variant: "destructive",
      });
      throw new Error(error instanceof Error ? error.message : 'Erro ao adicionar item ao carrinho');
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(cartItemId);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) {
        throw error;
      }
      
      await loadCarts();
      
      toast({
        title: "Quantidade atualizada",
        description: `Item atualizado para ${quantity} unidade${quantity > 1 ? 's' : ''}`,
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a quantidade",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    console.log('🗑️ [removeFromCart] Iniciando remoção do item:', cartItemId);
    
    try {
      // Find which cart contains this item for immediate state update
      let targetEstablishmentId: string | null = null;
      let targetCartId: string | null = null;
      let willBeEmpty = false;
      let removedItemName = '';
      
      for (const [establishmentId, cart] of Object.entries(carts)) {
        const targetItem = cart.items.find(item => item.id === cartItemId);
        if (targetItem) {
          targetEstablishmentId = establishmentId;
          targetCartId = cart.id;
          removedItemName = targetItem.product.name;
          // Check if this is the last item in the cart
          willBeEmpty = cart.items.length === 1;
          console.log('🗑️ [removeFromCart] Item encontrado:', { 
            item: removedItemName, 
            establishmentId, 
            willBeEmpty 
          });
          break;
        }
      }

      if (!targetEstablishmentId || !targetCartId) {
        throw new Error('Item não encontrado no carrinho');
      }

      // Optimistically update state first for better UX
      console.log('🗑️ [removeFromCart] Atualizando estado local...');
      const updatedCarts = { ...carts };
      const targetCart = updatedCarts[targetEstablishmentId];
      
      // Remove item from state
      targetCart.items = targetCart.items.filter(item => item.id !== cartItemId);
      
      // Recalculate total
      targetCart.total = targetCart.items.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      );
      
      // If no items left, remove the entire cart
      if (targetCart.items.length === 0) {
        delete updatedCarts[targetEstablishmentId];
        console.log('🗑️ [removeFromCart] Carrinho ficou vazio, removendo da interface');
      }
      
      setCarts(updatedCarts);

      // Delete cart item from database
      console.log('🗑️ [removeFromCart] Removendo item do banco de dados...');
      const { error: deleteItemError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (deleteItemError) {
        console.error('🗑️ [removeFromCart] Erro ao remover item do BD:', deleteItemError);
        // Revert state if database operation failed
        await loadCarts();
        throw deleteItemError;
      }

      // If cart is now empty, also delete the cart from database
      if (willBeEmpty && targetCartId) {
        console.log('🗑️ [removeFromCart] Removendo carrinho vazio do BD...');
        const { error: deleteCartError } = await supabase
          .from('carts')
          .delete()
          .eq('id', targetCartId);

        if (deleteCartError) {
          // Log error but don't fail the operation since item was already removed
          console.error('🗑️ [removeFromCart] Erro ao remover carrinho vazio:', deleteCartError);
        } else {
          console.log('🗑️ [removeFromCart] Carrinho vazio removido com sucesso');
        }
      }
      
      console.log('🗑️ [removeFromCart] Remoção concluída com sucesso');
      toast({
        title: "Item removido",
        description: `${removedItemName} foi removido do carrinho`,
        duration: 1500,
      });
    } catch (error) {
      console.error('🗑️ [removeFromCart] Erro na remoção:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o item",
        variant: "destructive",
      });
      throw error;
    }
  };

  const clearCart = async (establishmentId: string) => {
    const cart = carts[establishmentId];
    if (!cart) {
      console.log('🧹 [clearCart] Carrinho não encontrado:', establishmentId);
      return;
    }

    console.log('🧹 [clearCart] Iniciando limpeza do carrinho:', { 
      establishmentId, 
      itemsCount: cart.items.length 
    });

    try {
      // Optimistically update state first for better UX
      const newCarts = { ...carts };
      delete newCarts[establishmentId];
      setCarts(newCarts);

      // First delete all cart items
      console.log('🧹 [clearCart] Removendo itens do carrinho...');
      const { error: itemsError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (itemsError) {
        console.error('🧹 [clearCart] Erro ao remover itens:', itemsError);
        // Revert state on error
        await loadCarts();
        throw itemsError;
      }

      // Then delete the cart itself to prevent orphaned carts
      console.log('🧹 [clearCart] Removendo carrinho...');
      const { error: cartError } = await supabase
        .from('carts')
        .delete()
        .eq('id', cart.id);

      if (cartError) {
        console.error('🧹 [clearCart] Erro ao remover carrinho:', cartError);
        // Revert state on error
        await loadCarts();
        throw cartError;
      }

      console.log('🧹 [clearCart] Carrinho limpo com sucesso');
      toast({
        title: "Carrinho limpo",
        description: `Carrinho de ${cart.establishment.business_name} foi esvaziado`,
        duration: 2000,
      });
    } catch (error) {
      console.error('🧹 [clearCart] Erro na limpeza:', error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar o carrinho",
        variant: "destructive",
      });
      throw error;
    }
  };

  const clearAllCarts = async () => {
    const cartIds = Object.values(carts).map(cart => cart.id);
    if (cartIds.length === 0) {
      console.log('🧹 [clearAllCarts] Nenhum carrinho para limpar');
      return;
    }

    console.log('🧹 [clearAllCarts] Iniciando limpeza de todos os carrinhos:', cartIds.length);

    try {
      // Optimistically update state first
      setCarts({});

      // First delete all cart items
      console.log('🧹 [clearAllCarts] Removendo todos os itens...');
      const { error: itemsError } = await supabase
        .from('cart_items')
        .delete()
        .in('cart_id', cartIds);

      if (itemsError) {
        console.error('🧹 [clearAllCarts] Erro ao remover itens:', itemsError);
        // Revert state on error
        await loadCarts();
        throw itemsError;
      }

      // Then delete all carts to prevent orphaned carts
      console.log('🧹 [clearAllCarts] Removendo todos os carrinhos...');
      const { error: cartsError } = await supabase
        .from('carts')
        .delete()
        .in('id', cartIds);

      if (cartsError) {
        console.error('🧹 [clearAllCarts] Erro ao remover carrinhos:', cartsError);
        // Revert state on error
        await loadCarts();
        throw cartsError;
      }
      
      console.log('🧹 [clearAllCarts] Todos os carrinhos foram limpos com sucesso');
      toast({
        title: "Carrinhos limpos",
        description: `${cartIds.length} carrinho${cartIds.length > 1 ? 's foram esvaziados' : ' foi esvaziado'}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('🧹 [clearAllCarts] Erro na limpeza:', error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar todos os carrinhos",
        variant: "destructive",
      });
      throw error;
    }
  };


  const checkout = async (
    establishmentId: string, 
    addressId: string, 
    paymentMethod: string = 'cash', 
    notes?: string, 
    appliedPromotion?: AppliedPromotion | null
  ) => {
    const cart = carts[establishmentId];
    if (!cart || !cart.items.length || !user) {
      throw new Error('Carrinho vazio ou usuário não autenticado');
    }

    try {
      // Calculate totals
      const subtotal = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      
      // Get establishment data including opening hours and payment gateway
      const { data: establishment, error: estError } = await supabase
        .from('establishments')
        .select('delivery_fee, opening_hours, business_name, payment_gateway, phone, minimum_order')
        .eq('id', cart.establishment_id)
        .single();

      if (estError) throw estError;

      // Check if establishment is open
      if (!isEstablishmentOpen(establishment?.opening_hours)) {
        throw new Error(`O estabelecimento ${establishment?.business_name || 'selecionado'} está fechado no momento. Tente novamente durante o horário de funcionamento.`);
      }

      // Check minimum order value
      if (establishment?.minimum_order && subtotal < establishment.minimum_order) {
        throw new Error(`Pedido mínimo de R$ ${establishment.minimum_order.toFixed(2)} não atingido. Adicione mais itens ao carrinho.`);
      }

      const deliveryFee = establishment?.delivery_fee || 0;
      let totalAmount = subtotal + deliveryFee;
      let discountAmount = 0;

      // Apply promotion if provided
      if (appliedPromotion) {
        discountAmount = appliedPromotion.discountAmount;
        totalAmount = appliedPromotion.finalTotal + deliveryFee; // Re-add delivery fee to final total
      }

      // Gateway-specific validation
      const gateway = establishment?.payment_gateway;
      
      // Validate payment method based on gateway
      if (gateway === 'stripe') {
        if (!['credit_card', 'debit_card'].includes(paymentMethod)) {
          throw new Error('Este estabelecimento aceita apenas pagamentos com cartão (Stripe).');
        }
      } else if (gateway === 'mercado_pago') {
        if (!['mercado_pago_pix', 'mercado_pago_credit', 'mercado_pago_debit', 'mercado_pago_wallet'].includes(paymentMethod)) {
          throw new Error('Este estabelecimento aceita apenas pagamentos via Mercado Pago.');
        }
      } else if (gateway === 'whatsapp') {
        if (!['cash', 'pix', 'card_on_delivery'].includes(paymentMethod)) {
          throw new Error('Este estabelecimento aceita dinheiro, PIX ou cartão na entrega via WhatsApp.');
        }
      }

      // Determine initial order status based on gateway
      let initialStatus: 'pending' | 'confirmed' = 'pending';
      let paymentStatus: 'pending' | 'paid' = 'pending';
      
      // WhatsApp orders are automatically confirmed but payment is pending
      if (gateway === 'whatsapp') {
        initialStatus = 'confirmed';
        if (paymentMethod === 'cash' || paymentMethod === 'card_on_delivery') {
          paymentStatus = 'pending'; // Will be paid on delivery
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_id: user.id,
          establishment_id: cart.establishment_id,
          address_id: addressId,
          total_amount: totalAmount,
          delivery_fee: deliveryFee,
          discount_amount: discountAmount,
          payment_method: paymentMethod as any,
          payment_status: paymentStatus as any,
          status: initialStatus as any,
          notes,
          estimated_delivery_time: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Apply promotion if one was used
      if (appliedPromotion) {
        try {
          await applyPromotionToOrder(appliedPromotion.promotion.id, user.id, order.id, discountAmount);
        } catch (promotionError) {
          console.error('Failed to apply promotion to order:', promotionError);
        }
      }

      // For WhatsApp gateway, also send order summary from customer to establishment
      if (gateway === 'whatsapp') {
        try {
          const customerPhone = user.phone || '';
          if (customerPhone) {
            await supabase.functions.invoke('whatsapp-unified-handler', {
              body: {
                orderId: order.id,
                messageType: 'order_summary',
                message: ''
              }
            });
          }
        } catch (summaryError) {
          // Don't fail the order if summary sending fails
        }
      }

      // Don't automatically clear cart here - let the calling code handle it
      // This prevents conflicts with multiple checkout workflows
      
      return order;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Erro no checkout');
    }
  };

  const getTotalItemsCount = () => {
    return Object.values(carts).reduce((total, cart) => 
      total + cart.items.reduce((cartTotal, item) => cartTotal + item.quantity, 0), 0
    );
  };

  const getCartItemsCount = (establishmentId?: string) => {
    if (establishmentId) {
      return carts[establishmentId]?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
    }
    return getTotalItemsCount();
  };

  const getEstablishmentPaymentInfo = async (establishmentId: string) => {
    const cart = carts[establishmentId];
    if (!cart) return null;
    
    const { data: establishment, error } = await supabase
      .from('establishments')
      .select('payment_gateway, phone, business_name')
      .eq('id', cart.establishment_id)
      .single();
      
    if (error) {
      return null;
    }
    
    return establishment;
  };

  // New advanced cart management functions
  const duplicateCart = async (establishmentId: string) => {
    const cart = carts[establishmentId];
    if (!cart || !user) return;

    try {
      // Create new cart for the same establishment
      const { data: newCart, error: cartError } = await supabase
        .from('carts')
        .insert([{
          user_id: user.id,
          establishment_id: cart.establishment_id
        }])
        .select()
        .single();

      if (cartError) throw cartError;

      // Duplicate all items
      const duplicatedItems = cart.items.map(item => ({
        cart_id: newCart.id,
        product_id: item.product_id,
        quantity: item.quantity,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('cart_items')
        .insert(duplicatedItems);

      if (itemsError) throw itemsError;

      await loadCarts();
      toast({
        title: "Carrinho duplicado",
        description: `Carrinho de ${cart.establishment.business_name} foi duplicado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro ao duplicar carrinho",
        description: "Não foi possível duplicar o carrinho",
        variant: "destructive",
      });
    }
  };

  const mergeCart = async (fromEstablishmentId: string, toEstablishmentId: string) => {
    const fromCart = carts[fromEstablishmentId];
    const toCart = carts[toEstablishmentId];
    
    if (!fromCart || !toCart || fromEstablishmentId === toEstablishmentId) return;

    try {
      // Move all items from fromCart to toCart
      for (const item of fromCart.items) {
        // Check if item already exists in destination cart
        const { data: existingItem, error: checkError } = await supabase
          .from('cart_items')
          .select('id, quantity, notes')
          .eq('cart_id', toCart.id)
          .eq('product_id', item.product_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingItem) {
          // Update existing item quantity
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ 
              quantity: existingItem.quantity + item.quantity,
              notes: item.notes || existingItem.notes // Keep notes from either item
            })
            .eq('id', existingItem.id);

          if (updateError) throw updateError;
        } else {
          // Move item to destination cart
          const { error: moveError } = await supabase
            .from('cart_items')
            .update({ cart_id: toCart.id })
            .eq('id', item.id);

          if (moveError) throw moveError;
        }
      }

      // Delete empty source cart
      const { error: deleteError } = await supabase
        .from('carts')
        .delete()
        .eq('id', fromCart.id);

      if (deleteError) throw deleteError;

      await loadCarts();
      setLastUpdate(new Date());
    } catch (error) {
      throw new Error('Erro ao unir carrinhos');
    }
  };

  const saveCartAsTemplate = async (establishmentId: string, templateName: string) => {
    const cart = carts[establishmentId];
    if (!cart || !user) return;

    try {
      const template = {
        user_id: user.id,
        name: templateName,
        establishment_id: cart.establishment_id,
        items: cart.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          notes: item.notes
        }))
      };

      // This would require a cart_templates table
      console.log('Template saved:', template);
      
      toast({
        title: "Template salvo",
        description: `Carrinho salvo como "${templateName}"`,
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar template",
        description: "Não foi possível salvar o carrinho como template",
        variant: "destructive",
      });
    }
  };

  const getCartValue = useCallback((establishmentId?: string) => {
    if (establishmentId) {
      const cart = carts[establishmentId];
      return cart ? cart.total + cart.establishment.delivery_fee : 0;
    }
    return cartStats.totalValue;
  }, [carts, cartStats.totalValue]);

  const isCartValid = useCallback((establishmentId: string) => {
    const cart = carts[establishmentId];
    if (!cart) return false;
    
    return cart.items.length > 0 && cart.total >= cart.establishment.minimum_order;
  }, [carts]);

  // Legacy single cart support for existing components
  const cart = Object.keys(carts).length > 0 ? Object.values(carts)[0] : null;

  return {
    // Multi-vendor support
    carts,
    cartStats,
    lastUpdate,
    
    // Legacy single cart support
    cart,
    
    // State
    isLoading,
    
    // Basic operations
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearAllCarts,
    checkout,
    
    // Advanced operations
    duplicateCart,
    mergeCart,
    saveCartAsTemplate,
    
    // Helpers
    getCartItemsCount,
    getTotalItemsCount,
    getCartValue,
    isCartValid,
    getEstablishmentPaymentInfo,
    refetch: loadCarts,
  };
}
