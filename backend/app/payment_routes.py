import calendar
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import PaymentOrder, User
from app.payment import (
    PaymentConfigurationError,
    RAZORPAY_KEY_ID,
    create_payment_order,
    fetch_payment,
    verify_payment,
)
from app.security import get_current_user

router = APIRouter(prefix="/payment", tags=["Payment"])

PLANS = {
    "premium_monthly": {"amount": 29900, "months": 1, "billing_period": "monthly"},
    "premium_yearly": {"amount": 249900, "months": 12, "billing_period": "yearly"},
}


class CreateOrderRequest(BaseModel):
    plan: str


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return value.replace(
        year=year,
        month=month,
        day=min(value.day, calendar.monthrange(year, month)[1]),
    )


@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = PLANS.get(request.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")

    try:
        receipt = f"ec_{current_user.id}_{uuid4().hex[:24]}"
        order = create_payment_order(plan["amount"] // 100, receipt=receipt)
    except PaymentConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="Unable to create Razorpay order.") from error

    if (
        not isinstance(order, dict)
        or not order.get("id")
        or order.get("amount") != plan["amount"]
        or order.get("currency") != "INR"
    ):
        raise HTTPException(status_code=502, detail="Payment provider returned an invalid order.")

    db.add(PaymentOrder(
        order_id=order["id"],
        user_id=current_user.id,
        plan=request.plan,
        amount=plan["amount"],
        currency="INR",
        status="pending",
    ))
    db.commit()
    return {
        "key_id": RAZORPAY_KEY_ID,
        "order_id": order["id"],
        "amount": plan["amount"],
        "currency": "INR",
        "plan": request.plan,
        "billing_period": plan["billing_period"],
    }


@router.post("/verify")
def verify_order(
    request: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(PaymentOrder).filter(
        PaymentOrder.order_id == request.razorpay_order_id,
        PaymentOrder.user_id == current_user.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Payment order not found for this account.")

    try:
        if not verify_payment(
            request.razorpay_payment_id,
            request.razorpay_order_id,
            request.razorpay_signature,
        ):
            raise HTTPException(status_code=400, detail="Payment signature verification failed.")
        payment = fetch_payment(request.razorpay_payment_id)
    except PaymentConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail="Could not verify payment with Razorpay.") from error

    if (
        payment.get("id") != request.razorpay_payment_id
        or payment.get("order_id") != order.order_id
        or payment.get("amount") != order.amount
        or payment.get("currency") != order.currency
        or payment.get("status") != "captured"
    ):
        raise HTTPException(status_code=400, detail="Payment is not captured or does not match this order.")

    if order.status == "verified":
        if order.payment_id != request.razorpay_payment_id:
            raise HTTPException(status_code=409, detail="This order was already verified with a different payment.")
        user = db.query(User).filter(User.id == current_user.id).first()
        return {"status": "active", "expires_at": user.subscription_expires_at}

    if order.status != "pending":
        raise HTTPException(status_code=409, detail="This payment order cannot be activated.")

    try:
        if db.bind.dialect.name == "sqlite":
            db.execute(text("BEGIN IMMEDIATE"))
        order = db.query(PaymentOrder).filter(
            PaymentOrder.order_id == request.razorpay_order_id,
            PaymentOrder.user_id == current_user.id,
        ).with_for_update().first()
        user = db.query(User).filter(User.id == current_user.id).with_for_update().first()
        if order.status == "verified":
            return {"status": "active", "expires_at": user.subscription_expires_at}
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        expiry = user.subscription_expires_at
        if user.subscription_status == "active" and expiry and expiry > now:
            now = expiry
        user.subscription_expires_at = _add_months(now, PLANS[order.plan]["months"])
        user.subscription_status = "active"
        user.subscription_plan = order.plan
        order.status = "verified"
        order.payment_id = request.razorpay_payment_id
        order.verified_at = datetime.utcnow()
        db.commit()
        return {"status": "active", "expires_at": user.subscription_expires_at}
    except Exception:
        db.rollback()
        raise
