import React, { useState, useEffect } from 'react';
import { Search, Brain, Type, CheckCircle } from 'lucide-react';

interface StreamingLoaderProps {
  isFirstMessage?: boolean;
  className?: string;
}

const StreamingLoader: React.FC<StreamingLoaderProps> = ({ 
  isFirstMessage = false, 
  className = "" 
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { 
      icon: Search, 
      text: "Searching our database...",
      duration: 1000 
    },
    { 
      icon: Brain, 
      text: "Processing your question...",
      duration: 800 
    },
    { 
      icon: Type, 
      text: "Generating response...",
      duration: 600 
    }
  ];

  useEffect(() => {
    if (!isFirstMessage) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, steps[currentStep]?.duration || 800);

    return () => clearTimeout(timer);
  }, [currentStep, isFirstMessage]);

  if (!isFirstMessage) {
    // Simple typing indicator for subsequent messages
    return (
      <div className={`flex items-center space-x-2 text-muted-foreground ${className}`}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
        <span className="text-sm">Thinking...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <div 
            key={index}
            className={`flex items-center space-x-3 transition-all duration-300 ${
              isActive ? 'text-primary' : 
              isCompleted ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            <div className="relative">
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
              )}
            </div>
            <span className={`text-sm font-medium ${
              isActive ? 'animate-pulse' : ''
            }`}>
              {step.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StreamingLoader;