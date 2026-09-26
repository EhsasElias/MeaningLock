# MeaningLock complete replacement package

This package is designed to be copied over the project root and **overwrite the files included in this ZIP**.

It includes the complete MeaningLock feature set built so far:

- Live conversation
- Agreements
- WhatsApp
- Activity
- Reports
- Settings
- Fixed desktop/RTL/LTR sidebar
- AssemblyAI live streaming token route
- Agreement API + public verified agreement page
- Twilio WhatsApp webhook
- WhatsApp text and voice-note flow
- AssemblyAI transcription for WhatsApp voice notes

## Replace

Extract this ZIP, then copy these folders over your Laravel project root:

- `app`
- `config`
- `database`
- `resources`
- `routes`

Choose **Replace files in the destination** when Windows asks.

The ZIP contains complete versions of the MeaningLock files it needs, including `routes/api.php` and `routes/web.php`, so there is no manual route merging step.

## Do not replace

Do not replace your real `.env` with the example file. Copy only the new variables from `.env.whatsapp.example` into your existing `.env`.

Do not delete `vendor`, `node_modules`, `storage`, or your database.

## After replacement

Run:

```bash
php artisan optimize:clear
php artisan migrate
npm run dev
```

In another terminal:

```bash
php artisan serve
```

For WhatsApp voice-note jobs:

```bash
php artisan queue:work
```

Then verify:

```bash
php artisan route:list --path=agreement
php artisan route:list --path=whatsapp
php artisan migrate:status
```
