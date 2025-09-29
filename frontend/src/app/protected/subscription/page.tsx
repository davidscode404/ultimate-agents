'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 10,
    features: [
      '10 credits per month',
      'Basic comic generation',
      'Standard image quality',
      'Community support'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 4.99,
    credits: 100,
    popular: true,
    features: [
      '100 credits per month',
      'High-quality comic generation',
      'Voice generation (2 credits/scene)',
      'Priority support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    credits: 500,
    features: [
      '500 credits per month',
      'Premium comic generation',
      'Advanced voice features',
      'Custom character training',
      'Priority processing',
      'Commercial usage rights'
    ]
  }
];

interface SubscriptionStatus {
  plan: string;
  status: string;
  credits: number;
  next_billing_date?: string;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchCurrentPlan();
    }
  }, [user]);

  const fetchCurrentPlan = async () => {
    try {
      if (!user) return;
      
      // Get access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch subscription status from backend
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.STRIPE_SUBSCRIPTION_STATUS), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const status: SubscriptionStatus = await response.json();
        setSubscriptionStatus(status);
        setCurrentPlan(status.plan);
      } else {
        // Fallback to free plan if API fails
        setCurrentPlan('free');
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
      setCurrentPlan('free');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === 'free') {
      // Handle free plan
      console.log('Selected free plan');
    } else {
      // Redirect to Stripe checkout for paid plans
      const stripeLinks = {
        starter: 'https://buy.stripe.com/test_8x2aER4m93o2cWX8Om0Jq00',
        pro: 'https://buy.stripe.com/test_bJe14h6uh5wa0ab2pY0Jq01'
      };
      
      const stripeLink = stripeLinks[planId as keyof typeof stripeLinks];
      if (stripeLink) {
        window.open(stripeLink, '_blank');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center">
        <div className="text-stone-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800">
      {/* Header */}
      <div className="bg-stone-800/50 border-b border-stone-700">
        <div className="py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-amber-50 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-stone-300 max-w-2xl mx-auto px-4">
              Unlock the full potential of AI-powered comic creation with our flexible subscription plans
            </p>
          </div>
        </div>
      </div>

      {/* Current Plan Status */}
      <div className="py-8 px-4">
        <div className="bg-stone-800 rounded-2xl shadow-sm border border-stone-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-amber-50">Current Plan</h2>
              <p className="text-stone-300">You're currently on the {subscriptionPlans.find(p => p.id === currentPlan)?.name} plan</p>
              {subscriptionStatus?.status && (
                <p className="text-xs text-stone-400 mt-1">Status: {subscriptionStatus.status}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">
                £{subscriptionPlans.find(p => p.id === currentPlan)?.price}/month
              </div>
              <div className="text-sm text-stone-400">
                {subscriptionStatus?.credits || subscriptionPlans.find(p => p.id === currentPlan)?.credits} credits
              </div>
              {subscriptionStatus?.next_billing_date && (
                <div className="text-xs text-stone-500 mt-1">
                  Next billing: {new Date(subscriptionStatus.next_billing_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-stone-800 rounded-2xl shadow-sm border-2 transition-all duration-200 hover:shadow-lg ${
                plan.popular 
                  ? 'border-amber-500 shadow-amber-500/20' 
                  : 'border-stone-600 hover:border-stone-500'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-amber-50 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-amber-400">£{plan.price}</span>
                    <span className="text-stone-300">/month</span>
                  </div>
                  <div className="text-sm text-stone-400 mb-4">
                    {plan.credits.toLocaleString()} credits included
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-amber-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-stone-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    plan.id === currentPlan
                      ? 'bg-stone-600 text-stone-400 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-stone-700 text-amber-50 hover:bg-stone-600'
                  }`}
                  disabled={plan.id === currentPlan}
                >
                  {plan.id === currentPlan ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Upgrade'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-stone-800 rounded-2xl shadow-sm border border-stone-700 p-8 mb-8">
          <h3 className="text-2xl font-bold text-amber-50 mb-6 text-center">
            Everything you need to create amazing comics
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-amber-50 mb-2">AI Comic Generation</h4>
              <p className="text-sm text-stone-300">
                Create stunning comics with advanced AI that understands your story and brings it to life
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h4 className="font-semibold text-amber-50 mb-2">Voice Generation</h4>
              <p className="text-sm text-stone-300">
                Add realistic voiceovers to your comics with high-quality AI voice synthesis
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-amber-50 mb-2">Export & Share</h4>
              <p className="text-sm text-stone-300">
                Export your creations in multiple formats and share them with the world
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-stone-800 rounded-2xl shadow-sm border border-stone-700 p-8">
          <h3 className="text-2xl font-bold text-amber-50 mb-6 text-center">
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-amber-50 mb-2">What happens to unused credits?</h4>
              <p className="text-stone-300 text-sm">
                Credits roll over to the next month, so you never lose what you've paid for. Credits expire after 12 months of inactivity.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-amber-50 mb-2">Can I change my plan anytime?</h4>
              <p className="text-stone-300 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any differences.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-amber-50 mb-2">Do you offer refunds?</h4>
              <p className="text-stone-300 text-sm">
                We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-amber-50 mb-2">Is there a free trial?</h4>
              <p className="text-stone-300 text-sm">
                Yes! Start with our free plan that includes 10 credits to try out our features. No credit card required.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
