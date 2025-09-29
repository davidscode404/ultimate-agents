from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import stripe
import os
from typing import Optional
from auth_shared import get_current_user
import json
from datetime import datetime

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/api/stripe", tags=["stripe"])

# Subscription plans configuration (in pence for GBP)
SUBSCRIPTION_PLANS = {
    "starter": {"price": 499, "credits": 100, "name": "Starter"},  # £4.99 in pence
    "pro": {"price": 1999, "credits": 500, "name": "Pro"},  # £19.99 in pence
}

class SubscriptionStatusResponse(BaseModel):
    plan: str
    status: str
    credits: int
    next_billing_date: Optional[str] = None

@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: dict = Depends(get_current_user)
):
    """Get user's current subscription status"""
    
    # TODO: In a real implementation, you would:
    # 1. Check your database for the user's subscription status
    # 2. Verify with Stripe if the subscription is still active
    # 3. Return the current plan, status, and credits
    
    # For now, return a default free plan status
    return SubscriptionStatusResponse(
        plan="free",
        status="active",
        credits=10,
        next_billing_date=None
    )

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for subscription events"""
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle subscription events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_email = session["customer_details"]["email"]
        
        # TODO: Update user's subscription status in your database
        # This would typically involve:
        # 1. Finding the user by email
        # 2. Updating their subscription plan and status
        # 3. Setting their monthly credit allocation
        
        print(f"Subscription created: Customer {customer_email} completed checkout")
        
    elif event["type"] == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        customer_email = invoice["customer_email"]
        
        # TODO: Renew user's credits for the month
        # This would typically involve:
        # 1. Finding the user by email
        # 2. Adding their monthly credit allocation
        # 3. Updating next billing date
        
        print(f"Subscription renewed: Customer {customer_email} payment succeeded")
        
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_email = subscription["customer_email"]
        
        # TODO: Downgrade user to free plan
        # This would typically involve:
        # 1. Finding the user by email
        # 2. Setting their plan to "free"
        # 3. Removing subscription benefits
        
        print(f"Subscription cancelled: Customer {customer_email} subscription deleted")
    
    return {"status": "success"}
