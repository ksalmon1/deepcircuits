import { http } from '@/lib/http';
import { CircuitComponent } from '@/types/component';
import { WireEdge } from '@/types/circuit';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  components: CircuitComponent[];
  wires: WireEdge[];
  code?: string | null;
  is_public?: boolean;
  thumbnail_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardProject {
  id: string;
  name: string;
  description?: string | null;
  updated_at: string;
}

interface ProjectSaveData {
  id: string;
  name: string;
  description?: string | null;
  components?: CircuitComponent[];
  wires?: WireEdge[];
  code?: string | null;
}

/** Persist the current editor state for an existing project. */
export async function saveProject(projectData: ProjectSaveData): Promise<Project> {
  const { id, ...payload } = projectData;
  const { data } = await http.put<Project>(`/projects/${id}`, payload);
  return data;
}

/** Fetch a single project (owner or public). */
export async function getProjectById(projectId: string): Promise<Project | null> {
  const { data } = await http.get<Project>(`/projects/${projectId}`);
  return data;
}

/** Create a new, empty project and return it. */
export async function createProject(name: string, description?: string): Promise<Project> {
  const { data } = await http.post<Project>('/projects', { name, description });
  return data;
}

/** Delete a project owned by the current user. */
export async function deleteProject(projectId: string): Promise<void> {
  await http.delete(`/projects/${projectId}`);
}
