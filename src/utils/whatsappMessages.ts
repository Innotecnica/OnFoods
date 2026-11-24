import i18n from '@/i18n'

export function buildOrderSummaryMessage(orderNumber: string, total: number, establishmentName: string) {
  return [
    i18n.t('common:order_summary_title', { orderNumber }),
    i18n.t('common:amount_label', { value: total.toFixed(2) }),
    i18n.t('common:establishment_notified', { name: establishmentName })
  ].join('\n')
}

export function buildStatusUpdateMessage(orderNumber: string, status: string) {
  return [
    i18n.t('common:status_update_title', { orderNumber }),
    i18n.t('common:status_update_desc', { status })
  ].join('\n')
}

export function buildWhatsAppTestMessage() {
  return [
    i18n.t('common:whatsapp_test_header'),
    '',
    i18n.t('common:whatsapp_test_config_ok'),
    i18n.t('common:whatsapp_test_date', { date: new Date().toLocaleString() }),
    i18n.t('common:whatsapp_test_footer')
  ].join('\n')
}

export function buildCustomerContactMessage(orderId: string) {
  const shortId = orderId.substring(0, 8).toUpperCase()
  return i18n.t('common:customer_contact_message', { orderId: shortId })
}

export function buildEstablishmentShareText(establishmentName: string) {
  return i18n.t('common:share_establishment_text', { name: establishmentName })
}
