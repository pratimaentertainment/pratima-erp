import { MASTER_CONFIGS } from '@/lib/master-config';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MasterDataPage() {
  const masters = Object.values(MASTER_CONFIGS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
        <p className="text-muted-foreground mt-2">
          Manage configuration values used across the system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {masters.map((master) => (
          <Link key={master.entity} href={`/masters/${master.entity}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-md">
                  <Settings2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{master.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage {master.title.toLowerCase()} configurations.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
