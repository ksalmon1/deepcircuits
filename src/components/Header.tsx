
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CircuitBoard, Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="border-b border-neutral-100 bg-white py-4">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
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
          <Button asChild variant="outline">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button className="block md:hidden" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white pt-16">
          <nav className="container flex flex-col items-center gap-6 pt-8">
            <Link
              to="/features"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={toggleMenu}
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={toggleMenu}
            >
              Pricing
            </Link>
            <Link
              to="/about"
              className="text-xl text-slate-700 hover:text-primary"
              onClick={toggleMenu}
            >
              About
            </Link>
            <Button asChild variant="outline" className="w-full" onClick={toggleMenu}>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="w-full" onClick={toggleMenu}>
              <Link to="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
