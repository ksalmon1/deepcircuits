
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ComponentSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  uniqueCategories: string[];
  uniqueTypes: string[];
}

const ComponentSearch = ({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  typeFilter,
  onTypeFilterChange,
  uniqueCategories,
  uniqueTypes
}: ComponentSearchProps) => {
  return (
    <div className="mb-6 bg-white p-4 rounded-md shadow space-y-4">
      <div>
        <Label htmlFor="search" className="mb-2 block font-medium">Search Components</Label>
        <Input
          id="search"
          placeholder="Search by name, description, or type..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category-filter" className="mb-2 block font-medium">Filter by Category</Label>
          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger id="category-filter" className="max-w-xs">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="type-filter" className="mb-2 block font-medium">Filter by Type</Label>
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger id="type-filter" className="max-w-xs">
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default ComponentSearch;
