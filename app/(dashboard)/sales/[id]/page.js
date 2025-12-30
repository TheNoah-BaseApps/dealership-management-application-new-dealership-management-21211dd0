'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  User,
  Car,
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
import { Separator } from '@/components/ui/separator';
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

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params.id;

  const [sale, setSale] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (saleId) {
      fetchSaleData();
    }
  }, [saleId]);

  const fetchSaleData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sales/${saleId}`);
      if (!response.ok) throw new Error('Failed to fetch sale details');

      const result = await response.json();
      if (result.success) {
        setSale(result.data);

        if (result.data.customer_id) {
          const customerRes = await fetch(
            `/api/customers/${result.data.customer_id}`
          );
          if (customerRes.ok) {
            const customerData = await customerRes.json();
            if (customerData.success) {
              setCustomer(customerData.data);
            }
          }
        }

        if (result.data.vehicle_id) {
          const vehicleRes = await fetch(
            `/api/inventory/vehicles/${result.data.vehicle_id}`
          );
          if (vehicleRes.ok) {
            const vehicleData = await vehicleRes.json();
            if (vehicleData.success) {
              setVehicle(vehicleData.data);
            }
          }
        }
      } else {
        throw new Error(result.error || 'Failed to load sale');
      }
    } catch (err) {
      console.error('Error fetching sale data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete sale');

      router.push('/sales');
    } catch (err) {
      console.error('Error deleting sale:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const result = await response.json();
      if (result.success) {
        setSale(result.data);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      financed: 'bg-purple-100 text-purple-800',
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

  if (error || !sale) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Sale not found'}</AlertDescription>
        </Alert>
        <Link href="/sales">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Sale #{sale.sale_number || sale.id?.substring(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              {new Date(sale.sale_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Invoice
          </Button>
          <Link href={`/sales/${saleId}/edit`}>
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
                <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this sale? This action cannot
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
                  {deleting ? 'Deleting...' : 'Delete Sale'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer ? (
              <>
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.first_name} {customer.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.phone}
                  </p>
                </div>
                <Link href={`/customers/${customer.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Customer
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Customer information not available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicle ? (
              <>
                <div>
                  <p className="text-sm font-medium">Vehicle</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">VIN</p>
                  <p className="text-sm text-muted-foreground">{vehicle.vin}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Stock #</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.stock_number}
                  </p>
                </div>
                <Link href={`/inventory/vehicles/${vehicle.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Vehicle
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vehicle information not available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sale Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Current Status</p>
              <Badge className={getStatusColor(sale.status)}>
                {sale.status}
              </Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('approved')}
                  disabled={sale.status === 'approved'}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('completed')}
                  disabled={sale.status === 'completed'}
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('financed')}
                  disabled={sale.status === 'financed'}
                >
                  Financed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={sale.status === 'cancelled'}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Sale Price</span>
                <span className="text-lg font-semibold">
                  ${(sale.sale_price || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Down Payment</span>
                <span className="text-lg">
                  ${(sale.down_payment || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Trade-In Value</span>
                <span className="text-lg">
                  ${(sale.trade_in_value || 0).toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Amount Financed</span>
                <span className="text-lg font-semibold">
                  ${(sale.financed_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Payment Type</span>
                <Badge variant="secondary">{sale.payment_type || 'N/A'}</Badge>
              </div>
              {sale.financing_term && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Financing Term</span>
                  <span className="text-lg">{sale.financing_term} months</span>
                </div>
              )}
              {sale.interest_rate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Interest Rate</span>
                  <span className="text-lg">{sale.interest_rate}%</span>
                </div>
              )}
              {sale.monthly_payment && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monthly Payment</span>
                  <span className="text-lg font-semibold">
                    ${(sale.monthly_payment || 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {sale.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {sale.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}