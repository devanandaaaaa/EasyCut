import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

function Subscription() {
  const [billing, setBilling] = useState("monthly");

  const isMonthly = billing === "monthly";

  const premiumPrice = isMonthly ? "₹299" : "₹2,499";
  const premiumPeriod = isMonthly ? "/ month" : "/ year";

  const features = [
    "Unlimited AI video projects",
    "Semantic video matching",
    "AI scene understanding",
    "Automatic clip selection",
    "Voiceover-based editing",
    "English, Malayalam & Hindi",
    "Professional video editor",
    "HD video export",
    "Priority processing",
  ];

  return (
    <main className="subscription-page">
      <div className="subscription-shell">

        <Link to="/dashboard" className="subscription-back">
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <section className="subscription-header">
          <div className="subscription-eyebrow">
            <Sparkles size={16} />
            EasyCut Premium
          </div>

          <h1>Choose the plan that fits your creativity.</h1>

          <p>
            Start creating with EasyCut's AI-powered video editing tools.
            Upgrade when you need more.
          </p>

          <div className="subscription-billing">
            <button
              type="button"
              className={isMonthly ? "active" : ""}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>

            <button
              type="button"
              className={!isMonthly ? "active" : ""}
              onClick={() => setBilling("yearly")}
            >
              Yearly
              <span>Save</span>
            </button>
          </div>
        </section>

        <section className="subscription-plans">

          {/* FREE PLAN */}
          <article className="subscription-card">
            <div className="subscription-card-top">
              <div className="subscription-plan-icon">
                <Zap size={21} />
              </div>

              <div>
                <h2>Free</h2>
                <p>Explore the EasyCut experience.</p>
              </div>
            </div>

            <div className="subscription-price">
              <strong>₹0</strong>
              <span>/ forever</span>
            </div>

            <div className="subscription-project-limit">
              <strong>5 projects</strong>
              <span>included</span>
            </div>

            <Link
              to="/dashboard"
              className="subscription-plan-button subscription-plan-button-secondary"
            >
              Continue Free
              <ArrowRight size={17} />
            </Link>

            <div className="subscription-feature-title">
              Includes:
            </div>

            <ul className="subscription-features">
              <li>
                <Check size={17} />
                Create up to 5 projects
              </li>

              <li>
                <Check size={17} />
                AI-powered video matching
              </li>

              <li>
                <Check size={17} />
                Basic video editing
              </li>

              <li>
                <Check size={17} />
                Script and voiceover input
              </li>

              <li>
                <Check size={17} />
                English, Malayalam & Hindi
              </li>
            </ul>
          </article>

          {/* PREMIUM PLAN */}
          <article className="subscription-card subscription-card-premium">

            <div className="subscription-popular">
              <Sparkles size={14} />
              Most Popular
            </div>

            <div className="subscription-card-top">
              <div className="subscription-plan-icon premium">
                <Crown size={21} />
              </div>

              <div>
                <h2>Premium</h2>
                <p>For creators who want more.</p>
              </div>
            </div>

            <div className="subscription-price">
              <strong>{premiumPrice}</strong>
              <span>{premiumPeriod}</span>
            </div>

            <div className="subscription-project-limit">
              <strong>Unlimited projects</strong>
              <span>with Premium</span>
            </div>

            <Link
              to="/payment"
              className="subscription-plan-button subscription-plan-button-primary"
            >
              Upgrade to Premium
              <ArrowRight size={17} />
            </Link>

            <div className="subscription-feature-title">
              Everything in Free, plus:
            </div>

            <ul className="subscription-features">
              {features.map((feature) => (
                <li key={feature}>
                  <Check size={17} />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="subscription-note">
          <Sparkles size={16} />
          <p>
            You can continue using the free plan with your first 5 projects.
            Premium is required after the free project limit is reached.
          </p>
        </section>

      </div>
    </main>
  );
}

export default Subscription;