<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment('MeaningLock: hear the words, verify the meaning.');
})->purpose('Display a MeaningLock message');
