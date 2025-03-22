
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CircuitBoard, Menu, User, X } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/95 py-4 backdrop-blur-sm">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <CircuitBoard className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-slate-900">CircuitSim</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/features" className="text-slate-700 hover:text-primary">
            Features
          </Link>
          <Link to="/pricing" className="text-slate-700 hover:text-primary">
            Pricing
          </Link>
          <Link to="/about" className="text-slate-700 hover:text-primary">
            About
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button onClick={signOut} variant="ghost">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="block md:hidden" 
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
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
            {user ? (
              <>
                <Button asChild variant="outline" className="w-full" onClick={closeMenu}>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
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
