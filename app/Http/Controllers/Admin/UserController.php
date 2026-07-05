<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response|JsonResponse
    {
        $users = User::query()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (User $user) => $user->toProfileArray());

        if ($request->wantsJson()) {
            return response()->json($users);
        }

        return Inertia::render('Admin/Users', [
            'users' => $users,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'display_name' => ['sometimes', 'string', 'min:2', 'max:255'],
            'role' => ['sometimes', 'in:user,admin'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        if ($user->id === $request->user()->id && ($validated['role'] ?? null) === 'user') {
            return response()->json(['message' => 'You cannot remove your own admin role.'], 422);
        }

        $user->update($validated);

        return response()->json($user->refresh()->toProfileArray());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account here.'], 422);
        }

        $user->delete();

        return response()->json(['success' => true]);
    }
}
