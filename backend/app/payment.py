import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

razorpay_client = None
razorpay_module = None


class PaymentConfigurationError(RuntimeError):
    """Raised when a payment operation is requested without Razorpay keys."""


def _get_razorpay_client():
    global razorpay_client, razorpay_module

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise PaymentConfigurationError(
            "Razorpay payments are unavailable: configure both "
            "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to use payment features."
        )

    if not RAZORPAY_KEY_ID.startswith("rzp_test_"):
        raise PaymentConfigurationError(
            "Razorpay payments are disabled until RAZORPAY_KEY_ID is configured "
            "with a Razorpay test-mode key (rzp_test_...)."
        )

    if razorpay_client is None:
        try:
            import razorpay as razorpay_sdk
        except ImportError as error:
            raise PaymentConfigurationError(
                "Razorpay payments are unavailable: install the Razorpay "
                "Python SDK to use payment features."
            ) from error

        razorpay_module = razorpay_sdk
        razorpay_client = razorpay_module.Client(
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
        )

    return razorpay_client


def create_payment_order(amount_in_rupees: int, receipt: str = "easycut_premium") -> dict:
    amount_in_paise = amount_in_rupees * 100

    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": receipt,
    }

    return _get_razorpay_client().order.create(data=order_data)


def verify_payment(
    payment_id: str,
    order_id: str,
    signature: str,
) -> bool:
    client = _get_razorpay_client()
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_payment_id": payment_id,
                "razorpay_order_id": order_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except razorpay_module.errors.SignatureVerificationError:
        return False


def fetch_payment(payment_id: str) -> dict:
    """Fetch trusted payment state from Razorpay after signature validation."""
    return _get_razorpay_client().payment.fetch(payment_id)
