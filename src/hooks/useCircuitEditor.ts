
import { useCircuitEditor as useCircuitEditorContext } from '@/context/CircuitEditorContext';

/**
 * Hook for accessing the circuit editor state and actions
 * This is now just a re-export of the context hook
 */
export function useCircuitEditor() {
  return useCircuitEditorContext();
}

export default useCircuitEditor;
