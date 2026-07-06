import React from 'react';
import { Head } from '@inertiajs/react';
import CircuitEditorLayout from '@/components/CircuitEditor/CircuitEditorLayout';
import { Project } from '@/services/projectsApi';

interface EditorProps {
  project: Project;
}

/**
 * Inertia page for /circuit-editor/{project}. CircuitEditorLayout mounts the
 * editor provider stack itself and fetches the project JSON by id
 * (GET /projects/{id}), same as before the Laravel migration.
 */
const Editor = ({ project }: EditorProps) => (
  <>
    <Head title={project.name} />
    <CircuitEditorLayout projectId={project.id} />
  </>
);

export default Editor;
