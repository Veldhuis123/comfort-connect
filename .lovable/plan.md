
# Plan: Fix "Geïmporteerd" detectie en selectie in CustomerSelector

## Probleem
Klanten worden onterecht als "Geïmporteerd" getoond in de e-Boekhouden lijst wanneer:
1. De e-mail leeg is (beide lege e-mails matchen op `"" === ""`)
2. Toevallig dezelfde e-mail hebben maar niet uit e-Boekhouden komen

Bij het klikken op "Selecteren" gebeurt er niets omdat de klant niet gevonden kan worden op basis van e-mail.

## Oplossing
Verbeter de matching logica door:
1. Lege e-mails uitsluiten van de match
2. Extra check toevoegen op bedrijfsnaam OF contactnaam
3. Fallback bieden als selectie niet lukt

## Technische wijzigingen

### Bestand: `src/components/CustomerSelector.tsx`

**1. Verbeter `isAlreadyImported` functie (regel 259-261)**

Huidige code:
```typescript
const isAlreadyImported = (relatie: EBoekhoudenRelatie) => {
  return customers.some(c => c.email === relatie.email);
};
```

Nieuwe code:
```typescript
const isAlreadyImported = (relatie: EBoekhoudenRelatie) => {
  // Geen match op lege e-mails
  if (!relatie.email?.trim()) return false;
  
  return customers.some(c => 
    c.email?.trim().toLowerCase() === relatie.email?.trim().toLowerCase()
  );
};
```

**2. Verbeter selectie-logica voor "al geïmporteerde" klanten (regel 482-489)**

Huidige code zoekt alleen op e-mail en doet niets als niet gevonden.

Nieuwe code:
- Zoek eerst op e-mail (case-insensitive)
- Als niet gevonden, zoek op bedrijfsnaam of contactnaam
- Toon toast met foutmelding als echt niet gevonden

```typescript
if (alreadyImported) {
  const existing = customers.find(c => 
    c.email?.trim().toLowerCase() === relatie.email?.trim().toLowerCase()
  );
  if (existing) {
    onSelectCustomer(existing.id);
    setShowDialog(false);
  } else {
    toast({ 
      title: "Klant niet gevonden", 
      description: "De gekoppelde klant kon niet worden gevonden. Probeer opnieuw te importeren.",
      variant: "destructive" 
    });
  }
}
```

## Verwacht resultaat
- Klanten met lege e-mails worden NIET meer als "Geïmporteerd" getoond
- E-mail matching is case-insensitive (Info@test.nl === info@test.nl)
- Bij het klikken op "Selecteren" wordt de klant correct geselecteerd of krijgt de gebruiker een duidelijke foutmelding
