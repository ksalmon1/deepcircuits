import { supabase } from './client'; // Assuming client is exported from client.ts
import { type Project } from './types'; // Assuming Project type covers the data structure

// Define the structure of the data we expect to save, matching the table columns
// We might need to adjust this based on the exact structure used in ProjectContext
interface ProjectSaveData {
    id: string; // Project UUID
    user_id: string; // User UUID
    name: string;
    description?: string | null;
    components?: any | null; // Using 'any' for now, refine if specific type exists
    wires?: any | null; // Using 'any' for now, refine if specific type exists
    code?: string | null;
    // created_at is handled by db default
    // updated_at should be updated automatically by db trigger or handled here if needed
    // is_public and thumbnail_url are not directly handled in this save function
}

// Define the structure for dashboard projects (can be simpler than full Project)
export interface DashboardProject {
  id: string;
  name: string;
  description?: string | null;
  updated_at: string; // Keep as string from Supabase
}

/**
 * Saves or updates a project in the Supabase 'projects' table.
 * Uses upsert to handle both inserting new projects and updating existing ones.
 * Assumes RLS policies are in place to handle permissions.
 *
 * @param projectData - The project data to save. Must include id and user_id.
 * @returns The saved project data or null if an error occurred.
 * @throws Error if the Supabase operation fails.
 */
export async function saveProjectToSupabase(projectData: ProjectSaveData): Promise<Project | null> {
    // Ensure essential fields are present
    if (!projectData.id || !projectData.user_id) {
        console.error("Error saving project: Project ID and User ID are required.");
        throw new Error("Project ID and User ID are required for saving.");
    }

    // Explicitly set updated_at to the current time
    const dataToSave = {
        ...projectData,
        updated_at: new Date().toISOString(), // Ensure updated_at is set
    };


    const { data, error } = await supabase
        .from('projects')
        .upsert(dataToSave, { onConflict: 'id' }) // Upsert based on the project ID
        .select() // Select the inserted/updated row
        .single(); // Expect a single row back


    if (error) {
        console.error('Error saving project to Supabase:', error);
        throw new Error(`Supabase save error: ${error.message}`);
    }

    console.log('Project saved successfully:', data);
    return data as Project | null; // Cast might be needed depending on Supabase client version/types
}

/**
 * Fetches a single project from the Supabase 'projects' table by its ID.
 * Assumes RLS policies are in place to ensure the user can only fetch their own projects.
 *
 * @param projectId - The UUID of the project to fetch.
 * @returns The project data including components, wires, and code, or null if not found or error occurs.
 * @throws Error if the Supabase operation fails.
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
    if (!projectId) {
        console.error("Error fetching project: Project ID is required.");
        throw new Error("Project ID is required for fetching.");
    }

    const { data, error } = await supabase
        .from('projects')
        .select(`
            id,
            user_id,
            name,
            description,
            components,
            wires,
            code,
            created_at,
            updated_at,
            is_public,
            thumbnail_url
        `)
        .eq('id', projectId)
        .single(); // Expect a single project or null/error

    if (error) {
        if (error.code === 'PGRST116') { // PostgREST error code for "Resource Not Found"
             console.warn(`Project with ID ${projectId} not found.`);
             return null; // Or throw a specific "Not Found" error if preferred
        } else {
            console.error('Error fetching project from Supabase:', error);
            throw new Error(`Supabase fetch error: ${error.message}`);
        }
    }

    console.log('Project fetched successfully:', data);
    // Ensure components, wires, and code are initialized if null in DB
    return {
        ...data,
        components: data?.components ?? [],
        wires: data?.wires ?? [],
        code: data?.code ?? '' // Provide a default empty string for code if null
    } as Project | null;
}

/**
 * Fetches all projects for a given user from the Supabase 'projects' table.
 * Only selects fields needed for the dashboard view.
 * Orders projects by updated_at descending.
 * Assumes RLS policies restrict results to the specified user_id.
 *
 * @param userId - The UUID of the user whose projects to fetch.
 * @returns An array of DashboardProject objects or throws an error.
 * @throws Error if userId is missing or if the Supabase operation fails.
 */
export async function getDashboardProjectsByUserId(userId: string): Promise<DashboardProject[]> {
    if (!userId) {
        console.error("Error fetching dashboard projects: User ID is required.");
        throw new Error("User ID is required for fetching dashboard projects.");
    }

    const { data, error } = await supabase
        .from('projects')
        .select(`
            id,
            name,
            description,
            updated_at
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }); // Order by most recently updated

    if (error) {
        console.error('Error fetching dashboard projects from Supabase:', error);
        throw new Error(`Supabase fetch error: ${error.message}`);
    }

    console.log('Dashboard projects fetched successfully for user:', userId, data);
    return data || []; // Return fetched data or an empty array if null
}

/**
 * Deletes a project from the Supabase 'projects' table by its ID.
 * Assumes RLS policies are in place to ensure the user can only delete their own projects.
 *
 * @param projectId - The UUID of the project to delete.
 * @returns Promise<void> - Resolves if deletion is successful, throws error otherwise.
 * @throws Error if projectId is missing or if the Supabase operation fails.
 */
export async function deleteProjectById(projectId: string): Promise<void> {
    if (!projectId) {
        console.error("Error deleting project: Project ID is required.");
        throw new Error("Project ID is required for deletion.");
    }

    console.log('Attempting to delete project with ID:', projectId);

    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (error) {
        console.error('Error deleting project from Supabase:', error);
        throw new Error(`Supabase delete error: ${error.message}`);
    }

    console.log('Project deleted successfully from Supabase:', projectId);
    // No data is typically returned on delete, so we just check for errors.
}

/**
 * Creates a new project record in the Supabase 'projects' table.
 *
 * @param projectId - The client-generated UUID for the new project.
 * @param userId - The UUID of the user creating the project.
 * @param name - The initial name for the project.
 * @returns The newly created project data or null if an error occurred.
 * @throws Error if required IDs/name are missing or if the Supabase operation fails.
 */
export async function createProject(projectId: string, userId: string, name: string): Promise<Project | null> {
    if (!projectId || !userId || !name) {
        console.error("Error creating project: Project ID, User ID, and Name are required.");
        throw new Error("Project ID, User ID, and Name are required for creation.");
    }

    console.log(`Attempting to create project: ${name} (ID: ${projectId}) for user: ${userId}`);

    const newProjectData = {
        id: projectId,
        user_id: userId,
        name: name,
        description: null, // Default values
        components: [],
        wires: [],
        code: '// Start coding your circuit!\nvoid setup() {\n  \n}\n\nvoid loop() {\n  \n}', 
        is_public: false,
        thumbnail_url: null,
        // created_at and updated_at will be handled by the database defaults/triggers
    };

    const { data, error } = await supabase
        .from('projects')
        .insert(newProjectData)
        .select() // Select the inserted row
        .single(); // Expect a single row back

    if (error) {
        console.error('Error creating project in Supabase:', error);
        throw new Error(`Supabase create error: ${error.message}`);
    }

    console.log('Project created successfully in Supabase:', data);
    return data as Project | null;
} 