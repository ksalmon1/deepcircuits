import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, Code, Plus, X, HelpCircle, Lightbulb, ZapIcon, RefreshCcw, AlertTriangle, AlertCircle, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AnimationPropertiesEditorProps {
  properties: Record<string, any>;
  onChange: (properties: Record<string, any>) => void;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  svgPath?: string; // Add property to receive SVG path from parent component
}

const AnimationPropertiesEditor: React.FC<AnimationPropertiesEditorProps> = ({
  properties,
  onChange,
  errorMessage,
  setErrorMessage,
  svgPath
}) => {
  const [newAnimatableElementId, setNewAnimatableElementId] = useState('');
  const [newAnimatableElementProperty, setNewAnimatableElementProperty] = useState('fill');
  const [newStateKey, setNewStateKey] = useState('');
  const [newStateValue, setNewStateValue] = useState('');
  const [newStateRule, setNewStateRule] = useState('');
  const [newStateRuleExpression, setNewStateRuleExpression] = useState('');
  const [activeTab, setActiveTab] = useState<string>("setup"); // Default to setup tab
  const [availableElementIds, setAvailableElementIds] = useState<string[]>([]);
  const [isLoadingElementIds, setIsLoadingElementIds] = useState(false);
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('animationEditorMode') || 'wizard';
    }
    return 'wizard';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('animationEditorMode', mode);
    }
  }, [mode]);

  // Wizard step state
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState<number | null>(null);
  const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
  const [selectedRuleKey, setSelectedRuleKey] = useState<string | null>(null);

  const [newPropertyStateInputs, setNewPropertyStateInputs] = useState<Record<number, { key: string; value: string }>>({});

  // Helper: determine wizard progress
  const hasElements = Object.keys(properties.animatableElements || {}).length > 0;
  const firstElementId = hasElements ? Object.keys(properties.animatableElements)[0] : '';
  const hasProperty = hasElements && (properties.animatableElements[firstElementId]?.properties?.length > 0);
  const hasState = hasProperty && Object.keys(properties.animatableElements[firstElementId].properties[0].states || {}).length > 0;
  const hasRule = properties.stateRules && Object.keys(properties.stateRules).length > 0;

  const fetchSvgElementIds = useCallback(async () => {
    if (!svgPath) {
      setAvailableElementIds([]);
      return;
    }

    setIsLoadingElementIds(true);
    
    try {
      let svgContent = '';
      
      // Check if svgPath contains SVG content directly
      if (typeof svgPath === 'string' && 
          (svgPath.trim().startsWith('<svg') || 
           svgPath.trim().startsWith('&lt;svg'))) {
        // SVG content is provided directly
        console.log('Using direct SVG content');
        svgContent = svgPath;
        
        // Handle HTML encoded SVG
        if (svgPath.includes('&lt;')) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = svgPath;
          svgContent = tempDiv.textContent || '';
        }
      } else {
        // SVG path is provided, try to fetch it
        console.log('Fetching SVG from path:', svgPath);
        const response = await fetch(svgPath);
        svgContent = await response.text();
      }
      
      // Parse SVG content to find elements with ID
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = svgContent;
      
      const svgElement = tempDiv.querySelector('svg');
      if (!svgElement) {
        console.error('No SVG element found in content');
        setAvailableElementIds([]);
        setIsLoadingElementIds(false);
        return;
      }
      
      // Find all elements with ID attribute
      const elementsWithId = svgElement.querySelectorAll('[id]');
      const ids = Array.from(elementsWithId).map(el => el.id);
      
      console.log('Found SVG elements with IDs:', ids);
      setAvailableElementIds(ids);
    } catch (error) {
      console.error('Error fetching or parsing SVG:', error);
      setAvailableElementIds([]);
    } finally {
      setIsLoadingElementIds(false);
    }
  }, [svgPath]);

  // Fetch element IDs when component mounts or svgPath changes
  useEffect(() => {
    if (svgPath) {
      fetchSvgElementIds();
    }
  }, [svgPath]);

  // Add new animatable element
  const handleAddAnimatableElement = () => {
    if (!newAnimatableElementId.trim()) {
      setErrorMessage('Element ID cannot be empty');
      return;
    }

    const currentElements = properties.animatableElements || {};
    
    onChange({
      ...properties,
      animatableElements: {
        ...currentElements,
        [newAnimatableElementId]: {
          properties: [{ name: newAnimatableElementProperty, states: {} }],
          transition: 'all 0.3s ease'
        }
      }
    });

    setNewAnimatableElementId('');
    setNewAnimatableElementProperty('fill');
    setErrorMessage(null);
  };

  // Add a new property to an element
  const handleAddPropertyToElement = (elementId) => {
    const currentElements = properties.animatableElements || {};
    const element = currentElements[elementId];
    
    if (!element) return;
    
    onChange({
      ...properties,
      animatableElements: {
        ...currentElements,
        [elementId]: {
          ...element,
          properties: [
            ...(element.properties || []),
            { name: 'fill', states: {} }
          ]
        }
      }
    });
  };

  // Remove property from element
  const handleRemoveProperty = (elementId, propertyIndex) => {
    const currentElements = properties.animatableElements || {};
    const element = currentElements[elementId];
    
    if (!element || !element.properties) return;
    
    const newProperties = [...element.properties];
    newProperties.splice(propertyIndex, 1);
    
    onChange({
      ...properties,
      animatableElements: {
        ...currentElements,
        [elementId]: {
          ...element,
          properties: newProperties
        }
      }
    });
  };

  // Change property name
  const handleChangePropertyName = (elementId, propertyIndex, newName) => {
    const currentElements = properties.animatableElements || {};
    const element = currentElements[elementId];
    
    if (!element || !element.properties) return;
    
    const newProperties = [...element.properties];
    newProperties[propertyIndex] = {
      ...newProperties[propertyIndex],
      name: newName
    };
    
    onChange({
      ...properties,
      animatableElements: {
        ...currentElements,
        [elementId]: {
          ...element,
          properties: newProperties
        }
      }
    });
  };

  // Add state to animatable element property
  const handleAddElementPropertyState = (elementId: string, propertyIndex: number) => {
    const currentInputs = newPropertyStateInputs[propertyIndex] || { key: '', value: '' };
    const stateKey = currentInputs.key.trim();
    const stateValue = currentInputs.value; // Allow empty values potentially?

    if (!stateKey) {
      setErrorMessage('State name cannot be empty');
      return;
    }

    const currentElements = properties.animatableElements || {};
    const element = currentElements[elementId];
    
    if (!element || !element.properties || !element.properties[propertyIndex]) return;
    
    const newProperties = [...element.properties];
    newProperties[propertyIndex] = {
      ...newProperties[propertyIndex],
      states: {
        ...(newProperties[propertyIndex].states || {}), // Ensure states exists
        [stateKey]: stateValue
      }
    };
    
    onChange({
      ...properties,
      animatableElements: {
        ...currentElements,
        [elementId]: {
          ...element,
          properties: newProperties
        }
      }
    });

    // Clear the input fields for this specific property index
    setNewPropertyStateInputs(prev => ({ 
      ...prev, 
      [propertyIndex]: { key: '', value: '' } 
    }));
    setErrorMessage(null); // Clear global error message
  };

  // Remove state from animatable element property
  const handleRemoveElementPropertyState = (elementId, propertyIndex, stateKey) => {
    const currentElements = properties.animatableElements || {};
    const element = currentElements[elementId];
    
    if (!element || !element.properties || !element.properties[propertyIndex]) return;
    
    const property = element.properties[propertyIndex];
    const newStates = { ...property.states };
    delete newStates[stateKey];
    
    const newProperties = [...element.properties];
    newProperties[propertyIndex] = {
      ...property,
      states: newStates
    };
    
    onChange({
      ...properties,
      animatableElements: {
        ...currentElements,
        [elementId]: {
          ...element,
          properties: newProperties
        }
      }
    });
  };

  // Remove animatable element
  const handleRemoveAnimatableElement = (elementId: string) => {
    const currentElements = properties.animatableElements || {};
    const newElements = { ...currentElements };
    delete newElements[elementId];
    
    onChange({
      ...properties,
      animatableElements: newElements
    });
  };

  // Add new state rule
  const handleAddStateRule = () => {
    if (!newStateRule.trim()) {
      setErrorMessage('State name cannot be empty');
      return;
    }

    if (!newStateRuleExpression.trim()) {
      setErrorMessage('Rule expression cannot be empty');
      return;
    }

    const currentRules = properties.stateRules || {};
    
    onChange({
      ...properties,
      stateRules: {
        ...currentRules,
        [newStateRule]: newStateRuleExpression
      }
    });

    setNewStateRule('');
    setNewStateRuleExpression('');
    setErrorMessage(null);
  };

  // Remove state rule
  const handleRemoveStateRule = (stateKey: string) => {
    const currentRules = properties.stateRules || {};
    const newRules = { ...currentRules };
    delete newRules[stateKey];
    
    onChange({
      ...properties,
      stateRules: newRules
    });
  };

  const hasAnimationProperties = 
    properties.animatableElements !== undefined || 
    properties.stateRules !== undefined;

  // Create animation properties if they don't exist yet
  const initializeAnimationProperties = () => {
    if (!properties.animatableElements && !properties.stateRules) {
      onChange({
        ...properties,
        animatableElements: {},
        stateRules: {}
      });
    } else if (!properties.animatableElements) {
      onChange({
        ...properties,
        animatableElements: {}
      });
    } else if (!properties.stateRules) {
      onChange({
        ...properties,
        stateRules: {}
      });
    }
  };

  // Helper: get all elements, properties, states, rules
  const animatableElements = properties.animatableElements || {};
  const elementIds = Object.keys(animatableElements);
  const selectedElement = selectedElementId ? animatableElements[selectedElementId] : null;
  const selectedProperty = (selectedElement && selectedPropertyIndex !== null)
    ? selectedElement.properties[selectedPropertyIndex]
    : null;
  const allRules = properties.stateRules || {};

  // Navigation helpers
  const goToNextStep = () => setWizardStep(wizardStep + 1);
  const goToPrevStep = () => setWizardStep(wizardStep - 1);

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-4 mb-2">
        <span className="text-lg font-semibold">Animation Setup</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Mode:</span>
          <Button
            variant={mode === 'wizard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setMode('wizard'); setWizardStep(1); }}
          >
            Simple Wizard
          </Button>
          <Button
            variant={mode === 'advanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('advanced')}
          >
            Advanced
          </Button>
        </div>
      </div>
      {mode === 'wizard' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ZapIcon className="h-5 w-5 text-yellow-500" />
              Easy Animation Wizard
            </CardTitle>
            <CardDescription>
              Set up your animation step by step. You can add as many elements, properties, states, and rules as you like. Switch to Advanced mode anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Step 1: Elements */}
              {wizardStep === 1 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 1: What do you want to animate?</h3>
                  <p className="text-sm text-gray-600 mb-4">Add one or more SVG elements (by ID) to animate. For example, the body of an LED or a needle on a gauge.</p>
                  <div className="mb-4">
                    {elementIds.length === 0 && <div className="text-xs text-gray-500 mb-2">No elements added yet.</div>}
                    {elementIds.map(id => (
                      <div key={id} className="flex items-center gap-2 mb-2">
                        <Badge>{id}</Badge>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedElementId(id); setWizardStep(2); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const newElements = { ...animatableElements };
                          delete newElements[id];
                          onChange({ ...properties, animatableElements: newElements });
                          if (selectedElementId === id) setSelectedElementId(null);
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-end">
                    <Select 
                      value={newAnimatableElementId} 
                      onValueChange={setNewAnimatableElementId}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select an element ID" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableElementIds.map(id => (
                          <SelectItem key={id} value={id}>{id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAddAnimatableElement}
                      disabled={!newAnimatableElementId.trim()}
                    >
                      Add Element
                    </Button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {elementIds.length > 0 && <Button onClick={goToNextStep}>Next: Properties</Button>}
                  </div>
                </div>
              )}
              {/* Step 2: Properties */}
              {wizardStep === 2 && selectedElementId && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 2: What about <span className='font-mono'>{selectedElementId}</span> do you want to animate?</h3>
                  <p className="text-sm text-gray-600 mb-4">Add one or more CSS properties to animate for this element.</p>
                  <div className="mb-4">
                    {(selectedElement?.properties?.length === 0) && <div className="text-xs text-gray-500 mb-2">No properties added yet.</div>}
                    {(selectedElement?.properties || []).map((prop, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <Badge>{prop.name}</Badge>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedPropertyIndex(idx); setWizardStep(3); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const newProps = [...selectedElement.properties];
                          newProps.splice(idx, 1);
                          onChange({
                            ...properties,
                            animatableElements: {
                              ...animatableElements,
                              [selectedElementId]: {
                                ...selectedElement,
                                properties: newProps
                              }
                            }
                          });
                          if (selectedPropertyIndex === idx) setSelectedPropertyIndex(null);
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-end">
                    <Select
                      value={newAnimatableElementProperty}
                      onValueChange={setNewAnimatableElementProperty}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fill">fill (color)</SelectItem>
                        <SelectItem value="stroke">stroke (outline)</SelectItem>
                        <SelectItem value="stroke-width">stroke-width (thickness)</SelectItem>
                        <SelectItem value="opacity">opacity (transparency)</SelectItem>
                        <SelectItem value="filter">filter (effects like glow)</SelectItem>
                        <SelectItem value="transform">transform (movement)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleAddPropertyToElement(selectedElementId)}
                    >
                      Add Property
                    </Button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={goToPrevStep}>Back</Button>
                    {(selectedElement?.properties?.length > 0) && <Button onClick={goToNextStep}>Next: States</Button>}
                  </div>
                </div>
              )}
              {/* Step 3: States */}
              {wizardStep === 3 && selectedElementId && selectedPropertyIndex !== null && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 3: What states should <span className='font-mono'>{selectedElementId}</span>'s <span className='font-mono'>{selectedProperty?.name}</span> have?</h3>
                  <p className="text-sm text-gray-600 mb-4">Add one or more states for this property (e.g., "on", "off").</p>
                  <div className="mb-4">
                    {(!selectedProperty || Object.keys(selectedProperty.states || {}).length === 0) && <div className="text-xs text-gray-500 mb-2">No states added yet.</div>}
                    {selectedProperty && Object.entries(selectedProperty.states || {}).map(([state, value]) => (
                      <div key={state} className="flex items-center gap-2 mb-2">
                        <Badge>{`${state}: ${String(value)}`}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const newStates = { ...selectedProperty.states };
                          delete newStates[state];
                          const newProps = [...selectedElement.properties];
                          newProps[selectedPropertyIndex] = {
                            ...selectedProperty,
                            states: newStates
                          };
                          onChange({
                            ...properties,
                            animatableElements: {
                              ...animatableElements,
                              [selectedElementId]: {
                                ...selectedElement,
                                properties: newProps
                              }
                            }
                          });
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-end">
                    <Input
                      placeholder="State name (e.g., on, off)"
                      value={newStateKey}
                      onChange={e => setNewStateKey(e.target.value)}
                      className="w-40"
                    />
                    <Input
                      placeholder="Value (e.g., #ff0000, 0.8)"
                      value={newStateValue}
                      onChange={e => setNewStateValue(e.target.value)}
                      className="w-40"
                    />
                    <Button
                      onClick={() => handleAddElementPropertyState(selectedElementId, selectedPropertyIndex)}
                      disabled={!newStateKey.trim() || !newStateValue.trim()}
                    >
                      Add State
                    </Button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={goToPrevStep}>Back</Button>
                    {(selectedProperty && Object.keys(selectedProperty.states || {}).length > 0) && <Button onClick={goToNextStep}>Next: Rules</Button>}
                  </div>
                </div>
              )}
              {/* Step 4: Rules */}
              {wizardStep === 4 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 4: When should each state be active?</h3>
                  <p className="text-sm text-gray-600 mb-4">Add rules to control when each state is active. For example, "on" when <code>{'voltage > 1.7'}</code>.</p>
                  <div className="mb-4">
                    {Object.keys(allRules).length === 0 && <div className="text-xs text-gray-500 mb-2">No rules added yet.</div>}
                    {Object.entries(allRules).map(([state, rule]) => (
                      <div key={state} className="flex items-center gap-2 mb-2">
                        <Badge>{`${state}: ${String(rule)}`}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const newRules = { ...allRules };
                          delete newRules[state];
                          onChange({ ...properties, stateRules: newRules });
                        }}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 items-end">
                    <Input
                      placeholder="State name (e.g., on)"
                      value={newStateRule}
                      onChange={e => setNewStateRule(e.target.value)}
                      className="w-40"
                    />
                    <Input
                      placeholder={`Rule (e.g., voltage ${'>'} 1.7)`}
                      value={newStateRuleExpression}
                      onChange={e => setNewStateRuleExpression(e.target.value)}
                      className="w-40"
                    />
                    <Button
                      onClick={handleAddStateRule}
                      disabled={!newStateRule.trim() || !newStateRuleExpression.trim()}
                    >
                      Add Rule
                    </Button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={goToPrevStep}>Back</Button>
                    {Object.keys(allRules).length > 0 && <Button onClick={goToNextStep}>Next: Review & Preview</Button>}
                  </div>
                </div>
              )}
              {/* Step 5: Review & Preview */}
              {wizardStep === 5 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Step 5: Review & Preview</h3>
                  <p className="text-sm text-gray-600 mb-4">Here's a summary of your animation setup. You can edit or remove any part, or go back to make changes.</p>
                  <div className="mb-4">
                    <h4 className="font-medium mb-1">Elements & Properties</h4>
                    {elementIds.map(id => (
                      <div key={id} className="mb-2">
                        <div className="font-mono text-blue-700">{id}</div>
                        <ul className="ml-4">
                          {(animatableElements[id].properties || []).map((prop, idx) => (
                            <li key={idx} className="mb-1">
                              <span className="font-mono text-green-700">{prop.name}</span>: {Object.entries(prop.states || {}).map(([state, value]) => (
                                <span key={state} className="ml-2"><Badge>{`${String(state)}: ${String(value)}`}</Badge></span>
                              ))}
                              <Button size="sm" variant="outline" className="ml-2" onClick={() => { setSelectedElementId(id); setSelectedPropertyIndex(idx); setWizardStep(3); }}>Edit</Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <h4 className="font-medium mt-4 mb-1">Rules</h4>
                    {Object.entries(allRules).map(([state, rule]) => (
                      <div key={state} className="flex items-center gap-2 mb-1">
                        <Badge>{`${state}: ${String(rule)}`}</Badge>
                        <Button size="sm" variant="outline" onClick={() => { setWizardStep(4); setNewStateRule(state); setNewStateRuleExpression(String(rule)); }}>Edit</Button>
                      </div>
                    ))}
                  </div>
                  {/* Placeholder for visual preview */}
                  <div className="border rounded-md bg-gray-50 p-8 flex items-center justify-center mb-4" style={{ minHeight: 120 }}>
                    <span className="text-gray-400">[Animation Preview Here]</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={goToPrevStep}>Back</Button>
                    <Button variant="outline" onClick={() => setWizardStep(1)}>Start Over</Button>
                    <Button variant="default" onClick={() => setMode('advanced')}>Save & Advanced</Button>
                  </div>
                  <div className="mt-4 text-green-700 text-sm font-medium flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    Animation setup complete! You can switch to Advanced mode for more options.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold">Animation Configuration</h2>
            <TabsList className="ml-auto">
              <TabsTrigger value="setup" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Quick Guide
              </TabsTrigger>
              <TabsTrigger value="elements" className="gap-2">
                <span className="text-xs bg-blue-100 px-1 py-0.5 rounded">1</span>
                SVG Elements
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2">
                <span className="text-xs bg-blue-100 px-1 py-0.5 rounded">2</span>
                State Rules
              </TabsTrigger>
              <TabsTrigger value="testing" className="gap-2">
                <span className="text-xs bg-blue-100 px-1 py-0.5 rounded">3</span>
                Testing
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle>Animation Setup Guide</CardTitle>
                <CardDescription>
                  Follow these steps to create animations for your component
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3 border rounded-md p-4 bg-blue-50 border-blue-200">
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      <div className="bg-blue-100 rounded-full w-7 h-7 flex items-center justify-center">
                        <span>1</span>
                      </div>
                      Set Up SVG Elements
                    </h3>
                    <p className="text-sm">
                      First, identify the SVG elements you want to animate. For example, in an LED the "led-body" might be the part you want to change color.
                    </p>
                    <ul className="text-sm list-disc pl-5 space-y-1">
                      <li>Find element IDs in your component's SVG</li>
                      <li>Add each element you want to animate</li>
                      <li>Define what property to change (fill, opacity, etc.)</li>
                    </ul>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("elements")}
                      className="mt-2"
                    >
                      Go to SVG Elements
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 border rounded-md p-4 bg-green-50 border-green-200">
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      <div className="bg-green-100 rounded-full w-7 h-7 flex items-center justify-center">
                        <span>2</span>
                      </div>
                      Define State Rules
                    </h3>
                    <p className="text-sm">
                      Next, create rules that determine when states are activated based on circuit conditions.
                    </p>
                    <ul className="text-sm list-disc pl-5 space-y-1">
                      <li>Create named states (e.g., "on", "active")</li>
                      <li>Define conditions using expressions (e.g., {'voltage > 1.5'})</li>
                      <li>These states will be applied to your animated elements</li>
                    </ul>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("rules")}
                      className="mt-2"
                    >
                      Go to State Rules
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-yellow-500" />
                    How Animation Works
                  </h3>
                  <p className="text-sm mb-2">
                    When the circuit is simulated, the component will check if any state rules are met. 
                    If a rule evaluates to true, the corresponding state is applied to the SVG elements.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
                    <div className="bg-white rounded-md p-3 border">
                      <div className="font-medium mb-1">Example Component</div>
                      <div className="text-slate-600">
                        LED with "led-body" element configured to change fill color
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-3 border">
                      <div className="font-medium mb-1">Example Rule</div>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'voltage > 1.7'}</code>
                      <div className="mt-1 text-slate-600">
                        When true, activates state "on"
                      </div>
                    </div>
                    <div className="bg-white rounded-md p-3 border">
                      <div className="font-medium mb-1">Visual Result</div>
                      <div className="text-slate-600">
                        LED body changes color when voltage exceeds 1.7V
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elements" className="p-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>SVG Elements Configuration</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={handleAddAnimatableElement}
                    disabled={!newAnimatableElementId.trim()}
                  >
                    <Plus className="h-4 w-4" /> Add Element
                  </Button>
                </CardTitle>
                <CardDescription>
                  Configure which SVG elements should animate and how they should change
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="flex gap-4 mb-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium">SVG Element ID</label>
                        {svgPath && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={fetchSvgElementIds} 
                            className="h-6 text-xs gap-1"
                            disabled={isLoadingElementIds}
                          >
                            <RefreshCcw className="h-3 w-3" /> Refresh
                          </Button>
                        )}
                      </div>
                      
                      {availableElementIds.length > 0 ? (
                        <Select 
                          value={newAnimatableElementId} 
                          onValueChange={setNewAnimatableElementId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an element ID" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableElementIds.map(id => (
                              <SelectItem key={id} value={id}>
                                {id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder={isLoadingElementIds ? "Loading element IDs..." : "e.g., led-body, battery-cap"} 
                            value={newAnimatableElementId}
                            onChange={(e) => {
                              setNewAnimatableElementId(e.target.value);
                              setErrorMessage(null);
                            }}
                            disabled={isLoadingElementIds}
                          />
                          {isLoadingElementIds && (
                            <div className="animate-spin">
                              <RefreshCcw className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!svgPath && (
                        <p className="text-xs text-amber-600 mt-1">
                          No SVG path available. Please provide an SVG path in Basic Details tab.
                        </p>
                      )}

                      {svgPath && !isLoadingElementIds && availableElementIds.length === 0 && (
                        <div className="space-y-4 my-4">
                          <div className="p-4 rounded-md bg-blue-50 text-blue-700 flex items-center space-x-2">
                            <div className="animate-spin h-5 w-5 mr-2 border-2 border-blue-700 border-t-transparent rounded-full" />
                            <span>Loading element IDs from SVG...</span>
                          </div>
                          
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 space-y-3">
                            <div className="font-medium text-yellow-800">No SVG elements with IDs found</div>
                            <p className="text-yellow-700 text-sm">
                              To animate your component, SVG elements need to have ID attributes. No elements with IDs were found in your SVG.
                            </p>
                            
                            <div className="bg-white p-3 rounded border border-yellow-200 space-y-2">
                              <p className="text-sm font-medium text-gray-700">How to add IDs to your SVG elements:</p>
                              <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-1">
                                <li>Open your SVG file in a text editor or SVG editor</li>
                                <li>For each element you want to animate, add an <code className="bg-gray-100 px-1 rounded">id</code> attribute</li>
                                <li>Example: <code className="bg-gray-100 px-1 rounded">&lt;path d="..." id="my-element-1" /&gt;</code></li>
                                <li>Save your SVG and upload it again</li>
                              </ol>
                            </div>
                            
                            {svgPath && (
                              <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                                <p className="text-sm font-medium text-gray-700">Debugging Info:</p>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <p>SVG path length: {svgPath.length}</p>
                                  <p>SVG starts with: {svgPath.substring(0, 50)}...</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {isLoadingElementIds && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                          <div className="animate-spin">
                            <RefreshCcw className="h-3 w-3" />
                          </div>
                          Loading element IDs...
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <label className="text-sm font-medium">CSS Property</label>
                      <Select 
                        value={newAnimatableElementProperty}
                        onValueChange={setNewAnimatableElementProperty}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fill">fill (color)</SelectItem>
                          <SelectItem value="stroke">stroke (outline)</SelectItem>
                          <SelectItem value="stroke-width">stroke-width (outline thickness)</SelectItem>
                          <SelectItem value="opacity">opacity (transparency)</SelectItem>
                          <SelectItem value="filter">filter (effects like glow)</SelectItem>
                          <SelectItem value="transform">transform (movement, rotation)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="text-sm text-red-500 mb-2">{errorMessage}</div>
                  )}

                  <Separator className="my-6" />

                  {Object.keys(properties.animatableElements || {}).length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-md">
                      <div className="text-gray-500 text-sm">
                        No animatable elements configured yet.
                        <br />
                        Add your first element using the form above.
                      </div>
                    </div>
                  ) : (
                    <Accordion type="multiple" className="w-full space-y-4">
                      {Object.entries(properties.animatableElements || {}).map(([elementId, config]: [string, any]) => (
                        <AccordionItem key={elementId} value={elementId} className="border rounded-md overflow-hidden bg-white">
                          <AccordionTrigger className="bg-gray-50 hover:no-underline py-3 px-4">
                            <div className="flex items-center justify-between w-full pr-4"> {/* Added w-full and pr-4 for spacing */}
                              <div className="flex items-center gap-2">
                                <code className="bg-white px-2 py-1 rounded text-sm border">#{elementId}</code>
                                <Badge variant="outline">
                                  {(config.properties?.length || 0) > 1 
                                    ? `${config.properties?.length} CSS properties` 
                                    : config.properties?.[0]?.name || 'No properties'}
                                </Badge>
                                {(config.properties?.length || 0) > 1 && (
                                  <div className="text-xs text-gray-500">
                                    [{config.properties.map(p => p.name).join(', ')}]
                                  </div>
                                )}
                              </div>
                              {/* Moved Button outside the main content div to prevent trigger click */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleRemoveAnimatableElement(elementId); }} // Stop propagation
                                className="h-8 w-8 ml-auto hover:bg-red-100" // Added ml-auto
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 space-y-4 overflow-y-auto max-h-[400px]">
                            {/* Content previously in CardContent goes here */}
                            <div>
                              <label className="text-sm font-medium">Transition</label>
                              <Input 
                                value={config.transition || 'all 0.3s ease'} 
                                onChange={(e) => {
                                  const currentElements = properties.animatableElements || {};
                                  onChange({
                                    ...properties,
                                    animatableElements: {
                                      ...currentElements,
                                      [elementId]: {
                                        ...config,
                                        transition: e.target.value
                                      }
                                    }
                                  });
                                }}
                                placeholder="e.g., all 0.3s ease"
                                className="mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Controls how smooth the animation is (duration and easing).
                              </div>
                            </div>
                            
                            <div className="pt-2">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">CSS Properties</label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleAddPropertyToElement(elementId)}
                                        className="h-8 gap-1"
                                      >
                                        <Plus className="mr-1 h-3 w-3" /> Add CSS Property
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-xs">
                                      <p>Add multiple CSS properties to control different aspects of this element. For example, you can animate both color (fill) and position (transform) separately.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              
                              {(!config.properties || config.properties.length === 0) ? (
                                <div className="text-xs text-gray-500 italic py-2 px-3 bg-gray-50 rounded-md">
                                  No properties defined. Add properties to define how this element should change.
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {config.properties.map((property, propertyIndex) => (
                                    <div key={propertyIndex} className="border rounded-md p-3 bg-gray-50">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Select 
                                            value={property.name}
                                            onValueChange={(value) => handleChangePropertyName(elementId, propertyIndex, value)}
                                          >
                                            <SelectTrigger className="h-8 w-40">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="fill">fill (color)</SelectItem>
                                              <SelectItem value="stroke">stroke (outline)</SelectItem>
                                              <SelectItem value="stroke-width">stroke-width (thickness)</SelectItem>
                                              <SelectItem value="opacity">opacity (transparency)</SelectItem>
                                              <SelectItem value="filter">filter (effects like glow)</SelectItem>
                                              <SelectItem value="transform">transform (movement)</SelectItem>
                                              <SelectItem value="d">d (path data)</SelectItem>
                                              <SelectItem value="width">width</SelectItem>
                                              <SelectItem value="height">height</SelectItem>
                                              <SelectItem value="r">r (radius)</SelectItem>
                                              <SelectItem value="cx">cx (center x)</SelectItem>
                                              <SelectItem value="cy">cy (center y)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <Badge variant="secondary" className="h-6">
                                            {Object.keys(property.states || {}).length} states
                                          </Badge>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoveProperty(elementId, propertyIndex)}
                                          className="h-8 w-8"
                                        >
                                          <X className="h-4 w-4 text-gray-500" />
                                        </Button>
                                      </div>
                                      
                                      <div className="flex items-center justify-between mt-3 mb-2">
                                        <label className="text-xs font-medium">Element States</label>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleAddElementPropertyState(elementId, propertyIndex)}
                                          disabled={!(newPropertyStateInputs[propertyIndex]?.key || '').trim()}
                                          className="h-7 text-xs"
                                        >
                                          <Plus className="mr-1 h-3 w-3" /> Add State
                                        </Button>
                                      </div>
                                      
                                      <div className="flex gap-4 mb-3">
                                        <div className="space-y-1 flex-1">
                                          <Input 
                                            placeholder="State name (e.g., on, active)" 
                                            value={newPropertyStateInputs[propertyIndex]?.key || ''}
                                            onChange={(e) => {
                                              const currentKey = e.target.value;
                                              setNewPropertyStateInputs(prev => ({ 
                                                ...prev, 
                                                [propertyIndex]: { ...(prev[propertyIndex] || { value: '' }), key: currentKey } 
                                              }));
                                            }}
                                            className="h-8"
                                          />
                                          <div className="text-xs text-gray-500">State name</div>
                                        </div>
                                        <div className="space-y-1 flex-1">
                                          <Input 
                                            placeholder="Value (e.g., #ff0000, 0.8)" 
                                            value={newPropertyStateInputs[propertyIndex]?.value || ''}
                                            onChange={(e) => {
                                              const currentValue = e.target.value;
                                              setNewPropertyStateInputs(prev => ({ 
                                                ...prev, 
                                                [propertyIndex]: { ...(prev[propertyIndex] || { key: '' }), value: currentValue } 
                                              }));
                                            }}
                                            className="h-8"
                                          />
                                          <div className="text-xs text-gray-500">Value for this state</div>
                                        </div>
                                      </div>
                                      
                                      {Object.keys(property.states || {}).length === 0 ? (
                                        <div className="text-xs text-gray-500 italic py-2 px-3 bg-white rounded-md border">
                                          No states defined for this property.
                                        </div>
                                      ) : (
                                        <div className="space-y-2 border rounded-md p-2 bg-white">
                                          <div className="flex justify-between items-center px-2 py-1">
                                            <div className="text-xs font-medium">State</div>
                                            <div className="text-xs font-medium">Value for "{property.name}"</div>
                                          </div>
                                          {Object.entries(property.states || {}).map(([stateKey, stateValue]) => (
                                            <div key={stateKey} className="flex items-center gap-2 p-2 rounded border border-gray-100">
                                              <div className="flex-shrink-0 px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                                {stateKey}
                                              </div>
                                              <Input 
                                                value={stateValue as string} 
                                                onChange={(e) => {
                                                  const currentElements = properties.animatableElements || {};
                                                  const element = currentElements[elementId];
                                                  const newProperties = [...(element.properties || [])];
                                                  
                                                  const newStates = {
                                                    ...(newProperties[propertyIndex]?.states || {}),
                                                    [stateKey]: e.target.value
                                                  };
                                                  
                                                  newProperties[propertyIndex] = {
                                                    ...newProperties[propertyIndex],
                                                    states: newStates
                                                  };
                                                  
                                                  onChange({
                                                    ...properties,
                                                    animatableElements: {
                                                      ...currentElements,
                                                      [elementId]: {
                                                        ...element,
                                                        properties: newProperties
                                                      }
                                                    }
                                                  });
                                                }}
                                                className="flex-grow h-8"
                                              />
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveElementPropertyState(elementId, propertyIndex, stateKey)}
                                                className="h-8 w-8"
                                              >
                                                <X className="h-4 w-4 text-gray-500" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Animation State Rules</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddStateRule}
                    disabled={!newStateRule.trim() || !newStateRuleExpression.trim()}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add Rule
                  </Button>
                </CardTitle>
                <CardDescription>
                  Define when animation states are activated based on circuit conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">State Name</label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <Input 
                                placeholder="e.g., on, active" 
                                value={newStateRule}
                                onChange={(e) => {
                                  setNewStateRule(e.target.value);
                                  setErrorMessage(null);
                                }}
                              />
                              <HelpCircle className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              This name should match one of the state names you defined for your SVG elements.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-sm font-medium">Activation Rule</label>
                      <Input 
                        placeholder="e.g., voltage > 1.7 || current > 0.01" 
                        value={newStateRuleExpression}
                        onChange={(e) => {
                          setNewStateRuleExpression(e.target.value);
                          setErrorMessage(null);
                        }}
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="text-sm text-red-500 mb-2">{errorMessage}</div>
                  )}

                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="text-sm font-medium mb-2">Available Variables:</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><code className="bg-white px-1.5 py-0.5 rounded border">voltage</code> - Voltage across component</div>
                      <div><code className="bg-white px-1.5 py-0.5 rounded border">current</code> - Current through component</div>
                      <div><code className="bg-white px-1.5 py-0.5 rounded border">pinVoltages.pin1</code> - Voltage at specific pin</div>
                      <div><code className="bg-white px-1.5 py-0.5 rounded border">voltageDiff(pin1, pin2)</code> - Voltage between pins</div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {Object.keys(properties.stateRules || {}).length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-md">
                      <div className="text-gray-500 text-sm">
                        No state rules configured yet.
                        <br />
                        Add your first rule using the form above.
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '500px', overflowY: 'auto', paddingRight: '16px', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                      <div className="space-y-4 p-4">
                        {Object.entries(properties.stateRules || {}).map(([stateKey, expression]) => (
                          <Card key={stateKey}>
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{stateKey}</Badge>
                                <span className="text-sm text-gray-500">activates when:</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveStateRule(stateKey)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </CardHeader>
                            <CardContent className="pt-0 px-4 pb-4">
                              <Textarea 
                                value={expression as string} 
                                onChange={(e) => {
                                  const currentRules = properties.stateRules || {};
                                  onChange({
                                    ...properties,
                                    stateRules: {
                                      ...currentRules,
                                      [stateKey]: e.target.value
                                    }
                                  });
                                }}
                                className="min-h-[60px] font-mono text-sm"
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-50 p-4 rounded text-sm border border-yellow-200 mt-6">
                    <h4 className="font-medium mb-2">Rule Expression Examples:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <code className="bg-white px-1.5 py-0.5 rounded border">{'voltage > 1.7'}</code>
                        <span className="text-gray-600">- When voltage exceeds 1.7V</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-white px-1.5 py-0.5 rounded border">{'current > 0.01'}</code>
                        <span className="text-gray-600">- When current exceeds 0.01A</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-white px-1.5 py-0.5 rounded border">{'voltage > 0.7 && current > 0'}</code>
                        <span className="text-gray-600">- When both conditions are true</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="bg-white px-1.5 py-0.5 rounded border">{"voltageDiff('pin1', 'pin2') > 1.5"}</code>
                        <span className="text-gray-600">- When voltage between pins exceeds 1.5V</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Animation Testing Panel</CardTitle>
                <CardDescription>
                  Simulate component states and preview animations without adding to a circuit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AnimationTestingPanel 
                  properties={properties} 
                  svgPath={svgPath} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// Component for testing animations
const AnimationTestingPanel = ({ properties, svgPath }) => {
  const [currentState, setCurrentState] = useState<Record<string, any>>({});
  const [previewKey, setPreviewKey] = useState(0); // For forcing re-render
  const previewRef = useRef(null);
  
  // Default state values for common component types
  const defaultStateValues = useMemo(() => {
    return {
      // Digital states
      on: true,
      off: false,
      // Analog values
      voltage: 5,
      current: 0.5,
      resistance: 1000,
      // Special states
      pressed: false,
      toggled: false,
      charging: false,
      // Signal states
      high: true,
      low: false,
      pulse: false
    };
  }, []);
  
  // Get animation properties from component properties
  const animationProps = useMemo(() => {
    return properties?.animation || {};
  }, [properties]);
  
  // Infer relevant states from state rules
  const relevantStates = useMemo(() => {
    const states = new Set();
    
    // Extract state names from state rules
    const stateRules = properties?.stateRules || {};
    Object.keys(stateRules).forEach(stateName => {
      states.add(stateName);
    });
    
    // If no states found, add some defaults based on common components
    if (states.size === 0) {
      states.add('on');
      states.add('voltage');
    }
    
    // Ensure voltage is always available for testing
    states.add('voltage');
    
    return Array.from(states);
  }, [properties]);
  
  // Check if we have voltage rules
  const hasVoltageRules = useMemo(() => {
    const stateRules = properties?.stateRules || {};
    return Object.values(stateRules).some(rule => 
      String(rule).toLowerCase().includes('voltage')
    );
  }, [properties]);
  
  // Calculate active states based on current state and rules
  const calculatedActiveStates = useMemo(() => {
    const activeStatesResult: string[] = [];
    const stateRules = properties?.stateRules || {};
    Object.entries(stateRules).forEach(([stateName, ruleExpression]) => {
      try {
        const ruleStr = String(ruleExpression);
        if (ruleStr.includes('voltage')) {
          const voltageLevelMatch = ruleStr.match(/voltage\s*(>|>=|<|<=|==|!=)\s*(\d+\.?\d*)/);
          if (voltageLevelMatch) {
            const [_, operator, threshold] = voltageLevelMatch;
            const voltageValue = currentState.voltage || 0;
            const thresholdValue = parseFloat(threshold);
            let isActive = false;
            switch (operator) {
              case '>': isActive = voltageValue > thresholdValue; break;
              case '>=': isActive = voltageValue >= thresholdValue; break;
              case '<': isActive = voltageValue < thresholdValue; break;
              case '<=': isActive = voltageValue <= thresholdValue; break;
              case '==': isActive = voltageValue === thresholdValue; break;
              case '!=': isActive = voltageValue !== thresholdValue; break;
            }
            if (isActive) activeStatesResult.push(stateName);
          }
        } else {
          if (currentState[stateName]) activeStatesResult.push(stateName);
        }
      } catch (error) {
        console.error('Error evaluating rule for display:', error);
      }
    });
    return activeStatesResult;
  }, [currentState, properties?.stateRules]);
  
  // Initialize state with relevant values
  useEffect(() => {
    const initialState: Record<string, any> = {};
    relevantStates.forEach(stateName => {
      initialState[String(stateName)] = defaultStateValues[String(stateName)] !== undefined 
        ? defaultStateValues[String(stateName)] 
        : '';
    });
    
    // Always initialize voltage at a sensible default
    initialState.voltage = 3.3; // Common voltage value for testing
    
    setCurrentState(initialState);
  }, [relevantStates, defaultStateValues]);
  
  // Apply animations based on current state and animation properties
  const applyAnimations = useCallback(() => {
    if (!previewRef.current || !svgPath) return;
    const svgDoc = previewRef.current.querySelector('svg');
    if (!svgDoc) return;
    const animatableElements = properties?.animatableElements || {};
    
    // Apply transitions first
    Object.entries(animatableElements).forEach(([elementId, config]) => {
      const element = svgDoc.getElementById(elementId);
      if (!element) return;
      const transitionValue = (config as any)?.transition || 'all 0.3s ease-in-out';
      element.style.transition = transitionValue;
    });
    
    // Use calculatedActiveStates
    const activeStates = calculatedActiveStates;

    // Apply state changes after a short timeout
    setTimeout(() => {
      Object.entries(animatableElements).forEach(([elementId, config]) => {
        const element = svgDoc.getElementById(elementId);
        if (!element) return;
        
        // For each property defined on this element
        const properties = (config as any)?.properties || [];
        
        properties.forEach((property) => {
          const applicableStates = activeStates.filter(stateName => 
            property.states && stateName in property.states
          );
          
          if (applicableStates.length > 0) {
            const stateName = applicableStates[applicableStates.length - 1];
            const stateValue = property.states[stateName];
            
            // Apply the property based on property configuration
            switch (property.name) {
              case 'fill': element.style.fill = stateValue; break;
              case 'stroke': element.style.stroke = stateValue; break;
              case 'opacity': element.style.opacity = stateValue; break;
              case 'transform': element.style.transform = stateValue; break;
              case 'stroke-width': element.style.strokeWidth = stateValue; break;
              case 'filter': element.style.filter = stateValue; break;
              default:
                const camelCaseProperty = property.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                element.style[camelCaseProperty] = stateValue;
                break;
            }
          } else {
            // **Reset the style if no state is active for this property**
            switch (property.name) {
              case 'fill': element.style.fill = ''; break;
              case 'stroke': element.style.stroke = ''; break;
              case 'opacity': element.style.opacity = ''; break;
              case 'transform': element.style.transform = ''; break;
              case 'stroke-width': element.style.strokeWidth = ''; break;
              case 'filter': element.style.filter = ''; break;
              default:
                const camelCaseProperty = property.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                // Check if property exists before setting to empty string
                if (element.style[camelCaseProperty] !== undefined) {
                  element.style[camelCaseProperty] = '';
                }
                break;
            }
          }
        });
      });
    }, 10); // Small delay to ensure transitions are applied first
  }, [svgPath, currentState, properties, calculatedActiveStates]); // Add calculatedActiveStates dependency
  
  // Apply animations when state changes
  useEffect(() => {
    applyAnimations();
  }, [currentState, applyAnimations]);
  
  // Handle input change for state values
  const handleStateChange = (stateName, value) => {
    setCurrentState(prev => ({
      ...prev,
      [stateName]: value
    }));
  };
  
  // Get input type based on state name
  const getInputTypeForState = (stateName) => {
    const defaultValue = defaultStateValues[stateName];
    
    if (typeof defaultValue === 'boolean' || 
        stateName === 'on' || 
        stateName === 'off' || 
        stateName === 'pressed' ||
        stateName === 'active' ||
        stateName === 'toggled' ||
        stateName === 'high' ||
        stateName === 'low') {
      return 'checkbox';
    }
    
    if (typeof defaultValue === 'number' ||
        stateName === 'voltage' ||
        stateName === 'current' ||
        stateName === 'resistance' ||
        stateName === 'temperature' ||
        stateName === 'position') {
      return 'range';
    }
    
    return 'text';
  };
  
  // Get units based on state name
  const getUnitsForState = (stateName) => {
    switch (stateName.toLowerCase()) {
      case 'voltage': return 'V';
      case 'current': return 'A';
      case 'resistance': return 'Ω';
      case 'temperature': return '°C';
      case 'position': return '%';
      default: return '';
    }
  };
  
  // Calculate slider percentage for voltage
  const voltagePercentage = useMemo(() => {
    const voltage = currentState.voltage || 0;
    const maxVoltage = 12;
    return (voltage / maxVoltage) * 100;
  }, [currentState.voltage]);
  
  // Define voltage marker values
  const voltageMarkers = [
    { value: 0, label: "0V" },
    { value: 1.5, label: "1.5V" },
    { value: 3.3, label: "3.3V" },
    { value: 5, label: "5V" },
    { value: 9, label: "9V" },
    { value: 12, label: "12V" }
  ];
  
  // Calculate position for a marker
  const getMarkerPosition = (value) => {
    return `${(value / 12) * 100}%`;
  };
  
  return (
    <div className="space-y-6">
      {/* Dedicated Voltage Testing Section */}
      <div className="border rounded-md p-4 bg-blue-50 border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-blue-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 16-6-6-6 6"/>
              <path d="M18 8H6"/>
            </svg>
            Voltage Testing
          </h4>
          <div className="text-sm font-medium text-blue-800">
            {currentState.voltage?.toFixed(1) || 0} V
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="relative pt-1">
            <div className="w-full h-2 bg-blue-200 rounded-lg overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${voltagePercentage}%` }}
              />
            </div>
            <input 
              type="range"
              value={currentState.voltage || 0}
              onChange={e => {
                // Apply transition before changing state
                if (previewRef.current) {
                  const svgDoc = previewRef.current.querySelector('svg');
                  if (svgDoc) {
                    // Apply transitions to all SVG elements with IDs
                    const animatableElements = properties?.animatableElements || {};
                    Object.entries(animatableElements).forEach(([elementId, config]) => {
                      const element = svgDoc.getElementById(elementId);
                      if (element) {
                        // Ensure transition is set correctly
                        element.style.transition = (config as any).transition || 'all 0.3s ease-in-out';
                      }
                    });
                  }
                }
                // Now update the state which will trigger the animation
                handleStateChange('voltage', parseFloat(e.target.value));
              }}
              min={0}
              max={12}
              step={0.1}
              className="absolute top-0 left-0 w-full h-4 opacity-0 cursor-pointer"
            />
          </div>
          
          {/* Voltage markers */}
          <div className="relative w-full h-6 mt-1">
            {voltageMarkers.map((marker) => (
              <div 
                key={marker.value} 
                className="absolute flex flex-col items-center"
                style={{ 
                  left: getMarkerPosition(marker.value),
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="h-2 w-px bg-blue-300"></div>
                <span className="text-xs text-blue-700 whitespace-nowrap">{marker.label}</span>
              </div>
            ))}
          </div>
          
          {hasVoltageRules ? (
            <div className="text-xs bg-blue-100 p-2 rounded text-blue-700 flex items-start gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12" y2="16"/>
              </svg>
              <span>
                Adjust the slider to see how the component responds to different voltage levels.
              </span>
            </div>
          ) : (
            <div className="text-xs bg-yellow-100 p-2 rounded text-yellow-700 flex items-start gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>
                No voltage-based rules detected. Add rules with "voltage" in the expression to enable voltage-based animations.
              </span>
            </div>
          )}
          
          <div className="flex justify-center space-x-2 mt-2">
            {voltageMarkers.slice(1).map(marker => (
              <Button 
                key={marker.value}
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Apply transitions first
                  if (previewRef.current) {
                    const svgDoc = previewRef.current.querySelector('svg');
                    if (svgDoc) {
                      const animatableElements = properties?.animatableElements || {};
                      Object.entries(animatableElements).forEach(([elementId, config]) => {
                        const element = svgDoc.getElementById(elementId);
                        if (element) {
                          element.style.transition = (config as any).transition || 'all 0.3s ease-in-out';
                        }
                      });
                    }
                  }
                  // Then change the state
                  handleStateChange('voltage', marker.value);
                }}
                className={`h-7 text-xs px-2 ${currentState.voltage === marker.value ? 'bg-blue-100' : ''}`}
              >
                {marker.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Preview Section */}
      <div className="space-y-3 mt-6">
        <h4 className="text-sm font-medium">Animation Preview</h4>
        {/* Display Calculated Active States */}
        <div className="text-xs p-2 bg-gray-100 rounded border border-gray-200">
          <span className="font-medium text-gray-600 mr-2">Active States:</span>
          {calculatedActiveStates.length > 0 ? (
            calculatedActiveStates.map(state => <Badge key={state} variant="secondary" className="mr-1">{state}</Badge>)
          ) : (
            <span className="text-gray-500 italic">None</span>
          )}
        </div>

        <div 
          className="border rounded-md bg-gray-50 p-4 flex items-center justify-center min-h-[200px]"
          ref={previewRef}
        >
          {svgPath ? (
            svgPath.trim().startsWith('<svg') ? (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: svgPath.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet"') 
                }}
                className="max-w-full max-h-[180px]"
              />
            ) : svgPath.match(/^https?:\/\//) ? (
              <img 
                src={svgPath} 
                alt="Component Preview" 
                className="max-w-full max-h-[180px] object-contain"
              />
            ) : (
              <div className="text-gray-400 flex flex-col items-center">
                <AlertCircle className="h-8 w-8 mb-2" />
                <span className="text-sm">Invalid SVG format</span>
              </div>
            )
          ) : (
            <div className="text-gray-400 flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span className="text-sm mt-2">No SVG available</span>
            </div>
          )}
        </div>
        
        {svgPath && (
          <div className="flex justify-center items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // First ensure all transitions are applied
                if (previewRef.current) {
                  const svgDoc = previewRef.current.querySelector('svg');
                  if (svgDoc) {
                    const animatableElements = properties?.animatableElements || {};
                    Object.entries(animatableElements).forEach(([elementId, config]) => {
                      const element = svgDoc.getElementById(elementId);
                      if (element) {
                        // Reset the element's styles
                        element.style.transition = '';
                        element.style.transform = '';
                        element.style.fill = '';
                        element.style.stroke = '';
                        element.style.opacity = '';
                        
                        // Then reapply transition for next animation
                        setTimeout(() => {
                          if (element) {
                            element.style.transition = (config as any).transition || 'all 0.3s ease-in-out';
                          }
                        }, 50);
                      }
                    });
                  }
                }
                
                // Force a re-render and reapply animations
                setPreviewKey(prev => prev + 1);
                setTimeout(() => {
                  applyAnimations();
                }, 100);
              }}
              className="text-xs"
            >
              Reset & Reapply Animations
            </Button>
          </div>
        )}
        
        {!svgPath && (
          <div className="text-center text-xs text-amber-600 mt-2">
            No SVG available. Please add an SVG in the SVG tab.
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimationPropertiesEditor; 