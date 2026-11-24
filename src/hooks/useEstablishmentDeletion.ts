import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useEstablishmentDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const deleteEstablishment = async () => {
    if (!user || user.type !== 'establishment') {
      throw new Error('Usuário não é um estabelecimento');
    }

    setIsDeleting(true);
    
    try {
      // Primeiro, obtemos o ID do estabelecimento
      const { data: establishments, error: establishmentError } = await supabase
        .from('establishments')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (establishmentError || !establishments) {
        throw new Error('Estabelecimento não encontrado');
      }

      const establishmentId = establishments.id;

      // Primeiro, obter os IDs dos produtos para usar nas operações de exclusão
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('establishment_id', establishmentId);

      const productIds = products?.map(p => p.id) || [];

      // Obter os IDs dos pedidos para usar nas operações de exclusão
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('establishment_id', establishmentId);

      const orderIds = orders?.map(o => o.id) || [];

      // Obter os IDs das promoções para usar nas operações de exclusão
      const { data: promotions } = await supabase
        .from('promotions')
        .select('id')
        .eq('establishment_id', establishmentId);

      const promotionIds = promotions?.map(p => p.id) || [];

      // Deletar dados relacionados em ordem (respeitando foreign keys)
      // 1. Excluir itens de pedidos (se houver pedidos)
      if (orderIds.length > 0) {
        const { error: orderItemsError } = await supabase
          .from('order_items')
          .delete()
          .in('order_id', orderIds);

        if (orderItemsError) {
          console.error('Erro ao excluir itens de pedidos:', orderItemsError);
        }
      }

      // 2. Excluir pedidos
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('establishment_id', establishmentId);

      if (ordersError) {
        console.error('Erro ao excluir pedidos:', ordersError);
      }

      // 3. Excluir transações de pagamento relacionadas ao estabelecimento
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('connected_account_id', establishmentId);

      if (paymentsError) {
        console.error('Erro ao excluir pagamentos:', paymentsError);
      }

      // 4. Excluir avaliações de produtos (se houver produtos)
      if (productIds.length > 0) {
        const { error: productReviewsError } = await supabase
          .from('product_reviews')
          .delete()
          .in('product_id', productIds);

        if (productReviewsError) {
          console.error('Erro ao excluir avaliações de produtos:', productReviewsError);
        }
      }

      // 5. Excluir respostas a avaliações
      const { error: reviewResponsesError } = await supabase
        .from('review_responses')
        .delete()
        .eq('establishment_id', establishmentId);

      if (reviewResponsesError) {
        console.error('Erro ao excluir respostas de avaliações:', reviewResponsesError);
      }

      // 6. Excluir avaliações do estabelecimento
      const { error: reviewsError } = await supabase
        .from('reviews')
        .delete()
        .eq('establishment_id', establishmentId);

      if (reviewsError) {
        console.error('Erro ao excluir avaliações:', reviewsError);
      }

      // 7. Excluir uso de promoções (se houver promoções)
      if (promotionIds.length > 0) {
        const { error: promotionUsageError } = await supabase
          .from('promotion_usage')
          .delete()
          .in('promotion_id', promotionIds);

        if (promotionUsageError) {
          console.error('Erro ao excluir uso de promoções:', promotionUsageError);
        }
      }

      // 8. Excluir promoções
      const { error: promotionsError } = await supabase
        .from('promotions')
        .delete()
        .eq('establishment_id', establishmentId);

      if (promotionsError) {
        console.error('Erro ao excluir promoções:', promotionsError);
      }

      // 9. Excluir campanhas de marketing
      const { error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('establishment_id', establishmentId);

      if (campaignsError) {
        console.error('Erro ao excluir campanhas:', campaignsError);
      }

      // 10. Excluir tags de produtos (se houver produtos)
      if (productIds.length > 0) {
        const { error: productTagsError } = await supabase
          .from('product_tags')
          .delete()
          .in('product_id', productIds);

        if (productTagsError) {
          console.error('Erro ao excluir tags de produtos:', productTagsError);
        }
      }

      // 11. Excluir variantes de produtos (se houver produtos)
      if (productIds.length > 0) {
        const { error: productVariantsError } = await supabase
          .from('product_variants')
          .delete()
          .in('product_id', productIds);

        if (productVariantsError) {
          console.error('Erro ao excluir variantes de produtos:', productVariantsError);
        }
      }

      // 12. Excluir favoritos de produtos (se houver produtos)
      if (productIds.length > 0) {
        const { error: favoritesError } = await supabase
          .from('favorites')
          .delete()
          .in('product_id', productIds);

        if (favoritesError) {
          console.error('Erro ao excluir favoritos:', favoritesError);
        }
      }

      // 13. Excluir produtos
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .eq('establishment_id', establishmentId);

      if (productsError) {
        console.error('Erro ao excluir produtos:', productsError);
      }

      // 14. Excluir categorias
      const { error: categoriesError } = await supabase
        .from('categories')
        .delete()
        .eq('establishment_id', establishmentId);

      if (categoriesError) {
        console.error('Erro ao excluir categorias:', categoriesError);
      }

      // 15. Excluir configurações de pagamento
      const { error: paymentConfigsError } = await supabase
        .from('establishment_payment_configs')
        .delete()
        .eq('establishment_id', establishmentId);

      if (paymentConfigsError) {
        console.error('Erro ao excluir configurações de pagamento:', paymentConfigsError);
      }

      // 16. Excluir contas conectadas do Stripe
      const { error: stripeAccountsError } = await supabase
        .from('stripe_connected_accounts')
        .delete()
        .eq('establishment_id', establishmentId);

      if (stripeAccountsError) {
        console.error('Erro ao excluir contas do Stripe:', stripeAccountsError);
      }

      // 17. Excluir assinaturas
      const { error: subscriptionsError } = await supabase
        .from('establishment_subscriptions')
        .delete()
        .eq('establishment_id', establishmentId);

      if (subscriptionsError) {
        console.error('Erro ao excluir assinaturas:', subscriptionsError);
      }

      // 18. Excluir carrinho e itens de carrinho do usuário
      // Primeiro obter os IDs dos carrinhos do usuário
      const { data: userCarts } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id);

      const cartIds = userCarts?.map(c => c.id) || [];

      // Excluir itens dos carrinhos (se houver carrinhos)
      if (cartIds.length > 0) {
        const { error: cartItemsError } = await supabase
          .from('cart_items')
          .delete()
          .in('cart_id', cartIds);

        if (cartItemsError) {
          console.error('Erro ao excluir itens do carrinho:', cartItemsError);
        }
      }

      // Excluir carrinhos
      const { error: cartsError } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', user.id);

      if (cartsError) {
        console.error('Erro ao excluir carrinho:', cartsError);
      }

      // 19. Excluir estabelecimento
      const { error: establishmentDeleteError } = await supabase
        .from('establishments')
        .delete()
        .eq('id', establishmentId);

      if (establishmentDeleteError) {
        throw establishmentDeleteError;
      }

      // 20. Excluir notificações do usuário
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (notificationsError) {
        console.error('Erro ao excluir notificações:', notificationsError);
      }

      // 21. Excluir preferências de notificação
      const { error: notificationPrefsError } = await supabase
        .from('user_notification_preferences')
        .delete()
        .eq('user_id', user.id);

      if (notificationPrefsError) {
        console.error('Erro ao excluir preferências:', notificationPrefsError);
      }

      // 22. Excluir perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Fazer logout e redirecionar
      await logout();
      
      toast({
        title: "Conta excluída com sucesso",
        description: "Sua conta do estabelecimento foi permanentemente excluída.",
        variant: "default",
      });

      navigate('/');

    } catch (error: any) {
      console.error('Erro ao excluir estabelecimento:', error);
      toast({
        title: "Erro ao excluir conta",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteEstablishment,
    isDeleting
  };
}