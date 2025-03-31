Implementation Plan for CircuitSim Architecture Improvement
1. Type System Refactoring
The most critical issue is the inconsistent type system between WokwiComponent and ComponentLibraryItem. This causes confusion and type errors throughout the codebase.

1.1. Create a Unified Type System
Create a new file src/types/components.ts with clearly defined interfaces:

BaseComponent - Common properties shared by all component types
ComponentLibraryItem - Components as stored in the library
CircuitComponent - Components as used in the circuit (with position)
Clear type conversion functions between these types
Replace the inconsistent type usage in:

src/integrations/wokwi/WokwiIntegration.ts
src/services/componentLibrary/types.ts
src/types/circuit.ts
1.2. Update Type Conversion Functions
Create consistent conversion functions:

libraryItemToCircuitComponent
circuitComponentToNode
nodeToCircuitComponent
2. Service Layer Reorganization
The service layer has duplicate functionality and is inconsistently structured.

2.1. Refactor Component Library Service
Split componentLibraryService.ts into separate files:

src/services/componentLibrary/index.ts - Main exports
src/services/componentLibrary/queries.ts - Read operations
src/services/componentLibrary/mutations.ts - Write operations
src/services/componentLibrary/converters.ts - Type conversion functions
Ensure consistent error handling and return types across all service functions.

2.2. Separate Domain Logic
Create src/domain/component.ts for domain-specific component operations:

Component validation
Component property calculations
Component-specific business rules
Move component-specific logic from services and hooks into this domain layer.

3. Custom Component Integration
The custom component integration is fragmented across multiple files.

3.1. Consolidate Custom Component Logic
Create a unified custom component management system:

src/integrations/components/registry.ts - Component registry
src/integrations/components/renderer.ts - Component rendering
src/integrations/components/factories.ts - Component creation
Make rendering system pluggable to support different component types:

Wokwi components
SVG-based custom components
Future component types
3.2. Component Registry Improvement
Create a central registry system for components:
Track all registered components
Provide type-safe access to component configs
Support plugin-based extensions
4. State Management Consolidation
The state management for the circuit editor is spread across multiple hooks.

4.1. Create a Circuit Editor Context
Implement a context-based state management system:

src/context/CircuitEditorContext.tsx - Central state provider
Consolidate state from disparate hooks:
useCircuitEditor
useCircuitCanvasState
useComponentLibrary (partial)
Refactor components to use this context.

4.2. Separate UI State from Domain State
Split state management concerns:
Circuit domain state - Components, connections, properties
UI state - Visibility, selections, active tools
5. Component Structure Improvements
The component hierarchy is complex with unclear boundaries.

5.1. Reorganize Component Folder Structure
Create a clearer component folder structure:
src/components/
  circuit/
    editor/        - Main editor components
    canvas/        - Canvas-specific components
    nodes/         - Node-specific components
    wires/         - Wire-specific components
    properties/    - Property editing components
  library/         - Component library
  shared/          - Shared UI components
5.2. Break Down Large Components
Split CircuitCanvas.tsx into smaller sub-components:
CanvasContainer.tsx
CanvasToolbar.tsx
NodeRenderer.tsx
WireRenderer.tsx
6. Error Handling Improvement
Error handling is inconsistent across the codebase.

6.1. Create a Consistent Error Handling System
Implement standardized error handling:
src/utils/errorHandling.ts - Error utilities
Standard error types for different kinds of errors
Consistent error reporting
6.2. Add Error Boundaries
Add React Error Boundaries around key components:
Circuit editor
Component panels
Individual components
7. Code Duplication Elimination
Several areas have duplicated code that should be extracted.

7.1. Create Shared Utilities
Extract common utilities:
Pin handling functions
SVG processing functions
Component conversion functions
7.2. DRY Repeated Logic
Remove duplicate logic in:
Component loading across hooks
Event handling in CircuitCanvas
Type conversion in multiple files
8. Testing Infrastructure
Testing is absent or minimal in the codebase.

8.1. Add Testing Framework
Set up testing infrastructure:
Unit testing for core domain logic
Component testing for UI components
Mock services for Supabase interactions
8.2. Add Key Tests
Start with critical tests for:
Component conversion
Circuit state management
Component rendering
9. Documentation and Standards
Documentation is sparse and inconsistent.

9.1. Add Documentation
Add comprehensive documentation:
README files in key directories
JSDoc comments for critical functions
API documentation for service layer
9.2. Establish Coding Standards
Create coding standards for:
File organization
Naming conventions
Import ordering
Component structure
Implementation Steps in Order of Priority
Type System Refactoring (Weeks 1-2) - This is the foundation for all other improvements

Create unified type system
Update type conversion functions
Fix type errors throughout codebase
Service Layer Reorganization (Weeks 2-3) - Clean up the data access layer

Refactor component library service
Create domain-specific component operations
State Management Consolidation (Weeks 3-4) - Improve state handling

Implement circuit editor context
Separate UI state from domain state
Custom Component Integration (Weeks 4-5) - Better component rendering

Consolidate custom component logic
Improve component registry
Component Structure Improvements (Weeks 5-6) - Clean up UI code

Reorganize component folder structure
Break down large components
Error Handling Improvement (Week 6) - Make the app more robust

Create consistent error handling
Add error boundaries
Code Duplication Elimination (Week 7) - Remove redundancy

Extract common utilities
Eliminate repeated logic
