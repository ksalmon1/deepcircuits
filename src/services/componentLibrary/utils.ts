
import { ComponentLibraryItem } from "./types";

/**
 * Maps a database component record to our application model
 */
export const mapComponentFromDb = (dbComponent: any): ComponentLibraryItem => {
  // Log the mapping process for debugging
  console.log(`Mapping component from DB: ${dbComponent.name}, type=${dbComponent.type}, svgPath=${dbComponent.svg_path ? 'exists' : 'missing'}`);
  
  return {
    id: dbComponent.id,
    name: dbComponent.name,
    type: dbComponent.type,
    category: dbComponent.category,
    description: dbComponent.description,
    svgPath: dbComponent.svg_path, // Ensure this is correctly mapped
    enabled: dbComponent.enabled,
    isOriginal: dbComponent.is_original,
    createdAt: dbComponent.created_at,
    updatedAt: dbComponent.updated_at,
  };
};
