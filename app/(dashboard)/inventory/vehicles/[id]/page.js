'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Car,
  DollarSign,
  Gauge,
  Calendar,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id;

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
    }
  }, [vehicleId]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/inventory/vehicles/${vehicleId}`);
      if (!response.ok) throw new Error('Failed to fetch vehicle details');

      const result = await response.json();
      if (result.success) {
        setVehicle(result.data);
      } else {
        throw new Error(result.error || 'Failed to load vehicle');
      }
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/inventory/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete vehicle');

      router.push('/inventory/vehicles');
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      sold: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      reserved: 'bg-purple-100 text-purple-800',
      service: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Vehicle not found'}</AlertDescription>
        </Alert>
        <Link href="/inventory/vehicles">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory/vehicles">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-muted-foreground">
              Stock: {vehicle.stock_number} • VIN: {vehicle.vin}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Details
          </Button>
          <Link href={`/inventory/vehicles/${vehicleId}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this vehicle? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground"
                >
                  {deleting ? 'Deleting...' : 'Delete Vehicle'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {vehicle.image_url ? (
                  <img
                    src={vehicle.image_url}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <ImageIcon className="h-12 w-12" />
                    <p>No Image Available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vehicle Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Make
                  </p>
                  <p className="text-lg">{vehicle.make}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Model
                  </p>
                  <p className="text-lg">{vehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Year
                  </p>
                  <p className="text-lg">{vehicle.year}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Trim
                  </p>
                  <p className="text-lg">{vehicle.trim || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Body Style
                  </p>
                  <p className="text-lg">{vehicle.body_style || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Color
                  </p>
                  <p className="text-lg">{vehicle.exterior_color || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Interior Color
                  </p>
                  <p className="text-lg">{vehicle.interior_color || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Engine
                  </p>
                  <p className="text-lg">{vehicle.engine || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Transmission
                  </p>
                  <p className="text-lg">{vehicle.transmission || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Drivetrain
                  </p>
                  <p className="text-lg">{vehicle.drivetrain || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Fuel Type
                  </p>
                  <p className="text-lg">{vehicle.fuel_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    MPG
                  </p>
                  <p className="text-lg">
                    {vehicle.mpg_city || 'N/A'} / {vehicle.mpg_highway || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {vehicle.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {vehicle.description}
                </p>
              </CardContent>
            </Card>
          )}

          {vehicle.features && (
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-2 gap-2">
                  {vehicle.features.split(',').map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-sm">{feature.trim()}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  List Price
                </p>
                <p className="text-3xl font-bold">
                  ${(vehicle.price || 0).toLocaleString()}
                </p>
              </div>
              {vehicle.cost && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cost
                  </p>
                  <p className="text-xl">
                    ${(vehicle.cost || 0).toLocaleString()}
                  </p>
                </div>
              )}
              {vehicle.msrp && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    MSRP
                  </p>
                  <p className="text-xl">
                    ${(vehicle.msrp || 0).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Current Status
                </p>
                <Badge className={getStatusColor(vehicle.status)}>
                  {vehicle.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Condition
                </p>
                <p className="text-lg">{vehicle.condition}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Mileage
                </p>
                <p className="text-lg">
                  {vehicle.mileage?.toLocaleString() || 'N/A'} miles
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Stock Number
                </p>
                <p className="text-lg font-mono">{vehicle.stock_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">VIN</p>
                <p className="text-sm font-mono break-all">{vehicle.vin}</p>
              </div>
              {vehicle.location && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Location
                  </p>
                  <p className="text-lg">{vehicle.location}</p>
                </div>
              )}
              {vehicle.purchase_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Purchase Date
                  </p>
                  <p className="text-lg">
                    {new Date(vehicle.purchase_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {vehicle.created_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Added to Inventory
                  </p>
                  <p className="text-lg">
                    {new Date(vehicle.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}