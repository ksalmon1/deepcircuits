
import componentRegistry from './registry';
import { wokwiRenderer } from './wokwiRenderer';
import { svgRenderer } from './svgRenderer';

// Register all renderers
componentRegistry.registerRenderer(wokwiRenderer);
componentRegistry.registerRenderer(svgRenderer);

// Export the registry
export { componentRegistry };
export default componentRegistry;
