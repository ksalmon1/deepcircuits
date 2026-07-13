import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import type { CircuitWarning, VerificationResult } from '@/simulation/verify/circuitVerifier';

interface CircuitVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: VerificationResult | null;
  /** Start the simulation despite the reported faults. */
  onRunAnyway: () => void;
}

const FindingRow = ({ finding }: { finding: CircuitWarning }) => (
  <li className="flex items-start gap-2 text-sm">
    {finding.severity === 'error' ? (
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
    ) : (
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
    )}
    <span>{finding.message}</span>
  </li>
);

/**
 * Pre-Run circuit check results. Shown when the one-shot SPICE verification
 * finds faults that would damage parts in a real circuit (short circuit, LED
 * overcurrent, …). The user can fix the circuit (Cancel) or run anyway.
 */
const CircuitVerificationModal = ({ open, onOpenChange, result, onRunAnyway }: CircuitVerificationModalProps) => {
  const errors = result?.errors ?? [];
  const warnings = result?.warnings ?? [];
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="circuit-verification-modal">
        <AlertDialogHeader>
          <AlertDialogTitle>Circuit check found problems</AlertDialogTitle>
          <AlertDialogDescription>
            These faults would damage parts in a real circuit. Fix them, or run the simulation anyway.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="max-h-60 space-y-2 overflow-y-auto">
          {errors.map((finding, idx) => (
            <FindingRow key={`e-${finding.componentId ?? idx}-${finding.code}`} finding={finding} />
          ))}
          {warnings.map((finding, idx) => (
            <FindingRow key={`w-${finding.componentId ?? idx}-${finding.code}`} finding={finding} />
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRunAnyway}>Run anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CircuitVerificationModal;
