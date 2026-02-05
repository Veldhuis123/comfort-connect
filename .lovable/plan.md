
# Plan: reCAPTCHA Optioneel Maken

## Probleem
De frontend code importeert `react-google-recaptcha` maar deze module is niet geïnstalleerd op de server, waardoor de build faalt.

## Oplossing
De reCAPTCHA integratie optioneel maken met een "lazy load" approach. De code werkt dan zowel met als zonder de module.

## Technische Aanpak

### Bestand: `src/components/Contact.tsx`

1. **Verwijder de directe import** van `react-google-recaptcha`
2. **Gebruik dynamic import** met React.lazy() en Suspense
3. **Fallback gedrag** als de module niet beschikbaar is

```typescript
// In plaats van:
import ReCAPTCHA from "react-google-recaptcha";

// Gebruiken we:
const ReCAPTCHA = React.lazy(() => 
  import("react-google-recaptcha").catch(() => ({ 
    default: () => null 
  }))
);
```

4. **Wrap de ReCAPTCHA component** in een Suspense boundary met fallback

### Voordelen
- Formulier werkt altijd, ook zonder reCAPTCHA module
- Als de module later wordt geïnstalleerd, werkt reCAPTCHA automatisch
- Geen breaking changes voor de server deployment
- Graceful degradation

### Bestanden die worden aangepast
- `src/components/Contact.tsx` - Dynamic import met fallback

### Na implementatie
1. Kopieer het nieuwe `Contact.tsx` bestand naar je server
2. Herbouw de frontend: `npm run build`
3. Herstart de services
