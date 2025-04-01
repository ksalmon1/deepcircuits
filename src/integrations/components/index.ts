import { componentRegistry } from './ComponentRegistry';
import { svgRenderer } from './svgRenderer';

// Register renderers
componentRegistry.registerRenderer(svgRenderer);

// Export the registry
export { componentRegistry };
export default componentRegistry;
