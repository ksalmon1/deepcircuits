
import { Link } from "react-router-dom";
import { CircuitIcon } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-100 bg-white py-8">
      <div className="container">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <CircuitIcon className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-slate-900">CircuitSim</span>
            </Link>
            <p className="text-sm text-slate-600">
              A web-based, interactive 2D electronics and microcontroller circuit simulator for hobbyists and students.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Product</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/features" className="text-sm text-slate-600 hover:text-primary">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-slate-600 hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/documentation" className="text-sm text-slate-600 hover:text-primary">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Company</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/about" className="text-sm text-slate-600 hover:text-primary">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-600 hover:text-primary">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm text-slate-600 hover:text-primary">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Legal</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/terms" className="text-sm text-slate-600 hover:text-primary">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-slate-600 hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-100 pt-8 text-center text-sm text-slate-600">
          &copy; {currentYear} CircuitSim. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
