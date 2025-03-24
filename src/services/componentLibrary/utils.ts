
import { ComponentLibraryItem } from "./types";

/**
 * Maps a database component record to our application model
 */
export const mapComponentFromDb = (dbComponent: any): ComponentLibraryItem => {
  return {
    id: dbComponent.id,
    name: dbComponent.name,
    type: dbComponent.type,
    category: dbComponent.category,
    description: dbComponent.description,
    svgPath: dbComponent.svg_path,
    enabled: dbComponent.enabled,
    isOriginal: dbComponent.is_original,
    createdAt: dbComponent.created_at,
    updatedAt: dbComponent.updated_at,
  };
};
