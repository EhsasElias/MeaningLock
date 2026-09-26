# MeaningLock Challenge Replacement - Fixed

This is the challenge-only build. WhatsApp is not exposed.

This version also fixes:
- Agreement save date normalization (`October 10` -> `YYYY-MM-DD`)
- AgreementController syntax/validation

Replace these project folders:
- app
- bootstrap
- database
- resources
- routes

Do not replace `.env`, `vendor`, `node_modules`, `storage`, `public`, `composer.json`, `package.json`, or `vite.config.js`.

Then run:

```bash
composer dump-autoload
php artisan optimize:clear
php artisan migrate
npm run dev
```

In another terminal:

```bash
php artisan serve
```
