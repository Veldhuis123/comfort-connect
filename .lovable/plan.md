

## Probleem

De backend server crasht bij het opstarten door een **syntax fout in `upload.js`**. Bij de laatste beveiligingswijzigingen is er per ongeluk een dubbel `try` block ontstaan in de upload route (regel 64-113). De oude code bleef staan terwijl er nieuwe validatiecode bovenop werd geplakt.

Omdat de server niet eens opstart, werkt **geen enkel API endpoint** meer - inclusief `/api/auth/login`.

## Oplossing

### Stap 1: Fix `public/backend/routes/upload.js`

De upload route voor `/quote/:quoteId` bevat twee overlappende `try` blocks. De fix:

- Verwijder het dubbele `try` block (regels 84-87 zijn een herhaling van regels 64-68)
- Combineer de quote-verificatie logica met de bestaande upload-logica tot een enkel, correct `try/catch` block
- Behoud alle beveiligingsverbeteringen (rate limiting, quote verificatie, path traversal bescherming)

### Technisch detail

Huidige (kapotte) structuur:
```text
router.post('/quote/:quoteId', ... async (req, res) => {
  try {                          // <-- try block 1 (regel 65)
    // quote verificatie code
    // GEEN afsluitende } catch
  try {                          // <-- try block 2 (regel 84) - FOUT
    // originele upload code
  } catch {
  }
});
```

Correcte structuur:
```text
router.post('/quote/:quoteId', ... async (req, res) => {
  try {
    // quote verificatie
    // file upload en database insert
  } catch {
  }
});
```

Na deze fix start de server weer normaal op en kun je weer inloggen.

