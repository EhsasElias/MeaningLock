<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#070b12">
    <title>MeaningLock</title>
    @vite(['resources/js/app.js'])
</head>
<body style="margin:0;background:#070b12;">
    <div id="app"></div>
</body>
</html>
