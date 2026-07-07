import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cpu, Loader2 } from 'lucide-react';
import { DashboardProject } from '@/services/projectsApi';

interface ExampleCardProps {
  example: DashboardProject;
  onUse: (id: string) => void;
  isCloning?: boolean;
}

/**
 * Card for a public example project. "Use this example" copies it into the
 * user's own account (via onUse) so they get a fully editable, runnable copy.
 */
const ExampleCard = ({ example, onUse, isCloning = false }: ExampleCardProps) => (
  <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="pb-2">
      <CardTitle className="text-lg text-primary flex items-center gap-2">
        <Cpu className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>{example.name}</span>
      </CardTitle>
    </CardHeader>

    <CardContent className="flex-grow">
      <CardDescription className="text-sm text-muted-foreground">
        {example.description || 'An example circuit to get you started.'}
      </CardDescription>
    </CardContent>

    <CardFooter className="border-t pt-3">
      <Button
        size="sm"
        className="w-full"
        onClick={() => onUse(example.id)}
        disabled={isCloning}
      >
        {isCloning ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Opening...
          </>
        ) : (
          'Use this example'
        )}
      </Button>
    </CardFooter>
  </Card>
);

export default ExampleCard;
