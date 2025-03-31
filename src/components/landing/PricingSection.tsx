import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for learning and experimentation",
    features: [
      "Basic circuit editing and simulation",
      "Component library access",
      "Microcontroller programming",
      "Save up to 5 projects",
      "Community support",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "per month",
    description: "Unlock advanced features for serious hobbyists",
    features: [
      "Everything in Free",
      "Unlimited projects",
      "Real-time collaboration",
      "Version control",
      "Project import/export",
      "Priority support",
      "No ads",
    ],
    buttonText: "Subscribe Now",
    buttonVariant: "default" as const,
    highlighted: true,
  },
];

const PricingSection = () => {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Choose the plan that works best for your needs.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 md:gap-12 lg:mx-auto lg:max-w-4xl">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border ${
                plan.highlighted
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 bg-white"
              } p-8 shadow-sm`}
            >
              <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-slate-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="ml-1 text-sm text-slate-600">
                    {plan.period}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

              <ul className="mt-6 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  asChild
                  variant={plan.buttonVariant}
                  className="w-full"
                >
                  <Link to="/signup">{plan.buttonText}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
