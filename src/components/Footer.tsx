import logo from "@/assets/logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="R. Veldhuis Installatie" className="h-16 w-auto" />
            </div>
            <p className="text-primary-foreground/70">
              Uw specialist voor airco, verwarming, elektra, water en riolering.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Snelle Links</h4>
            <nav className="space-y-2">
              <a href="#home" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Home
              </a>
              <a href="#diensten" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Diensten
              </a>
              <a href="#over" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Over Mij
              </a>
              <a href="#contact" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Contact
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-bold text-lg mb-4">Contact</h4>
            <div className="space-y-2 text-primary-foreground/70">
              <p>Tel: 06 - 1362 9947</p>
              <p>E-mail: inf0@rv-installatie.nl</p>
              <p>Werkgebied: Regio Nederland</p>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-primary-foreground/60 text-sm">
          <p>© {currentYear} R. Veldhuis Installatie. Alle rechten voorbehouden.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
