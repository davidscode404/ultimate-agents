'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

interface CreditsPurchaseProps {
  onSuccess?: () => void;
  planId?: string;
}

const SUBSCRIPTION_PLANS = {
  starter: { id: 'starter', name: 'Starter', price: 4.99, credits: 100, interval: 'month' },
  pro: { id: 'pro', name: 'Pro', price: 19.99, credits: 500, interval: 'month' },
};

export default function CreditsPurchase({ onSuccess, planId }: CreditsPurchaseProps) {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const stripe = useStripe();
  const elements = useElements();
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    // First check if planId prop is provided (for modal usage)
    if (planId && SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      setSelectedPlan(SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]);
      return;
    }
    
    // Otherwise check URL parameters
    const planParam = searchParams.get('plan');
    if (planParam && SUBSCRIPTION_PLANS[planParam as keyof typeof SUBSCRIPTION_PLANS]) {
      setSelectedPlan(SUBSCRIPTION_PLANS[planParam as keyof typeof SUBSCRIPTION_PLANS]);
    }
  }, [searchParams, planId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !selectedPlan) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Please sign in to purchase subscription');
      }

      // Create subscription on your backend
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const { clientSecret, error: paymentError } = await response.json();

      if (paymentError) {
        throw new Error(paymentError);
      }

      // Confirm the payment
      const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Success!
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPlan) {
    return (
      <div className="max-w-md mx-auto p-6 bg-stone-800 rounded-2xl shadow-sm border border-stone-700">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-amber-50 mb-4">No Plan Selected</h2>
          <p className="text-stone-300 mb-6">Please select a subscription plan first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Selected Plan Summary */}
      <div className="bg-stone-800 rounded-2xl shadow-sm border border-stone-700 p-6 mb-6">
        <h2 className="text-2xl font-bold text-amber-50 mb-4">Complete Your Subscription</h2>
        
        <div className="bg-stone-700 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-50">{selectedPlan.name} Plan</h3>
              <p className="text-sm text-stone-300">{selectedPlan.credits.toLocaleString()} credits per month</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">£{selectedPlan.price}</div>
              <div className="text-sm text-stone-400">per {selectedPlan.interval}</div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-stone-700 rounded-xl p-4">
            <label className="block text-sm font-medium text-amber-50 mb-3">
              Payment Information
            </label>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#fbbf24',
                    '::placeholder': {
                      color: '#a3a3a3',
                    },
                  },
                  invalid: {
                    color: '#ef4444',
                  },
                },
              }}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-4 rounded-xl border border-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full bg-amber-500 text-white py-4 px-6 rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
          >
            {loading ? 'Processing...' : `Subscribe for £${selectedPlan.price}/${selectedPlan.interval}`}
          </button>
        </form>

        <div className="mt-6 text-xs text-stone-400 text-center">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
