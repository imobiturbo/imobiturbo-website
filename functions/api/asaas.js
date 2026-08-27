/**
 * Cloudflare Pages Function: POST /api/asaas
 * Endpoint dedicado para Webhooks do Asaas.
 * Exporta o mesmo handler de /api/contact para receber eventos de cobrança/checkout,
 * normalizar e encaminhar assinado para o Imobiturbo OS.
 */
export { onRequest } from './contact.js';
