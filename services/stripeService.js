import { Alert } from 'react-native';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_stripe_publishable_key_here'; // Replace with your actual key
const STRIPE_SECRET_KEY = 'sk_test_your_stripe_secret_key_here'; // Replace with your actual key (server-side only)

class StripeService {
  constructor() {
    this.stripe = null;
    this.initialized = false;
  }

  // Initialize Stripe (call this in your app startup)
  async initialize() {
    try {
      // Note: You'll need to install @stripe/stripe-react-native
      // npm install @stripe/stripe-react-native
      const { initStripe } = require('@stripe/stripe-react-native');
      
      await initStripe({
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        merchantIdentifier: 'merchant.com.teddysclean', // Replace with your merchant ID
      });
      
      this.initialized = true;
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Stripe initialization error:', error);
      throw error;
    }
  }

  // Create payment intent on your backend
  async createPaymentIntent(amount, currency = 'aud', metadata = {}) {
    try {
      // This should call your backend API endpoint
      const response = await fetch('https://your-backend-url.com/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          metadata,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      return data;
    } catch (error) {
      console.error('Create payment intent error:', error);
      throw error;
    }
  }

  // Process payment with Stripe
  async processPayment(paymentIntentClientSecret, paymentMethodData) {
    try {
      if (!this.initialized) {
        throw new Error('Stripe not initialized');
      }

      const { confirmPayment } = require('@stripe/stripe-react-native');

      const { error, paymentIntent } = await confirmPayment(paymentIntentClientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData,
      });

      if (error) {
        throw new Error(error.message);
      }

      return paymentIntent;
    } catch (error) {
      console.error('Process payment error:', error);
      throw error;
    }
  }

  // Create setup intent for saving payment methods
  async createSetupIntent(customerId) {
    try {
      const response = await fetch('https://your-backend-url.com/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create setup intent');
      }

      return data;
    } catch (error) {
      console.error('Create setup intent error:', error);
      throw error;
    }
  }

  // Get saved payment methods for a customer
  async getPaymentMethods(customerId) {
    try {
      const response = await fetch(`https://your-backend-url.com/payment-methods/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get payment methods');
      }

      return data.payment_methods || [];
    } catch (error) {
      console.error('Get payment methods error:', error);
      throw error;
    }
  }

  // Calculate processing fee (2.9% + 30¢ for Australian cards)
  calculateProcessingFee(amount) {
    return Math.round((amount * 0.029 + 0.30) * 100) / 100;
  }

  // Format amount for display
  formatAmount(amount, currency = 'AUD') {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

export default new StripeService();