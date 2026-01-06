import Stripe from 'stripe';
import { supabase } from './supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-06' as any, // Current stable version
});

export const StripeEscrow = {
  /**
   * STEP 1: Start the Escrow (Buyer Pays)
   * This creates a 'PaymentIntent' that locks the funds.
   */
  async createEscrowPayment(orderId: string, buyerId: string) {
    const { data: order } = await supabase
      .from('market_orders')
      .select('*, items(title)')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error("Order not found");

    // Create a PaymentIntent on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.price * 100), // Stripe uses cents
      currency: 'usd',
      metadata: { orderId, buyerId, sellerId: order.user_id },
      // We don't transfer yet; money stays in platform balance
      capture_method: 'automatic', 
    });

    // Create the transaction record in our DB
    await supabase.from('transactions').insert({
      order_id: orderId,
      buyer_id: buyerId,
      seller_id: order.user_id,
      amount: order.price,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'requires_payment'
    });

    return paymentIntent.client_secret;
  },

  /**
   * STEP 2: Release Funds (Seller Gets Paid)
   * Called only after verification/delivery.
   */
  async releaseFundsToSeller(transactionId: string) {
    const { data: tx } = await supabase
      .from('transactions')
      .select('*, profiles!seller_id(stripe_connect_id)')
      .eq('id', transactionId)
      .single();

    if (tx.status !== 'delivered') throw new Error("Item must be delivered first");

    // Transfer money from Platform to Seller's Connected Account
    const transfer = await stripe.transfers.create({
      amount: Math.round(tx.amount * 100),
      currency: 'usd',
      destination: tx.profiles.stripe_connect_id, // The Seller's Stripe ID
      source_transaction: tx.stripe_payment_intent_id, // Link to the original payment
    });

    // Mark as complete in our DB
    await supabase.from('transactions').update({
      status: 'completed',
      stripe_transfer_id: transfer.id,
      escrow_released_at: new Date()
    }).eq('id', transactionId);

    return transfer;
  }
};
