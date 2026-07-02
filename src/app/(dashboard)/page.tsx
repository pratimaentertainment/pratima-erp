 
 
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Pratima ERP</h1>
        <p className="text-muted-foreground">
          Your centralized command center for studio management.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder metric cards */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex items-center gap-2">
            <h3 className="tracking-tight text-sm font-medium">Total Revenue</h3>
          </div>
          <div className="mt-2 text-2xl font-bold">$45,231.89</div>
          <p className="text-xs text-muted-foreground">+20.1% from last month</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex items-center gap-2">
            <h3 className="tracking-tight text-sm font-medium">Active Projects</h3>
          </div>
          <div className="mt-2 text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">+3 since last week</p>
        </div>
      </div>
    </div>
  );
}
