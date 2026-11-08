/**
 * AgencyOS Coming Soon placeholder.
 *
 * Reusable placeholder page for modules planned for future roadmap phases.
 * Does not present any module as functional; clearly communicates that the
 * feature is not yet available.
 *
 * Props:
 *   title - Module name displayed in the heading
 *   phase - Planned roadmap phase (e.g. 'Phase 2.3', 'Future Phase')
 *   description - Optional short description of what the module will do
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ComingSoonProps {
  title: string;
  phase: string;
  description?: string;
}

export function ComingSoon({ title, phase, description }: ComingSoonProps) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Coming Soon — {phase}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description ?? `The ${title} module is planned for a future AgencyOS release and is not yet available.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {phase}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
