# جعبه ابزار (Toolset) — Proforma Invoice App

**Stack:** Vue 3 (Composition API, `<script setup>`) + Vite 8 + Pinia + Vue Router + Tailwind CSS 4 + jsPDF + html2canvas + TipTap + jsrsasign  
**Language:** Persian (fa-IR), RTL  
**Package manager:** npm (use `npm`, not `bun`)

---

## Commands (run from project root)

```bash
npm install          # install dependencies (run after cloning)
npm run dev          # start dev server at http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview the production build locally
```

**There are no test, lint, or typecheck scripts.** To verify changes, run `npm run dev` and test manually in the browser.

---

## Project structure

```
src/
├── main.js              # App entrypoint — mounts Vue, Pinia, Router
├── App.vue              # Root component — license modal + <router-view>
├── style.css            # Tailwind directives + all CSS variables and utility classes
├── router/index.js      # Routes: / (dashboard), /proforma (maker)
├── stores/invoice.js    # Pinia store — all invoice state + actions
├── composables/
│   ├── useLicense.js    # RSA-256 license verification (TSETMC time, anti-cheat)
│   ├── useExport.js     # Export to PDF/PNG/HTML/print
│   ├── useLocalStorage.js
│   └── useInvoiceCalculations.js
├── utils/
│   ├── invoiceTemplate.js  # HTML generation for invoice export
│   ├── publicKey.js        # RSA public key for license verification
│   ├── number-format.js    # Persian currency/word formatting
│   └── shamsi-date.js      # Jalali (Shamsi) date utilities
├── views/
│   ├── DashboardView.vue   # Home page with app cards
│   └── ProformaMaker.vue   # Main invoice editor (form + preview + history)
└── components/
    ├── forms/              # 7 form sub-components (Seller, Buyer, Items, etc.)
    ├── InvoicePreview.vue  # Live invoice preview
    ├── LicenseModal.vue    # License activation modal
    └── HistoryList.vue     # Saved invoices list
```

---

## How to work on this project (step by step for non-technical users)

### Running the app locally
1. Open **Terminal** (on macOS) or **Command Prompt** (on Windows)
2. Navigate to the project folder:
   ```bash
   cd /path/to/toolset
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL shown in terminal (usually `http://localhost:5173`) in your browser

### Making changes
- Edit files in `src/` — the browser auto-refreshes when you save
- **CSS changes:** Edit `src/style.css` for global styles, or use `<style scoped>` in `.vue` files
- **Adding a new page:** Add a route in `src/router/index.js`, create a view in `src/views/`, link it from the dashboard
- **Images go in:** `public/` folder (e.g., `public/logo.png` → accessible at `/logo.png`)
- **Fonts are in:** `public/fonts/` (IRANSansX .woff files)

### Fixing bugs
1. Run `npm run dev` and open the browser
2. Open **Browser DevTools** (right-click → Inspect or F12)
3. Check the **Console** tab for errors (red text)
4. Check the **Network** tab if something is not loading
5. Find the relevant file in `src/` and edit it

### Building for production
```bash
npm run build
```
The output goes to `dist/` — upload that folder to your web server.

---

## License system (important)

This app requires a valid license key to function. The license is verified offline using RSA-256 signatures.

- **Generating keys:** `node generate-key.js <phone_number> <days>`
  - Requires `private.key` in the project root (keep it secret!)
- **Public key for verification:** `src/utils/publicKey.js`
- **How it works:** The app fetches the current time from TSETMC (Iran stock exchange API) to prevent clock tampering. If the API is unreachable, it falls back to the device clock and checks for rollback attempts.
- **License stored in:** `localStorage` key `'lk'`
- **No license =** app redirects to the home page and shows the license modal

To test without a valid license key, you would need to generate one with the matching keypair. The placeholder public key in `publicKey.js` must be replaced with your real key for production.

---

## Data storage

All data is stored in the browser's `localStorage` (no server/backend):

| localStorage key | What it stores |
|---|---|
| `lk` | License key string |
| `lastSecureTime` | Last verified trusted timestamp |
| `domestic_proforma_invoices2` | Saved invoices array (JSON) |
| `domestic_default_seller2` | Default seller info |
| `domestic_dark` | Dark mode preference (`0` or `1`) |

**Clearing browser data will delete all invoices and license.** Always export backups (use the backup button in the app).

---

## Key conventions

- All UI text is in Persian (right-to-left)
- Currency: Rials (IRR) or Toman, with Persian word conversion
- Dates: Shamsi/Jalali calendar (e.g., `۱۴۰۴/۰۴/۱۱`)
- Components use PascalCase, files use kebab-case or PascalCase
- `@` path alias maps to `src/` (e.g., `@/stores/invoice`)
- Dark mode: toggled via `.dark` class on `<html>`, CSS variables in `:root` / `.dark`
- Invoice data is versioned: stored invoices use key `domestic_proforma_invoices2` (note the `2`)
