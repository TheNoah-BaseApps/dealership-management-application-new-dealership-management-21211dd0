'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Calculator } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function NewSalePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    vehicle_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    sale_price: '',
    down_payment: '',
    trade_in_value: '',
    payment_type: 'cash',
    financing_term: '',
    interest_rate: '',
    monthly_payment: '',
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
    fetchVehicles();
  }, []);

  useEffect(() => {
    calculateFinancing();
  }, [
    formData.sale_price,
    formData.down_payment,
    formData.trade_in_value,
    formData.financing_term,
    formData.interest_rate,
  ]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCustomers(result.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/inventory/vehicles?status=available');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setVehicles(result.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const calculateFinancing = () => {
    const salePrice = parseFloat(formData.sale_price) || 0;
    const downPayment = parseFloat(formData.down_payment) || 0;
    const tradeIn = parseFloat(formData.trade_in_value) || 0;
    const term = parseInt(formData.financing_term) || 0;
    const rate = parseFloat(formData.interest_rate) || 0;

    if (
      formData.payment_type === 'financing' &&
      salePrice > 0 &&
      term > 0 &&
      rate >= 0
    ) {
      const principal = salePrice - downPayment - tradeIn;
      const monthlyRate = rate / 100 / 12;
      const monthlyPayment =
        monthlyRate === 0
          ? principal / term
          : (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
            (Math.pow(1 + monthlyRate, term) - 1);

      setFormData((prev) => ({
        ...prev,
        monthly_payment: monthlyPayment.toFixed(2),
      }));
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sale_price: parseFloat(formData.sale_price) || 0,
          down_payment: parseFloat(formData.down_payment) || 0,
          trade_in_value: parseFloat(formData.trade_in_value) || 0,
          financing_term: parseInt(formData.financing_term) || null,
          interest_rate: parseFloat(formData.interest_rate) || null,
          monthly_payment: parseFloat(formData.monthly_payment) || null,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create sale');
      }

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/sales/${result.data.id}`);
        }, 1500);
      } else {
        throw new Error(result.error || 'Failed to create sale');
      }
    } catch (err) {
      console.error('Error creating sale:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const financedAmount =
    (parseFloat(formData.sale_price) || 0) -
    (parseFloat(formData.down_payment) || 0) -
    (parseFloat(formData.trade_in_value) || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Sale</h1>
          <p className="text-muted-foreground">Create a new vehicle sale</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <AlertDescription>
            Sale created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sale Information</CardTitle>
            <CardDescription>Basic details about the sale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">
                  Customer <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => handleChange('customer_id', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_id">
                  Vehicle <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(value) => handleChange('vehicle_id', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model} - $
                        {vehicle.price?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_date">
                  Sale Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => handleChange('sale_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
            <CardDescription>Pricing and payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sale_price">
                  Sale Price <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.sale_price}
                  onChange={(e) => handleChange('sale_price', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_type">Payment Type</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => handleChange('payment_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="financing">Financing</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="down_payment">Down Payment</Label>
                <Input
                  id="down_payment"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.down_payment}
                  onChange={(e) =>
                    handleChange('down_payment', e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trade_in_value">Trade-In Value</Label>
                <Input
                  id="trade_in_value"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.trade_in_value}
                  onChange={(e) =>
                    handleChange('trade_in_value', e.target.value)
                  }
                />
              </div>
            </div>

            {formData.payment_type === 'financing' && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calculator className="h-4 w-4" />
                  Financing Calculator
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="financing_term">Term (Months)</Label>
                    <Input
                      id="financing_term"
                      type="number"
                      placeholder="60"
                      value={formData.financing_term}
                      onChange={(e) =>
                        handleChange('financing_term', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                    <Input
                      id="interest_rate"
                      type="number"
                      step="0.01"
                      placeholder="5.99"
                      value={formData.interest_rate}
                      onChange={(e) =>
                        handleChange('interest_rate', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthly_payment">Monthly Payment</Label>
                    <Input
                      id="monthly_payment"
                      type="number"
                      step="0.01"
                      placeholder="Calculated"
                      value={formData.monthly_payment}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Amount Financed</p>
                      <p className="text-lg font-semibold">
                        ${financedAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Interest</p>
                      <p className="text-lg font-semibold">
                        $
                        {(
                          (parseFloat(formData.monthly_payment) || 0) *
                            (parseInt(formData.financing_term) || 0) -
                          financedAmount
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter any additional notes about this sale..."
              rows={4}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/sales">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Creating Sale...' : 'Create Sale'}
          </Button>
        </div>
      </form>
    </div>
  );
}