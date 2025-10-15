const axios = require('axios');

class AsaasService {
  constructor(apiKey) {
    this.baseURL = 'https://api.asaas.com/v3';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'access_token': apiKey
      }
    });
  }

  async generatePixPayment(orderId, value, customer) {
    try {
      // Cria ou atualiza o cliente
      const customerResponse = await this.api.post('/customers', {
        name: customer.name,
        phone: customer.phone
      });

      // Gera o pagamento PIX
      const paymentResponse = await this.api.post('/payments', {
        customer: customerResponse.data.id,
        billingType: 'PIX',
        value: value,
        externalReference: orderId.toString(),
        description: `Pedido #${orderId}`,
      });

      // Retorna os dados do PIX
      return {
        success: true,
        paymentId: paymentResponse.data.id,
        pixQrCode: paymentResponse.data.pixQrCode,
        pixCodeId: paymentResponse.data.pixCodeId,
        status: paymentResponse.data.status
      };
    } catch (error) {
      console.error('Erro ao gerar pagamento PIX:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const response = await this.api.get(`/payments/${paymentId}`);
      return {
        success: true,
        status: response.data.status
      };
    } catch (error) {
      console.error('Erro ao consultar status do pagamento:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }
}

module.exports = AsaasService;
