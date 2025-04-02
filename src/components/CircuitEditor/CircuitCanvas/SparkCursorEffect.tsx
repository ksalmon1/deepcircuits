import React from 'react';
import './SparkCursorEffect.css'; // We'll create this CSS file next

interface SparkCursorEffectProps {
  x: number;
  y: number;
}

const SparkCursorEffect: React.FC<SparkCursorEffectProps> = ({ x, y }) => {
  // Basic validation or default positioning if needed
  const validX = typeof x === 'number' && !isNaN(x) ? x : 0;
  const validY = typeof y === 'number' && !isNaN(y) ? y : 0;

  // Render multiple divs for a simple particle/spark effect
  return (
    <div 
      className="spark-cursor-container"
      style={{
        position: 'absolute',
        left: `${validX}px`,
        top: `${validY}px`,
        pointerEvents: 'none',
        zIndex: 1000, // Ensure it's above most other elements
        transform: 'translate(-50%, -50%)' // Center the effect on the cursor
      }}
    >
      {/* Remove the central core element */}
      {/* <div className="spark-core"></div> */}
      {/* Wrap each spark ray in a container for rotation */}
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
      <div className="spark-ray-wrapper"><div className="spark-ray"></div></div>
    </div>
  );
};

export default SparkCursorEffect; 