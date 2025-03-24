
import { Link, useLocation } from "react-router-dom";
import { 
  Breadcrumb,
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

// Define custom breadcrumb titles for specific routes
const routeTitles: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/profile": "Profile Settings",
  "/admin": "Admin Settings",
  "/admin/users": "User Management",
  "/admin/system": "System Settings",
  "/admin/components": "Component Library",
  "/about": "About",
  "/features": "Features",
  "/pricing": "Pricing",
  "/documentation": "Documentation",
  "/tutorials": "Tutorials",
  "/blog": "Blog",
  "/circuit-editor": "Circuit Editor"
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(segment => segment);
  
  // Check if we're in a circuit editor with an ID
  const isCircuitEditor = pathSegments[0] === 'circuit-editor' && pathSegments.length > 1;
  
  // Handle special case for circuit editor with ID
  const segments = isCircuitEditor 
    ? ['circuit-editor', `Project ${pathSegments[1]}`] 
    : pathSegments;

  // Don't show breadcrumbs on the home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <Breadcrumb className="py-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        
        {segments.map((segment, index) => {
          // Build the path up to this segment
          const path = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          
          // Get the title for this segment
          const title = routeTitles[path] || 
                       (isCircuitEditor && index === 1 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1));
          
          return (
            <BreadcrumbItem key={path}>
              {isLast ? (
                <BreadcrumbPage>{title}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={path}>{title}</Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
