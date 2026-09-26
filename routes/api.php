<?php

use App\Http\Controllers\AgreementController;
use Illuminate\Support\Facades\Route;

Route::get('/agreements', [AgreementController::class, 'index']);
Route::post('/agreements', [AgreementController::class, 'store']);
Route::get('/agreements/{agreement}', [AgreementController::class, 'show']);
