import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";

function Payment() {
  const billingPeriod = useLocation().state?.billingPeriod === "yearly" ? "yearly" : "monthly";
  const plan = billingPeriod === "yearly" ? "premium_yearly" : "premium_monthly";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function startCheckout() {
    setBusy(true);
    setMessage("");
    try {
      const { data: order } = await api.post("/payment/create-order", { plan });
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "EasyCut Premium",
        description: billingPeriod === "yearly" ? "Premium yearly plan" : "Premium monthly plan",
        order_id: order.order_id,
        handler: async (paymentResponse) => {
          try {
            await api.post("/payment/verify", paymentResponse);
            setMessage("Payment verified. Premium is active for your account.");
          } catch (error) {
            setMessage(error.response?.data?.detail || "Payment could not be verified. Your plan has not been activated.");
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", (event) => {
        setMessage(event.error?.description || "Payment failed. Your plan has not been activated.");
        setBusy(false);
      });
      checkout.open();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Could not start secure checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="payment-page">
      <div className="payment-shell">

        <Link to="/subscription" className="payment-back">
          <ArrowLeft size={17} />
          Back to Plans
        </Link>

        <section className="payment-header">
          <div className="payment-eyebrow">
            <Sparkles size={15} />
            EasyCut Premium
          </div>

          <h1>Complete your upgrade</h1>

          <p>
            You're one step away from unlocking the full EasyCut AI video
            editing experience.
          </p>
        </section>

        <section className="payment-layout">

          {/* ORDER SUMMARY */}
          <article className="payment-summary">

            <div className="payment-summary-heading">
              <div className="payment-summary-icon">
                <Sparkles size={20} />
              </div>

              <div>
                <h2>Premium Plan</h2>
                <p>Unlimited creative projects</p>
              </div>
            </div>

            <div className="payment-summary-price">
              <strong>{billingPeriod === "yearly" ? "₹2,499" : "₹299"}</strong>
              <span>{billingPeriod === "yearly" ? "/ year" : "/ month"}</span>
            </div>

            <div className="payment-summary-divider" />

            <ul className="payment-benefits">
              <li>
                <Check size={16} />
                Unlimited AI video projects
              </li>

              <li>
                <Check size={16} />
                Semantic video matching
              </li>

              <li>
                <Check size={16} />
                AI scene understanding
              </li>

              <li>
                <Check size={16} />
                Voiceover-based editing
              </li>

              <li>
                <Check size={16} />
                Professional video editor
              </li>

              <li>
                <Check size={16} />
                HD video export
              </li>
            </ul>

            <div className="payment-secure-note">
              <ShieldCheck size={17} />

              <div>
                <strong>Secure payment</strong>
                <span>
                  Your payment will be processed securely through our
                  payment provider.
                </span>
              </div>
            </div>

          </article>

          {/* PAYMENT AREA */}
          <article className="payment-card">

            <div className="payment-card-header">
              <div>
                <h2>Payment</h2>
                <p>Secure checkout</p>
              </div>

              <LockKeyhole size={20} />
            </div>

            <div className="payment-method">
              <div className="payment-method-icon">
                <CreditCard size={20} />
              </div>

              <div>
                <strong>Razorpay</strong>
                <span>Secure online payment</span>
              </div>

              <div className="payment-method-check">
                ✓
              </div>
            </div>

            <div className="payment-info-box">
              <ShieldCheck size={18} />

              <p>
                Continue to Razorpay secure checkout. Premium is activated only after the server verifies a captured payment.
              </p>
            </div>

            <button
              type="button"
              className="payment-button"
              disabled={busy}
              onClick={startCheckout}
            >
              {busy ? "Connecting to Razorpay..." : "Continue to Secure Payment"}
              <ArrowRight size={17} />
            </button>

            {message && <p className="payment-demo-note" role="status">{message}</p>}

          </article>

        </section>

        <div className="payment-footer-note">
          <LockKeyhole size={15} />
          <span>Secure checkout · EasyCut Premium</span>
        </div>

      </div>
    </main>
  );
}

export default Payment;
