'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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

export default function PartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partId = params.id;

  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (partId) {
      fetchPart();
    }
  }, [partId]);

  const fetchPart = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/inventory/parts/${partId}`);
      if (!response.ok) throw new Error('Failed to fetch part details');

      const result = await response.json();
      if (result.success) {
        setPart(result.data);
      } else {
        throw new Error(result.error || 'Failed to load part');
      }
    } catch (err) {
      console.error('Error fetching part:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/inventory/parts/${partId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete part');

      router.push('/inventory/parts');
    } catch (err) {
      console.error('Error deleting part:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStockStatus = () => {
    if (!part) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    if (part.quantity_on_hand === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    } else if (part.quantity_on_hand <= (part.reorder_point || 0)) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Part not found'}</AlertDescription>
        </Alert>
        <Link href="/inventory/parts">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Parts
          </Button>
        </Link>
      </div>
    );
  }

  const stockStatus = getStockStatus();
  const inventoryValue = (part.cost || 0) * (part.quantity_on_hand || 0);
  const potentialRevenue = (part.price || 0) * (part.quantity_on_hand || 0);
  const margin = ((part.price || 0) - (part.cost || 0)) / (part.price || 1) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory/parts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {part.part_name}
            </h1>
            <p className="text-muted-foreground">
              Part #: {part.part_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/inventory/parts/${partId}/edit`}>
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
                <AlertDialogTitle>Delete Part</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this part? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground"
                >
                  {deleting ? 'Deleting...' : 'Delete Part'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {part.quantity_on_hand <= (part.reorder_point || 0) && (
        <Alert variant={part.quantity_on_hand === 0 ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {part.quantity_on_hand === 0
              ? 'This part is out of stock. Reorder immediately.'
              : 'This part is running low on stock. Consider reordering soon.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hand</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{part.quantity_on_hand || 0}</div>
            <p className="text-xs text-muted-foreground">
              Min: {part.reorder_point || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${inventoryValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              At cost price
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${potentialRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              At retail price
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{margin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Per unit
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Part Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Part Number
                </p>
                <p className="text-lg font-mono">{part.part_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Category
                </p>
                <Badge variant="secondary">{part.category || 'N/A'}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Manufacturer
                </p>
                <p className="text-lg">{part.manufacturer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Location
                </p>
                <p className="text-lg">{part.location || 'N/A'}</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Status
              </p>
              <Badge className={stockStatus.color}>
                {stockStatus.label}
              </Badge>
            </div>

            {part.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Description
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {part.description}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cost Price
                </p>
                <p className="text-2xl font-bold">
                  ${(part.cost || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Retail Price
                </p>
                <p className="text-2xl font-bold">
                  ${(part.price || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Quantity on Hand
                </p>
                <p className="text-xl font-semibold">
                  {part.quantity_on_hand || 0}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reorder Point
                </p>
                <p className="text-xl font-semibold">
                  {part.reorder_point || 0}
                </p>
              </div>
            </div>

            {part.supplier && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Supplier
                  </p>
                  <p className="text-lg">{part.supplier}</p>
                </div>
              </>
            )}

            {part.last_ordered_date && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Ordered
                </p>
                <p className="text-lg">
                  {new Date(part.last_ordered_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {part.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {part.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}