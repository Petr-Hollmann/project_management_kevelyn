import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Car, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const WorkerItem = ({ worker }) => {
  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };
  return (
    <Link to={createPageUrl(`WorkerDetail?id=${worker.id}`)} className="block">
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
        <Avatar className="flex-shrink-0">
          <AvatarImage src={worker.photo_url} />
          <AvatarFallback>{getInitials(worker.first_name, worker.last_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{worker.first_name} {worker.last_name}</p>
          <p className="text-xs text-slate-500 truncate">{worker.seniority}</p>
        </div>
        <Badge variant="outline" className="flex-shrink-0 text-xs">{worker.availability === 'available' ? 'Dostupný' : 'Nedostupný'}</Badge>
      </div>
    </Link>
  );
};

const VehicleItem = ({ vehicle }) => {
  return (
    <Link to={createPageUrl(`VehicleDetail?id=${vehicle.id}`)} className="block">
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
        <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
          <Car className="w-6 h-6 text-slate-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{vehicle.brand_model}</p>
          <p className="text-xs text-slate-500 font-mono truncate">{vehicle.license_plate}</p>
        </div>
        <Badge variant="outline" className="flex-shrink-0 text-xs">{vehicle.status === 'active' ? 'V provozu' : 'Mimo provoz'}</Badge>
      </div>
    </Link>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-2">
    {Array(3).fill(0).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-2">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export default function ResourceOverview({ workers, vehicles, isLoading }) {
  const recentWorkers = workers.slice(0, 5);
  const recentVehicles = vehicles.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Přehled zdrojů</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="workers">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workers">
              <Users className="w-4 h-4 mr-2" />
              Montážníci ({workers.length})
            </TabsTrigger>
            <TabsTrigger value="vehicles">
              <Car className="w-4 h-4 mr-2" />
              Vozidla ({vehicles.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="workers" className="pt-4">
            {isLoading ? <LoadingSkeleton /> : (
              <div className="space-y-1">
                {recentWorkers.map(worker => <WorkerItem key={worker.id} worker={worker} />)}
              </div>
            )}
             <Link to={createPageUrl("Workers")}>
              <Button variant="outline" className="w-full mt-4">
                Zobrazit všechny montážníky <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </TabsContent>
          <TabsContent value="vehicles" className="pt-4">
            {isLoading ? <LoadingSkeleton /> : (
              <div className="space-y-1">
                {recentVehicles.map(vehicle => <VehicleItem key={vehicle.id} vehicle={vehicle} />)}
              </div>
            )}
             <Link to={createPageUrl("Vehicles")}>
              <Button variant="outline" className="w-full mt-4">
                Zobrazit všechna vozidla <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}