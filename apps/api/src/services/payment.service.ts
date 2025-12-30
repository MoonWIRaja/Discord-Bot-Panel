import { db } from '../db/index.js';
import { user, plans, subscriptions, transactions, systemSettings } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Payment Service - Handles payment gateway integration
 * Supports: HitPay, Stripe, Alipay+
 */
class PaymentService {
    private gateway: string = 'none';
    private settings: Record<string, any> = {};
    
    /**
     * Initialize payment service with settings from database
     */
    async initialize(): Promise<void> {
        try {
            const allSettings = await db.select().from(systemSettings).where(eq(systemSettings.category, 'payment'));
            for (const s of allSettings) {
                this.settings[s.key] = s.value;
            }
            this.gateway = this.settings.payment_gateway || 'none';
            console.log(`[Payment] Initialized with gateway: ${this.gateway}`);
        } catch (error) {
            console.error('[Payment] Failed to initialize:', error);
        }
    }
    
    /**
     * Get current gateway
     */
    getGateway(): string {
        return this.gateway;
    }
    
    /**
     * Create a payment checkout session
     */
    async createCheckout(userId: string, planId: string): Promise<{ url?: string; error?: string }> {
        await this.initialize();
        
        if (this.gateway === 'none') {
            return { error: 'Payment gateway not configured' };
        }
        
        // Get plan details
        const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
        if (!plan) {
            return { error: 'Plan not found' };
        }
        
        // Get user details
        const [userData] = await db.select().from(user).where(eq(user.id, userId));
        if (!userData) {
            return { error: 'User not found' };
        }
        
        // Create pending transaction
        const transactionId = randomUUID();
        await db.insert(transactions).values({
            id: transactionId,
            userId,
            planId,
            amount: plan.price,
            currency: plan.currency || 'MYR',
            paymentGateway: this.gateway,
            status: 'pending',
            metadata: { planName: plan.name }
        });
        
        // Create checkout based on gateway
        switch (this.gateway) {
            case 'hitpay':
                return await this.createHitPayCheckout(transactionId, plan, userData);
            case 'stripe':
                return await this.createStripeCheckout(transactionId, plan, userData);
            case 'alipayplus':
                return await this.createAlipayPlusCheckout(transactionId, plan, userData);
            default:
                return { error: 'Unknown payment gateway' };
        }
    }
    
    /**
     * HitPay Checkout
     */
    private async createHitPayCheckout(transactionId: string, plan: any, userData: any): Promise<{ url?: string; error?: string }> {
        const apiKey = this.settings.hitpay_api_key;
        if (!apiKey) {
            return { error: 'HitPay API key not configured' };
        }
        
        try {
            const response = await fetch('https://api.hit-pay.com/v1/payment-requests', {
                method: 'POST',
                headers: {
                    'X-BUSINESS-API-KEY': apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    amount: (plan.price / 100).toFixed(2),
                    currency: plan.currency || 'MYR',
                    email: userData.email,
                    name: userData.name,
                    purpose: `${plan.name} Subscription`,
                    reference_number: transactionId,
                    redirect_url: `${this.settings.site_url || ''}/payment/success?tx=${transactionId}`,
                    cancel_url: `${this.settings.site_url || ''}/payment/cancelled`,
                    webhook: `${this.settings.site_url || ''}/api/payments/webhook/hitpay`
                }).toString()
            });
            
            const data = await response.json();
            if (data.url) {
                await db.update(transactions)
                    .set({ gatewayTransactionId: data.id })
                    .where(eq(transactions.id, transactionId));
                return { url: data.url };
            }
            return { error: data.message || 'Failed to create checkout' };
        } catch (error) {
            console.error('[HitPay] Error:', error);
            return { error: 'Failed to connect to HitPay' };
        }
    }
    
    /**
     * Stripe Checkout
     */
    private async createStripeCheckout(transactionId: string, plan: any, userData: any): Promise<{ url?: string; error?: string }> {
        const secretKey = this.settings.stripe_secret_key;
        if (!secretKey) {
            return { error: 'Stripe secret key not configured' };
        }
        
        try {
            const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'mode': 'payment',
                    'customer_email': userData.email,
                    'line_items[0][price_data][currency]': (plan.currency || 'myr').toLowerCase(),
                    'line_items[0][price_data][product_data][name]': plan.name,
                    'line_items[0][price_data][unit_amount]': plan.price.toString(),
                    'line_items[0][quantity]': '1',
                    'metadata[transaction_id]': transactionId,
                    'success_url': `${this.settings.site_url || ''}/payment/success?tx=${transactionId}`,
                    'cancel_url': `${this.settings.site_url || ''}/payment/cancelled`
                }).toString()
            });
            
            const data = await response.json();
            if (data.url) {
                await db.update(transactions)
                    .set({ gatewayTransactionId: data.id })
                    .where(eq(transactions.id, transactionId));
                return { url: data.url };
            }
            return { error: data.error?.message || 'Failed to create checkout' };
        } catch (error) {
            console.error('[Stripe] Error:', error);
            return { error: 'Failed to connect to Stripe' };
        }
    }
    
    /**
     * Alipay+ Checkout (via Cashier Payment API)
     */
    private async createAlipayPlusCheckout(transactionId: string, plan: any, userData: any): Promise<{ url?: string; error?: string }> {
        const clientId = this.settings.alipay_client_id;
        if (!clientId) {
            return { error: 'Alipay+ client ID not configured' };
        }
        
        // Note: Alipay+ requires RSA signature - simplified for demonstration
        // In production, you need to implement proper RSA-SHA256 signing
        return { 
            error: 'Alipay+ integration requires additional configuration. Please use HitPay for Alipay+ support.' 
        };
    }
    
    /**
     * Handle webhook from payment gateway
     */
    async handleWebhook(gateway: string, payload: any, signature?: string): Promise<boolean> {
        await this.initialize();
        
        switch (gateway) {
            case 'hitpay':
                return await this.handleHitPayWebhook(payload, signature);
            case 'stripe':
                return await this.handleStripeWebhook(payload, signature);
            default:
                console.error('[Payment] Unknown webhook gateway:', gateway);
                return false;
        }
    }
    
    /**
     * HitPay Webhook Handler
     */
    private async handleHitPayWebhook(payload: any, signature?: string): Promise<boolean> {
        // Verify signature if salt is configured
        const salt = this.settings.hitpay_salt;
        if (salt && signature) {
            // TODO: Implement HMAC verification
        }
        
        const { reference_number, status, payment_id } = payload;
        
        if (status === 'completed') {
            await this.completeTransaction(reference_number, payment_id);
            return true;
        }
        
        return false;
    }
    
    /**
     * Stripe Webhook Handler
     */
    private async handleStripeWebhook(payload: any, signature?: string): Promise<boolean> {
        if (payload.type === 'checkout.session.completed') {
            const session = payload.data.object;
            const transactionId = session.metadata?.transaction_id;
            if (transactionId) {
                await this.completeTransaction(transactionId, session.id);
                return true;
            }
        }
        return false;
    }
    
    /**
     * Complete transaction and upgrade user plan
     */
    private async completeTransaction(transactionId: string, gatewayId: string): Promise<void> {
        console.log(`[Payment] Completing transaction: ${transactionId}`);
        
        // Get transaction
        const [tx] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
        if (!tx || tx.status === 'completed') {
            return;
        }
        
        // Update transaction
        await db.update(transactions).set({
            status: 'completed',
            gatewayTransactionId: gatewayId,
            paidAt: new Date()
        }).where(eq(transactions.id, transactionId));
        
        // Get plan
        const [plan] = await db.select().from(plans).where(eq(plans.id, tx.planId!));
        if (!plan) return;
        
        // Determine user plan based on plan name
        let userPlan: 'free' | 'pro' | 'unlimited' = 'pro';
        if (plan.name.toLowerCase().includes('unlimited')) {
            userPlan = 'unlimited';
        }
        
        // Update user plan
        await db.update(user).set({
            plan: userPlan,
            updatedAt: new Date()
        }).where(eq(user.id, tx.userId));
        
        // Create subscription record
        const startDate = new Date();
        let endDate = new Date(startDate);
        if (plan.interval === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (plan.interval === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setFullYear(endDate.getFullYear() + 100); // Lifetime
        }
        
        await db.insert(subscriptions).values({
            id: randomUUID(),
            userId: tx.userId,
            planId: tx.planId!,
            status: 'active',
            currentPeriodStart: startDate,
            currentPeriodEnd: endDate
        });
        
        console.log(`[Payment] User ${tx.userId} upgraded to ${userPlan}`);
    }
    
    /**
     * Get user's active subscription
     */
    async getUserSubscription(userId: string): Promise<any | null> {
        const [subscription] = await db.select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .orderBy(desc(subscriptions.createdAt))
            .limit(1);
        
        return subscription || null;
    }
    
    /**
     * Get user's payment history
     */
    async getUserTransactions(userId: string): Promise<any[]> {
        return await db.select()
            .from(transactions)
            .where(eq(transactions.userId, userId))
            .orderBy(desc(transactions.createdAt));
    }
}

export const paymentService = new PaymentService();
