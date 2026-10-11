import os

import razorpay
from dotenv import load_dotenv

load_dotenv()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError(
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured"
    )

razorpay_client = razorpay.Client(
    auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
)


def create_payment_order(amount_in_rupees: int) -> dict:
    amount_in_paise = amount_in_rupees * 100

    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": "easycut_premium",
    }

    return razorpay_client.order.create(data=order_data)


def verify_payment(
    payment_id: str,
    order_id: str,
    signature: str,
) -> bool:
    try:
        razorpay_client.utility.verify_payment_signature(
            {
                "razorpay_payment_id": payment_id,
                "razorpay_order_id": order_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except razorpay.errors.SignatureVerificationError:
        return False