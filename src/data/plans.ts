
export interface PlanDetails {
  name: string;
  price?: string;
  interval: string;
  features: string[];
  isPopular?: boolean;
  isDisabled?: boolean;
}

export const plans: PlanDetails[] = [
  {
    name: "Free",
    price: "0",
    interval: "forever",
    features: [
      "5 projects",
      "Basic components",
      "Community support",
      "24 hour simulation time limit"
    ],
    isPopular: false,
  },
  {
    name: "Pro",
    price: "12",
    interval: "month",
    features: [
      "Unlimited projects",
      "All components",
      "Priority support",
      "Version history",
      "No simulation time limits",
      "Export projects"
    ],
    isPopular: true,
  },
  {
    name: "Enterprise",
    price: "49",
    interval: "month",
    features: [
      "Everything in Pro",
      "SSO Authentication",
      "Dedicated support",
      "Custom component library",
      "Team collaboration"
    ],
    isDisabled: true,
  }
];
