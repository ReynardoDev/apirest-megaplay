import axios from 'axios';
import crypto from 'crypto';

/**
 * Servicio para interactuar con NOWPayments API
 * Documentación: https://documenter.getpostman.com/view/7907941/S1a32n38
 */

const API_URL = process.env.NOWPAYMENTS_API_URL || 'https://api.nowpayments.io/v1';
const API_KEY = process.env.NOWPAYMENTS_API_KEY;
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';

// Configurar axios con headers por defecto
const nowpaymentsClient = axios.create({
  baseURL: API_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Obtener estado de la API y monedas disponibles
 */
export const getApiStatus = async () => {
  try {
    const response = await nowpaymentsClient.get('/status');
    return response.data;
  } catch (error) {
    console.error('Error al obtener estado de NOWPayments:', error.response?.data || error.message);
    throw new Error('Error al conectar con NOWPayments');
  }
};

/**
 * Obtener monto mínimo de pago para USDT TRC20
 */
export const getMinimumAmount = async () => {
  try {
    const currency = process.env.PAYMENT_CURRENCY || 'usdttrc20';
    const response = await nowpaymentsClient.get(`/min-amount?currency_from=${currency}&currency_to=${currency}`);
    return parseFloat(response.data.min_amount);
  } catch (error) {
    console.error('Error al obtener monto mínimo:', error.response?.data || error.message);
    return parseFloat(process.env.MIN_DEPOSIT_USDT) || 5;
  }
};

/**
 * Crear un pago/invoice
 * @param {number} amount - Monto en USDT
 * @param {string} orderId - ID único de la orden
 * @param {number} playerId - ID del jugador
 * @returns {Object} Datos del pago creado
 */
export const createPayment = async (amount, orderId, playerId) => {
  try {
    const currency = process.env.PAYMENT_CURRENCY || 'usdttrc20';
    const callbackUrl = process.env.IPN_CALLBACK_URL;

    const paymentData = {
      price_amount: parseFloat(amount),
      price_currency: 'usd',
      pay_currency: currency,
      ipn_callback_url: callbackUrl,
      order_id: orderId,
      order_description: `Depósito de chips - Jugador ${playerId}`,
      is_fixed_rate: true,
      is_fee_paid_by_user: false
    };

    console.log('📤 Creando pago en NOWPayments:', paymentData);

    const response = await nowpaymentsClient.post('/payment', paymentData);
    
    console.log('✅ Pago creado:', response.data);

    return {
      payment_id: response.data.payment_id,
      payment_status: response.data.payment_status,
      pay_address: response.data.pay_address,
      pay_amount: response.data.pay_amount,
      pay_currency: response.data.pay_currency,
      order_id: response.data.order_id,
      invoice_url: response.data.invoice_url || null,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
      expiration_estimate_date: response.data.expiration_estimate_date
    };
  } catch (error) {
    console.error('❌ Error al crear pago:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Error al crear pago en NOWPayments');
  }
};

/**
 * Obtener estado de un pago
 * @param {string} paymentId - ID del pago
 * @returns {Object} Estado del pago
 */
export const getPaymentStatus = async (paymentId) => {
  try {
    const response = await nowpaymentsClient.get(`/payment/${paymentId}`);
    
    return {
      payment_id: response.data.payment_id,
      payment_status: response.data.payment_status,
      pay_address: response.data.pay_address,
      pay_amount: response.data.pay_amount,
      actually_paid: response.data.actually_paid,
      pay_currency: response.data.pay_currency,
      order_id: response.data.order_id,
      outcome_amount: response.data.outcome_amount,
      outcome_currency: response.data.outcome_currency,
      created_at: response.data.created_at,
      updated_at: response.data.updated_at
    };
  } catch (error) {
    console.error('❌ Error al obtener estado del pago:', error.response?.data || error.message);
    throw new Error('Error al consultar estado del pago');
  }
};

/**
 * Verificar firma HMAC del webhook IPN
 * @param {Object} body - Cuerpo del webhook
 * @param {string} signature - Firma recibida en header x-nowpayments-sig
 * @returns {boolean} True si la firma es válida
 */
export const verifyIPNSignature = (body, signature) => {
  try {
    if (!IPN_SECRET) {
      console.error('⚠️ IPN_SECRET no configurado');
      return false;
    }

    // Ordenar las claves del objeto alfabéticamente
    const sortedBody = Object.keys(body)
      .sort()
      .reduce((acc, key) => {
        acc[key] = body[key];
        return acc;
      }, {});

    // Convertir a JSON string
    const jsonString = JSON.stringify(sortedBody);

    // Generar HMAC SHA-512
    const hmac = crypto
      .createHmac('sha512', IPN_SECRET)
      .update(jsonString)
      .digest('hex');

    const isValid = hmac === signature;
    
    if (!isValid) {
      console.error('❌ Firma IPN inválida');
      console.error('Esperada:', hmac);
      console.error('Recibida:', signature);
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error al verificar firma IPN:', error.message);
    return false;
  }
};

/**
 * Crear un payout (retiro)
 * @param {string} address - Dirección TRON destino
 * @param {number} amount - Monto en USDT
 * @param {string} withdrawalId - ID del retiro en nuestra DB
 * @returns {Object} Datos del payout
 */
export const createPayout = async (address, amount, withdrawalId) => {
  try {
    const currency = process.env.PAYMENT_CURRENCY || 'usdttrc20';

    const payoutData = {
      withdrawals: [
        {
          address: address,
          currency: currency,
          amount: parseFloat(amount),
          ipn_callback_url: process.env.IPN_CALLBACK_URL,
          extra_id: withdrawalId.toString()
        }
      ]
    };

    console.log('📤 Creando payout en NOWPayments:', payoutData);

    const response = await nowpaymentsClient.post('/payout', payoutData);
    
    console.log('✅ Payout creado:', response.data);

    return {
      id: response.data.id,
      withdrawals: response.data.withdrawals
    };
  } catch (error) {
    console.error('❌ Error al crear payout:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Error al crear payout en NOWPayments');
  }
};

/**
 * Validar dirección TRON
 * @param {string} address - Dirección a validar
 * @returns {boolean} True si es válida
 */
export const isValidTronAddress = (address) => {
  // Direcciones TRON empiezan con 'T' y tienen 34 caracteres
  return /^T[A-Za-z1-9]{33}$/.test(address);
};

/**
 * Convertir USDT a chips
 * @param {number} usdt - Monto en USDT
 * @returns {number} Cantidad de chips
 */
export const usdtToChips = (usdt) => {
  const rate = parseFloat(process.env.USDT_TO_CHIPS_RATE) || 10;
  return Math.floor(parseFloat(usdt) * rate);
};

/**
 * Convertir chips a USDT
 * @param {number} chips - Cantidad de chips
 * @returns {number} Monto en USDT
 */
export const chipsToUsdt = (chips) => {
  const rate = parseFloat(process.env.CHIPS_TO_USDT_RATE) || 0.1;
  return parseFloat((parseInt(chips) * rate).toFixed(2));
};

export default {
  getApiStatus,
  getMinimumAmount,
  createPayment,
  getPaymentStatus,
  verifyIPNSignature,
  createPayout,
  isValidTronAddress,
  usdtToChips,
  chipsToUsdt
};
