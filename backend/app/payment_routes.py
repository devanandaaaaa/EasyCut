from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.security import get_current_user
from app.models import User
from app.payment import (
    RAZORPAY_KEY_ID,
    create_payment_order,
)

router = APIRouter(
    prefix="/payment",
    tags=["Payment"],
)


class CreateOrderRequest(BaseModel):
    plan: str


@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
):
    if request.plan != "premium_monthly":
        raise HTTPException(
            status_code=400,
            detail="Invalid subscription plan",
        )

    try:
        order = create_payment_order(299)

        return {
            "status": "success",
            "key_id": RAZORPAY_KEY_ID,
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to create payment order: {error}",
        )