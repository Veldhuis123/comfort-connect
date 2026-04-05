
## Overzicht problemen & oplossingen

### 1. Dubbele rapporten in de app
**Probleem**: De sync-logica maakt duplicaten aan doordat lokale en remote rapporten niet goed gemerged worden.
**Oplossing**: Fix de `mergeReports` functie en voeg deduplicatie toe bij het aanmaken van nieuwe rapporten.

### 2. Automatisch werkbonnummer
**Probleem**: In de app moet je het werkbonnummer handmatig invullen, op de site wordt het als `WB-2026-001` getoond.
**Oplossing**: Genereer automatisch een werkbonnummer bij het aanmaken van een nieuw rapport (formaat: `WB-JJJJ-NNN`), gebaseerd op het aantal bestaande rapporten.

### 3. Wizard stappen gelijktrekken (app ↔ site)
**Probleem**: De website heeft 8 stappen (Voorbereiding, Gereedschap, Materiaal, Buitenunit, Binnenunit, Leidingwerk, Vacuüm & Vullen, Oplevering), de app heeft 7 andere stappen (Klant, Monteur, Apparatuur, Checklist, Meetwaarden, Foto's, Controle).
**Oplossing**: De mobiele wizard aanpassen naar dezelfde 8 stappen als de website, met dezelfde velden en checklists per stap. Foto's en controle/verzenden worden onderdeel van stap 8 (Oplevering).

### 4. Landkaart met actieve installaties
**Problossing**: Een interactieve kaart component maken met Leaflet (gratis, geen API key nodig) die installaties toont op basis van adresgegevens. Tonen op zowel het admin dashboard als in de BRL app.

## Aanpak (in volgorde)
1. Fix dubbele rapporten (mergeReports + createNewReport)
2. Auto werkbonnummer generatie
3. Wizard stappen herschrijven naar 8 stappen (matching website)
4. Landkaart component bouwen

**Let op**: Stap 3 is de grootste wijziging en raakt meerdere bestanden (brlTypes, BRLWizard, alle step components).
