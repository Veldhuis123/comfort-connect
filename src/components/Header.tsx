import { Phone, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-small.png";
import { refreshCalculatorSettings } from "@/lib/calculatorSettings";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasEnabledCalculators, setHasEnabledCalculators] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    refreshCalculatorSettings().then(settings => {
      const anyEnabled = Object.values(settings).some(calc => calc.enabled);
      setHasEnabledCalculators(anyEnabled);
    });
  }, []);

  const navItems = [
    { label: "Home", href: isHomePage ? "#home" : "/" },
    { label: "Diensten", href: isHomePage ? "#diensten" : "/#diensten" },
    ...(hasEnabledCalculators ? [{ label: "Calculatoren", href: "/calculators", isLink: true }] : []),
    { label: "Reviews", href: isHomePage ? "#reviews" : "/#reviews" },
    { label: "Over Mij", href: isHomePage ? "#over" : "/#over" },
    { label: "Contact", href: isHomePage ? "#contact" : "/#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary/20 shadow-lg shadow-primary/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="R. Veldhuis Installatie" className="h-12 md:h-14 w-auto" width={192} height={103} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              item.isLink ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium"
                >
                  {item.label}
                </a>
              )
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:0613629947" className="flex items-center gap-2 text-primary-foreground font-semibold">
              <Phone className="w-5 h-5 text-accent" />
              06 - 1362 9947
            </a>
            <Button variant="secondary" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground border-0 font-semibold">
              <a href="#contact">Offerte Aanvragen</a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="w-6 h-6 text-primary-foreground" /> : <Menu className="w-6 h-6 text-primary-foreground" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary-foreground/20">
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => (
                item.isLink ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                )
              ))}
              <a href="tel:0613629947" className="flex items-center gap-2 text-accent font-semibold py-2">
                <Phone className="w-5 h-5" />
                06 - 1362 9947
              </a>
              <Button variant="secondary" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground border-0 font-semibold" asChild>
                <a href="#contact">Offerte Aanvragen</a>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
