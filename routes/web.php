<?php

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\ComponentLibraryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SketchCompileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public marketing pages
Route::get('/', fn () => Inertia::render('Index'))->name('home');
Route::get('/about', fn () => Inertia::render('About'))->name('about');
Route::get('/features', fn () => Inertia::render('Features'))->name('features');
Route::get('/pricing', fn () => Inertia::render('Pricing'))->name('pricing');

// Component library is readable by any authenticated user
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [ProjectController::class, 'index'])->name('dashboard');

    // Circuit editor page + project JSON API
    Route::get('/circuit-editor/{project}', [ProjectController::class, 'editor'])->name('projects.editor');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::post('/projects/{project}/clone', [ProjectController::class, 'clone'])->name('projects.clone');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    Route::get('/api/components', [ComponentLibraryController::class, 'index'])->name('components.index');
    Route::get('/api/components/{component}', [ComponentLibraryController::class, 'show'])->name('components.show');

    // Local sketch compilation (arduino-cli on this server; code stays local)
    Route::post('/api/compile', [SketchCompileController::class, 'compile'])->name('sketch.compile');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Admin area
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/admin', fn () => Inertia::render('Admin/Index'))->name('admin.index');
    Route::get('/admin/system', fn () => Inertia::render('Admin/System'))->name('admin.system');
    Route::get('/admin/database', fn () => Inertia::render('Admin/Database'))->name('admin.database');
    Route::get('/admin/components', fn () => Inertia::render('Admin/Components'))->name('admin.components');

    Route::get('/admin/users', [UserController::class, 'index'])->name('admin.users');
    Route::patch('/admin/users/{user}', [UserController::class, 'update'])->name('admin.users.update');
    Route::delete('/admin/users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');

    Route::post('/api/components', [ComponentLibraryController::class, 'store'])->name('components.store');
    Route::put('/api/components/{component}', [ComponentLibraryController::class, 'update'])->name('components.update');
    Route::delete('/api/components/{component}', [ComponentLibraryController::class, 'destroy'])->name('components.destroy');
});

require __DIR__.'/auth.php';
