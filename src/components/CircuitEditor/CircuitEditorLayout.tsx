
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CircuitEditorPage from '@/pages/Editor/CircuitEditorPage';

const CircuitEditorLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  useEffect(() => {
    // Log the circuit ID for debugging
    console.log('Circuit Editor opened with ID:', id);
    
    // Set page title
    document.title = `Circuit #${id} | CircuitSim`;
    
    return () => {
      // Reset title on unmount
      document.title = 'CircuitSim';
    };
  }, [id]);
  
  return <CircuitEditorPage />;
};

export default CircuitEditorLayout;
