import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { db } from '../db/index.js';
import { plans } from '../db/schema.js';

export const paymentRoutes = Router();

// Get available plans
paymentRoutes.get('/plans', async (req: Request, res: Response) => {
    try {
        const allPlans = await db.select().from(plans).orderBy(plans.sortOrder);
        res.json(allPlans.filter(p => p.isActive));
    } catch (error) {
        console.error('[Payment] Error getting plans:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

// Create checkout session
paymentRoutes.post('/checkout', async (req: Request, res: Response) => {
    try {
        const { userId, planId } = req.body;
        
        if (!userId || !planId) {
            return res.status(400).json({ error: 'Missing userId or planId' });
        }
        
        const result = await paymentService.createCheckout(userId, planId);
        
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }
        
        res.json({ url: result.url });
    } catch (error) {
        console.error('[Payment] Error creating checkout:', error);
        res.status(500).json({ error: 'Failed to create checkout' });
    }
});

// Get current gateway info
paymentRoutes.get('/gateway', async (req: Request, res: Response) => {
    try {
        await paymentService.initialize();
        res.json({ 
            gateway: paymentService.getGateway(),
            enabled: paymentService.getGateway() !== 'none'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get gateway info' });
    }
});

// Get user's payment history
paymentRoutes.get('/history/:userId', async (req: Request, res: Response) => {
    try {
        const transactions = await paymentService.getUserTransactions(req.params.userId);
        res.json(transactions);
    } catch (error) {
        console.error('[Payment] Error getting history:', error);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
});

// Get user's subscription
paymentRoutes.get('/subscription/:userId', async (req: Request, res: Response) => {
    try {
        const subscription = await paymentService.getUserSubscription(req.params.userId);
        res.json(subscription || { status: 'none' });
    } catch (error) {
        console.error('[Payment] Error getting subscription:', error);
        res.status(500).json({ error: 'Failed to get subscription' });
    }
});

// HitPay Webhook
paymentRoutes.post('/webhook/hitpay', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['hitpay-signature'] as string;
        const success = await paymentService.handleWebhook('hitpay', req.body, signature);
        res.json({ received: true, success });
    } catch (error) {
        console.error('[Payment] HitPay webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Stripe Webhook
paymentRoutes.post('/webhook/stripe', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['stripe-signature'] as string;
        const success = await paymentService.handleWebhook('stripe', req.body, signature);
        res.json({ received: true, success });
    } catch (error) {
        console.error('[Payment] Stripe webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default paymentRoutes;
