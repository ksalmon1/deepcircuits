
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import { plans } from "@/data/plans";

const SubscriptionTab: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plan</CardTitle>
        <CardDescription>
          Manage your subscription and billing information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border rounded-md p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-lg">Current Plan: Free</h3>
                <p className="text-sm text-slate-500">
                  You are currently on the free plan.
                </p>
              </div>
              <Badge variant="outline">Free</Badge>
            </div>
          </div>

          <h3 className="text-lg font-medium pt-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`border rounded-md p-4 relative ${
                  plan.isPopular ? "ring-2 ring-primary" : ""
                } ${plan.isDisabled ? "opacity-60" : ""}`}
              >
                {plan.isPopular && (
                  <Badge className="absolute -top-2 -right-2">Popular</Badge>
                )}
                <h3 className="font-medium text-lg">{plan.name}</h3>
                <div className="flex items-end gap-1 my-2">
                  <span className="text-2xl font-bold">${plan.price || '0'}</span>
                  <span className="text-slate-500">/{plan.interval}</span>
                </div>
                <Separator className="my-3" />
                <ul className="space-y-2 my-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.name === "Free" ? "outline" : "default"}
                  disabled={plan.isDisabled || plan.name === "Free"}
                  onClick={() => setSelectedPlan(plan.name)}
                >
                  {plan.name === "Free" ? "Current Plan" : plan.isDisabled ? "Coming Soon" : "Upgrade"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionTab;
