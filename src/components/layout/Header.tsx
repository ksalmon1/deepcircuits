import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CircuitBoard, Menu, User, X, Settings, Shield, LogOut } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MainNavigation } from "@/components/layout/MainNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, signOut, isAdmin } = useAuth();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/95 py-4 backdrop-blur-sm">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <CircuitBoard className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-slate-900">DeepCircuits</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center md:flex">
          <MainNavigation />
        </nav>

        {/* User Account Section */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="outline" className="hidden md:flex">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              
              {/* User avatar dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={user.user_metadata?.avatar_url || ''} alt={user.email || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.email ? user.email[0].toUpperCase() : <User size={16} />}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin() && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin Settings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-500 focus:text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="outline" className="hidden md:flex">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild className="hidden md:flex">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
          
          {/* Mobile Menu Button */}
          <button 
            className="block md:hidden" 
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white/95 pt-16 backdrop-blur-md">
          <nav className="container flex flex-col items-center gap-6 pt-8">
            <Link
              to="/features"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={closeMenu}
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={closeMenu}
            >
              Pricing
            </Link>
            <Link
              to="/about"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={closeMenu}
            >
              About
            </Link>
            <Link
              to="/documentation"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={closeMenu}
            >
              Documentation
            </Link>
            <Link
              to="/tutorials"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={closeMenu}
            >
              Tutorials
            </Link>
            <Link
              to="/blog"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={closeMenu}
            >
              Blog
            </Link>
            {user ? (
              <>
                <Button asChild variant="outline" className="w-full" onClick={closeMenu}>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="w-full" onClick={closeMenu}>
                  <Link to="/profile">Profile Settings</Link>
                </Button>
                {isAdmin() && (
                  <Button asChild variant="outline" className="w-full" onClick={closeMenu}>
                    <Link to="/admin">Admin Settings</Link>
                  </Button>
                )}
                <Button className="w-full" onClick={() => { signOut(); closeMenu(); }}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="w-full" onClick={closeMenu}>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full" onClick={closeMenu}>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
