<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $projects = $request->user()->projects()
            ->latest('updated_at')
            ->get(['id', 'name', 'description', 'updated_at']);

        return Inertia::render('Dashboard', [
            'projects' => $projects->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'updated_at' => $project->updated_at?->toISOString(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $project = $request->user()->projects()->create([
            ...$validated,
            'components' => [],
            'wires' => [],
            'code' => '',
        ]);

        return response()->json($project->toClientArray(), 201);
    }

    public function editor(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Editor', [
            'project' => $project->toClientArray(),
        ]);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json($project->toClientArray());
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'components' => ['sometimes', 'array'],
            'wires' => ['sometimes', 'array'],
            'code' => ['sometimes', 'nullable', 'string'],
            'is_public' => ['sometimes', 'boolean'],
        ]);

        $project->update($validated);

        return response()->json($project->refresh()->toClientArray());
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return response()->json(['success' => true]);
    }
}
