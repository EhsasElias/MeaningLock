<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#070b12">
    <title>MeaningLock — Verified Agreement</title>
    <style>
        *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:38px 18px;background:radial-gradient(circle at 50% 0,rgba(100,89,255,.13),transparent 28%),#070b12;color:#f7f9fc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:820px;margin:0 auto}.brand{display:flex;align-items:center;gap:12px;margin-bottom:26px}.logo{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:radial-gradient(circle at 30% 20%,#aaaaff,#5e63e9 42%,#272c6a);font-weight:900;box-shadow:0 16px 40px rgba(82,75,255,.24)}.brand strong{display:block;font-size:18px}.brand span{display:block;margin-top:3px;color:#64748b;font-size:11px}.card{overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:24px;background:linear-gradient(145deg,rgba(18,25,37,.96),rgba(9,14,22,.98));box-shadow:0 35px 100px rgba(0,0,0,.34)}.hero{padding:28px;display:flex;gap:14px;align-items:center;border-bottom:1px solid rgba(255,255,255,.05)}.check{width:52px;height:52px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:rgba(45,212,191,.09);border:1px solid rgba(45,212,191,.2);color:#99f6e4;font-size:22px;font-weight:900}.hero h1{margin:0;color:#ccfbf1;font-size:25px}.hero p{margin:6px 0 0;color:#708194;font-size:13px}.terms{padding:24px 28px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.term{padding:16px;border:1px solid rgba(255,255,255,.05);border-radius:13px;background:rgba(255,255,255,.02)}.term span,.term strong{display:block}.term span{color:#5b6b7e;font-size:10px;text-transform:uppercase;letter-spacing:.7px}.term strong{margin-top:8px;color:#eef5f8;font-size:17px}.confirmed{margin:0 28px;padding:20px 0;border-top:1px solid rgba(255,255,255,.05)}.confirmed>span{color:#607087;font-size:10px;text-transform:uppercase;letter-spacing:.7px}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.chip{padding:8px 11px;border-radius:999px;border:1px solid rgba(45,212,191,.12);background:rgba(45,212,191,.05);color:#99f6e4;font-size:10px}.meta{padding:18px 28px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.05);color:#5d6c80;font-size:10px}.meta b{color:#9ba8b8;font-weight:700}.actions{padding:18px 28px 28px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.actions button{min-height:44px;border-radius:11px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);color:#cbd5e1;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.actions button:first-child{border-color:rgba(45,212,191,.14);background:rgba(45,212,191,.055);color:#99f6e4}@media(max-width:600px){.terms,.actions{grid-template-columns:1fr}.hero,.terms,.meta,.actions{padding-left:18px;padding-right:18px}.confirmed{margin-left:18px;margin-right:18px}}@media print{body{padding:0;background:#fff;color:#111}.brand{color:#111}.card{box-shadow:none;border:1px solid #ddd;background:#fff}.hero h1,.term strong{color:#111}.actions{display:none}.term,.chip{background:#fff;border-color:#ddd;color:#111}.check{color:#07856f}}
    </style>
</head>
<body>
<div class="wrap">
    <div class="brand">
        <div class="logo">M</div>
        <div><strong>MeaningLock</strong><span>Agreement Intelligence</span></div>
    </div>

    <section class="card">
        <div class="hero">
            <div class="check">✓</div>
            <div>
                <h1>Verified Agreement</h1>
                <p>Both parties confirmed the same final terms.</p>
            </div>
        </div>

        <div class="terms">
            <div class="term"><span>Price</span><strong>{{ $agreement->price !== null ? '$'.number_format((float) $agreement->price, 2) : '—' }}</strong></div>
            <div class="term"><span>Quantity</span><strong>{{ $agreement->quantity !== null ? number_format((int) $agreement->quantity).' units' : '—' }}</strong></div>
            <div class="term"><span>Delivery</span><strong>{{ $agreement->delivery_date ? \Carbon\Carbon::parse($agreement->delivery_date)->format('F j, Y') : '—' }}</strong></div>
            <div class="term"><span>Installation</span><strong>{{ $agreement->installation ?: '—' }}</strong></div>
        </div>

        <div class="confirmed">
            <span>Confirmed by</span>
            <div class="chips">
                @if($agreement->speaker_a_confirmed)<span class="chip">✓ Speaker A</span>@endif
                @if($agreement->speaker_b_confirmed)<span class="chip">✓ Speaker B</span>@endif
            </div>
        </div>

        <div class="meta">
            <div>Agreement ID<br><b>{{ $agreement->public_id }}</b></div>
            <div>Verified<br><b>{{ optional($agreement->verified_at)->format('M j, Y · H:i') ?? '—' }}</b></div>
        </div>

        <div class="actions">
            <button type="button" onclick="window.print()">Print / Save PDF</button>
            <button type="button" id="copyButton" onclick="copyShareLink()">Copy Share Link</button>
        </div>
    </section>
</div>
<script>
async function copyShareLink(){const button=document.getElementById('copyButton');try{await navigator.clipboard.writeText(window.location.href);button.textContent='Copied ✓';setTimeout(()=>button.textContent='Copy Share Link',1800)}catch(e){window.prompt('Copy this link:',window.location.href)}}
</script>
</body>
</html>
