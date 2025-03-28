import { useState, useEffect, useRef } from 'react';

interface AuraPointsCounterProps {
  points: number;
  className?: string;
}

const AuraPointsCounter: React.FC<AuraPointsCounterProps> = ({ points, className = '' }) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPointsRef = useRef(points);
  
  // Only animate when points increase
  useEffect(() => {
    if (points > prevPointsRef.current) {
      animateCount(prevPointsRef.current, points);
    } else {
      setDisplayPoints(points);
    }
    prevPointsRef.current = points;
  }, [points]);
  
  const animateCount = (start: number, end: number) => {
    setIsAnimating(true);
    
    // Duration of animation in ms
    const duration = 1500;
    // Number of steps in the animation
    const steps = 60;
    // Calculate increment per step
    const increment = (end - start) / steps;
    // Calculate time per step
    const stepTime = duration / steps;
    
    let current = start;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += increment;
      
      if (step >= steps) {
        clearInterval(timer);
        setDisplayPoints(end);
        setIsAnimating(false);
      } else {
        setDisplayPoints(Math.floor(current));
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  };
  
  // Format the number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <span 
      className={`${className} ${isAnimating ? 'scale-110 transition-transform' : ''}`}
      style={{ display: 'inline-block' }}
    >
      {formatNumber(displayPoints)}
    </span>
  );
};

export default AuraPointsCounter; 