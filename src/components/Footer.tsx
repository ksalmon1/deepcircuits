
import { Link } from "react-router-dom";
import { CircuitBoard, Github, Twitter } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-100 bg-white py-12">
      <div className="container">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2">
              <CircuitBoard className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-slate-900">DeepCircuits</span>
            </Link>
            <p className="text-sm text-slate-600">
              A web-based, interactive 2D electronics and microcontroller circuit simulator for hobbyists and students.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-primary"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-primary"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase text-slate-900">Product</h3>
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
              <li>
                <Link to="/tutorials" className="text-sm text-slate-600 hover:text-primary">
                  Tutorials
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase text-slate-900">Company</h3>
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
              <li>
                <Link to="/careers" className="text-sm text-slate-600 hover:text-primary">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase text-slate-900">Legal</h3>
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
              <li>
                <Link to="/cookies" className="text-sm text-slate-600 hover:text-primary">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-100 pt-8 text-center text-sm text-slate-600">
          <p>&copy; {currentYear} DeepCircuits. All rights reserved.</p>
          <p className="mt-2">
            Built with passion for electronics and education.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
