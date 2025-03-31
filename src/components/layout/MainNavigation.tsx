import * as React from "react";
import { Link } from "react-router-dom";
import { CircuitBoard, BookOpen, Info, Users } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export function MainNavigation() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Features</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
              <li className="row-span-3">
                <NavigationMenuLink asChild>
                  <Link
                    to="/features"
                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-primary/20 to-primary/5 p-6 no-underline outline-none focus:shadow-md"
                  >
                    <CircuitBoard className="h-6 w-6" />
                    <div className="mb-2 mt-4 text-lg font-medium">
                      DeepCircuits
                    </div>
                    <p className="text-sm leading-tight text-muted-foreground">
                      A web-based, interactive 2D electronics and microcontroller circuit simulator.
                    </p>
                  </Link>
                </NavigationMenuLink>
              </li>
              <ListItem to="/features" title="Features Overview" icon={BookOpen}>
                Explore all the features DeepCircuits has to offer
              </ListItem>
              <ListItem to="/tutorials" title="Tutorials" icon={BookOpen}>
                Learn how to use DeepCircuits with our step-by-step tutorials
              </ListItem>
              <ListItem to="/documentation" title="Documentation" icon={BookOpen}>
                Detailed documentation for all components and functions
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>About</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[400px] gap-3 p-4 md:grid-cols-2">
              <ListItem to="/about" title="About Us" icon={Info}>
                Our mission and vision for DeepCircuits
              </ListItem>
              <ListItem to="/team" title="Our Team" icon={Users}>
                Meet the team behind DeepCircuits
              </ListItem>
              <ListItem to="/contact" title="Contact" icon={Info}>
                Get in touch with our support team
              </ListItem>
              <ListItem to="/blog" title="Blog" icon={BookOpen}>
                Latest updates and articles about electronics
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link to="/pricing" className={navigationMenuTriggerStyle()}>
            Pricing
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    to: string;
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
  }
>(({ className, title, to, children, icon: Icon, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          ref={ref}
          to={to}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2 text-sm font-medium leading-none">
            {Icon && <Icon className="h-4 w-4" />}
            {title}
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
