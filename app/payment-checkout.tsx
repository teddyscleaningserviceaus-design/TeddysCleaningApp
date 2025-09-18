import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import stripeService from '../services/stripeService';

export default function PaymentCheckout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  
  // Booking details from params
  const bookingDetails = {
    serviceType: params.serviceType,
    propertyType: params.propertyType,
    address: params.address,
    scheduledDate: params.scheduledDate,
    startTime: params.startTime,
    estimatedPrice: parseFloat(params.estimatedPrice || 0),
    contactName: params.contactName,
    contactNumber: params.contactNumber,
  };

  const processingFee = stripeService.calculateProcessingFee(bookingDetails.estimatedPrice);
  const totalAmount = bookingDetails.estimatedPrice + processingFee;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const methods = await stripeService.getPaymentMethods(auth.currentUser?.uid);
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0]);
      }
    } catch (error) {
      console.error('Load payment methods error:', error);
    }
  };

  const handleAddNewCard = () => {
    router.push({
      pathname: '/add-payment-method',
      params: {
        returnTo: '/payment-checkout',
        ...params
      }
    });
  };

  const handlePayNow = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method or add a new card.');
      return;
    }

    setLoading(true);
    try {
      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent(
        totalAmount,
        'aud',
        {
          booking_id: params.bookingId || 'pending',
          customer_id: auth.currentUser?.uid,
          service_type: bookingDetails.serviceType,
        }
      );

      // Process payment
      const result = await stripeService.processPayment(
        paymentIntent.client_secret,
        {
          paymentMethodId: selectedPaymentMethod.id,
        }
      );

      if (result.status === 'succeeded') {
        // Payment successful - update booking status and navigate
        Alert.alert(
          'Payment Successful! 🎉',
          `Your payment of ${stripeService.formatAmount(totalAmount)} has been processed. Your booking is confirmed!`,
          [
            {
              text: 'View Booking',
              onPress: () => router.push('/(client-tabs)/bookings')
            }
          ]
        );
      } else {
        throw new Error('Payment not completed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Failed',
        error.message || 'There was an issue processing your payment. Please try again.',
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        selectedPaymentMethod?.id === method.id && styles.paymentMethodSelected
      ]}
      onPress={() => setSelectedPaymentMethod(method)}
    >
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Ionicons 
            name="card" 
            size={24} 
            color={selectedPaymentMethod?.id === method.id ? '#4facfe' : '#6b7280'} 
          />
          <Text style={styles.cardBrand}>{method.card.brand.toUpperCase()}</Text>
        </View>
        <Text style={styles.cardNumber}>•••• •••• •••• {method.card.last4}</Text>
        <Text style={styles.cardExpiry}>Expires {method.card.exp_month}/{method.card.exp_year}</Text>
      </View>
      <View style={[
        styles.radioButton,
        selectedPaymentMethod?.id === method.id && styles.radioButtonSelected
      ]}>
        {selectedPaymentMethod?.id === method.id && (
          <AntDesign name="check" size={12} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <Text style={styles.headerSubtitle}>Complete your booking</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service:</Text>
            <Text style={styles.summaryValue}>{bookingDetails.serviceType}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Property:</Text>
            <Text style={styles.summaryValue}>{bookingDetails.propertyType}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date & Time:</Text>
            <Text style={styles.summaryValue}>
              {bookingDetails.scheduledDate} at {bookingDetails.startTime}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Address:</Text>
            <Text style={styles.summaryValue}>{bookingDetails.address}</Text>
          </View>
        </View>

        {/* Payment Breakdown */}
        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment Breakdown</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Service Cost:</Text>
            <Text style={styles.paymentValue}>
              {stripeService.formatAmount(bookingDetails.estimatedPrice)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Processing Fee:</Text>
            <Text style={styles.paymentValue}>
              {stripeService.formatAmount(processingFee)}
            </Text>
          </View>
          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>
              {stripeService.formatAmount(totalAmount)}
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsCard}>
          <View style={styles.paymentMethodsHeader}>
            <Text style={styles.paymentMethodsTitle}>Payment Method</Text>
            <TouchableOpacity style={styles.addCardButton} onPress={handleAddNewCard}>
              <AntDesign name="plus" size={16} color="#4facfe" />
              <Text style={styles.addCardText}>Add Card</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length > 0 ? (
            <View style={styles.paymentMethodsList}>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          ) : (
            <View style={styles.noPaymentMethods}>
              <Ionicons name="card-outline" size={48} color="#9ca3af" />
              <Text style={styles.noPaymentMethodsTitle}>No Payment Methods</Text>
              <Text style={styles.noPaymentMethodsDesc}>
                Add a credit or debit card to complete your booking
              </Text>
              <TouchableOpacity style={styles.addFirstCardButton} onPress={handleAddNewCard}>
                <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.addFirstCardGradient}>
                  <AntDesign name="plus" size={20} color="#fff" />
                  <Text style={styles.addFirstCardText}>Add Your First Card</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            <Text style={styles.securityTitle}>Secure Payment</Text>
          </View>
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure. We use Stripe for payment processing and never store your card details.
          </Text>
        </View>
      </ScrollView>

      {/* Pay Now Button */}
      {paymentMethods.length > 0 && (
        <View style={styles.payButtonContainer}>
          <TouchableOpacity
            style={styles.payButton}
            onPress={handlePayNow}
            disabled={loading || !selectedPaymentMethod}
          >
            <LinearGradient colors={['#10b981', '#059669']} style={styles.payButtonGradient}>
              <Ionicons name="lock-closed" size={20} color="#fff" />
              <Text style={styles.payButtonText}>
                {loading ? 'Processing...' : `Pay ${stripeService.formatAmount(totalAmount)}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerRight: { width: 40 },
  
  content: { flex: 1, padding: 16 },
  
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryLabel: { fontSize: 14, color: '#64748b', flex: 1 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 2, textAlign: 'right' },
  
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  paymentTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  paymentLabel: { fontSize: 14, color: '#64748b' },
  paymentValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#10b981' },
  
  paymentMethodsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  paymentMethodsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentMethodsTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4facfe',
  },
  addCardText: { fontSize: 12, color: '#4facfe', fontWeight: '600', marginLeft: 4 },
  
  paymentMethodsList: { gap: 12 },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  paymentMethodSelected: {
    borderColor: '#4facfe',
    backgroundColor: '#f0f8ff',
  },
  cardInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardBrand: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginLeft: 8 },
  cardNumber: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  cardExpiry: { fontSize: 12, color: '#9ca3af' },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  
  noPaymentMethods: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPaymentMethodsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noPaymentMethodsDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  addFirstCardButton: { borderRadius: 12, overflow: 'hidden' },
  addFirstCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  addFirstCardText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  
  securityCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    marginLeft: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  
  payButtonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  payButton: { borderRadius: 16, overflow: 'hidden' },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});