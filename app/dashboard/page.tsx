import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90">
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-2">
            <span className="text-3xl font-bold">$0.00</span>
            <span className="text-sm text-muted-foreground">No invoices yet</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-2">
            <span className="text-3xl font-bold">0</span>
            <span className="text-sm text-muted-foreground">Pipeline is empty</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-2">
            <span className="text-3xl font-bold">0</span>
            <span className="text-sm text-muted-foreground">All clear</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No activity yet. Start by creating a contact or lead.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
