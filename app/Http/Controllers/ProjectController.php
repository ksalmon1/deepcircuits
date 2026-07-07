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

        // Public example projects (owned by anyone but the current user) are
        // offered to every user as ready-made starting points.
        $examples = Project::query()
            ->where('is_public', true)
            ->where('user_id', '!=', $request->user()->id)
            ->orderBy('created_at')
            ->get(['id', 'name', 'description', 'updated_at']);

        $toCard = fn (Project $project) => [
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'updated_at' => $project->updated_at?->toISOString(),
        ];

        return Inertia::render('Dashboard', [
            'projects' => $projects->map($toCard),
            'examples' => $examples->map($toCard),
        ]);
    }

    /**
     * Copy a project the user is allowed to view (their own or a public
     * example) into a new project they own and can edit freely.
     */
    public function clone(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $copy = $request->user()->projects()->create([
            'name' => $project->name,
            'description' => $project->description,
            'components' => $project->components ?? [],
            'wires' => $project->wires ?? [],
            'code' => $project->code ?? '',
            'is_public' => false,
        ]);

        return response()->json($copy->toClientArray(), 201);
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
