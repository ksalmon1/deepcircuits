
import React from 'react';
import { CircuitEditorLayout } from './CircuitEditorLayout';

const CircuitEditorPage = () => {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <CircuitEditorLayout />
      </div>
    </div>
  );
};

export default CircuitEditorPage;
