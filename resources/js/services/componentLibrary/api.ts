import { http } from '@/lib/http';
import { ComponentLibraryItem } from '@/types/component';

/**
 * Component library HTTP API. All shapes match the frontend
 * ComponentLibraryItem interface; the Laravel side serializes to it
 * directly (LibraryComponent::toClientArray), so no field mapping is
 * needed here.
 */

export async function getAllComponents(): Promise<ComponentLibraryItem[]> {
  const { data } = await http.get<ComponentLibraryItem[]>('/api/components');
  return data;
}

export async function getComponentById(id: string): Promise<ComponentLibraryItem | null> {
  const { data } = await http.get<ComponentLibraryItem>(`/api/components/${id}`);
  return data;
}

/** Detail fetch. The list endpoint already includes pins/properties, but
 *  callers that only hold an id still use this. */
export async function getComponentWithDetails(id: string): Promise<ComponentLibraryItem | null> {
  return getComponentById(id);
}

export async function createComponent(component: ComponentLibraryItem): Promise<string> {
  const { data } = await http.post<ComponentLibraryItem>('/api/components', component);
  return data.id as string;
}

export async function updateComponent(component: ComponentLibraryItem): Promise<void> {
  if (!component.id) {
    throw new Error('Cannot update a component without an id');
  }
  await http.put(`/api/components/${component.id}`, component);
}

export async function deleteComponent(componentId: string): Promise<void> {
  await http.delete(`/api/components/${componentId}`);
}
