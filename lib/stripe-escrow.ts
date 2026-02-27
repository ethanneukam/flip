import Stripe from 'stripe';
import { supabase } from './supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-06' as any,
});

export const StripeEscrow = {
  /**
   * STEP 1: The Handshake & DB Initialization
   * This creates the record the Ops Center needs to see.
   */
  async initializeEscrow(orderId: string, buyerId: string) {
    // 1. Fetch order details
    const { data: order, error: fetchError } = await supabase
      .from('market_orders')
      .select('*, items(title, image_url)')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error("ORDER_NOT_FOUND");

    // 2. Create the record in escrow_transactions (The one Ops Center reads)
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        item_id: order.item_id,
        buyer_id: buyerId,
        seller_id: order.user_id,
        amount: order.price,
        status: 'pending_payment', // Initial state
        metadata: { ticker: order.ticker }
      })
      .select()
      .single();

    if (escrowError) throw escrowError;

    // 3. Ping the Pulse Feed
    await supabase.from('feed_events').insert({
      event_type: 'ESCROW_CREATED',
      user_id: buyerId,
      message: `Locking Trade: ${order.items?.title || order.ticker}`,
      metadata: { ticker: order.ticker, amount: order.price }
    });

    return escrow;
  },

  /**
   * STEP 2: Start the Stripe Payment
   */
  async createEscrowPayment(orderId: string, buyerId: string) {
    const { data: order } = await supabase
      .from('market_orders')
      .select('*, items(title)')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error("Order not found");

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.price * 100),
      currency: 'usd',
      metadata: { orderId, buyerId, sellerId: order.user_id },
      capture_method: 'automatic', 
    });

    // Update the existing escrow record with the Stripe ID
    await supabase.from('escrow_transactions')
      .update({ 
        stripe_payment_intent_id: paymentIntent.id,
        status: 'awaiting_shipment' // Move status forward
      })
      .eq('item_id', order.item_id)
      .eq('buyer_id', buyerId);

    return paymentIntent.client_secret;
  },

  /**
   * STEP 3: Release Funds (Seller Gets Paid)
   */
  async releaseFundsToSeller(transactionId: string) {
    const { data: tx } = await supabase
      .from('escrow_transactions')
      .select('*, profiles!seller_id(stripe_connect_id)')
      .eq('id', transactionId)
      .single();

    if (tx.status !== 'completed') throw new Error("Item must be verified first");

    const transfer = await stripe.transfers.create({
      amount: Math.round(tx.amount * 100),
      currency: 'usd',
      destination: tx.profiles.stripe_connect_id,
      source_transaction: tx.stripe_payment_intent_id,
    });

    await supabase.from('escrow_transactions').update({
      status: 'completed',
      metadata: { ...tx.metadata, stripe_transfer_id: transfer.id },
      // escrow_released_at: new Date() // Add this column to SQL if needed
    }).eq('id', transactionId);

    return transfer;
  }
};