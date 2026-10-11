import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

function Payment() {
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
              <strong>₹299</strong>
              <span>/ month</span>
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
                You'll be redirected to Razorpay's secure checkout when
                payment integration is enabled.
              </p>
            </div>

            <button
              type="button"
              className="payment-button"
              disabled
            >
              Continue to Secure Payment
              <ArrowRight size={17} />
            </button>

            <p className="payment-demo-note">
              Payment gateway connection will be added next.
            </p>

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