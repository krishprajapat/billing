import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Milk,
  CheckCircle,
  AlertTriangle,
  Clock,
  IndianRupee,
  Calendar,
  Loader2,
  Lock,
  Phone,
  MapPin,
} from "lucide-react";
import { dailyApi, ApiError } from "@/lib/api-client";
import { CustomerQuantityLink } from "@shared/api";

export default function CustomerQuantity() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [customerData, setCustomerData] = useState<CustomerQuantityLink | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    if (token) {
      fetchCustomerData();
    }
  }, [token]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await dailyApi.getCustomerByToken(token!);
      setCustomerData(data);
      setNewQuantity(data.nextDayQuantity);
    } catch (err) {
      console.error('Failed to fetch customer data:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load customer information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async () => {
    if (!customerData || !token) return;

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      await dailyApi.updateQuantityByToken(token, {
        quantity: newQuantity,
        date: tomorrowStr,
      });

      setSuccess(`Successfully updated your milk quantity to ${newQuantity}L for tomorrow!`);
      
      // Refresh customer data to get updated values
      await fetchCustomerData();
    } catch (err) {
      console.error('Failed to update quantity:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to update milk quantity');
    } finally {
      setUpdating(false);
    }
  };

  const calculateDailyCost = (quantity: number) => {
    return quantity * 60; // Assuming ₹60 per liter
  };

  const isValidQuantity = (quantity: number) => {
    return quantity >= 0.5 && quantity <= 10;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-16">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center mt-4 text-muted-foreground">Loading your milk delivery details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error && !customerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-16">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <p className="text-sm text-muted-foreground">
                  Please contact your milk delivery service for a new link.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!customerData?.canChange) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-16">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <Lock className="h-12 w-12 text-warning mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Changes Locked</h2>
                <p className="text-muted-foreground mb-4">
                  Sorry, the deadline for changing tomorrow's milk quantity has passed.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can change your quantity for the next day after the evening delivery.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Milk className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">MilkFlow</h1>
          </div>
          <p className="text-muted-foreground">Daily Milk Delivery</p>
        </div>

        {/* Customer Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Hello, {customerData?.customerName}!</CardTitle>
            <CardDescription>Manage your milk delivery for tomorrow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Delivery Date: {tomorrowFormatted}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Milk className="h-4 w-4 text-muted-foreground" />
              <span>Current Quantity: {customerData?.currentQuantity}L</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <span>Rate: ₹60 per liter</span>
            </div>
          </CardContent>
        </Card>

        {/* Quantity Change Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Update Tomorrow's Quantity</CardTitle>
            <CardDescription>
              Set your milk quantity for tomorrow's delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Milk Quantity (Liters)</Label>
              <Input
                id="quantity"
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseFloat(e.target.value) || 0)}
                placeholder="Enter quantity in liters"
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground">
                Minimum: 0.5L, Maximum: 10L (in 0.5L increments)
              </p>
            </div>

            {newQuantity > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Tomorrow's Cost:</span>
                  <span className="text-lg font-bold text-primary">
                    ₹{calculateDailyCost(newQuantity)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {newQuantity}L × ₹60 = ₹{calculateDailyCost(newQuantity)}
                </p>
              </div>
            )}

            <Button
              onClick={handleUpdateQuantity}
              disabled={!isValidQuantity(newQuantity) || updating || newQuantity === customerData?.nextDayQuantity}
              className="w-full"
              size="lg"
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {newQuantity === customerData?.nextDayQuantity ? 'No Changes' : 'Update Quantity'}
            </Button>

            {!isValidQuantity(newQuantity) && newQuantity > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Please enter a quantity between 0.5L and 10L
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick Quantity Options */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Quick Options</CardTitle>
            <CardDescription>Common quantity choices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5].map((qty) => (
                <Button
                  key={qty}
                  variant={newQuantity === qty ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewQuantity(qty)}
                  className="h-12 flex-col"
                >
                  <span className="font-semibold">{qty}L</span>
                  <span className="text-xs">₹{calculateDailyCost(qty)}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Important Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    Changes must be made before 12:00 AM on the delivery day
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <Milk className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Fresh Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    Your milk will be delivered fresh every morning between 6-8 AM
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Need Help?</p>
                  <p className="text-sm text-muted-foreground">
                    Contact us at +91 98765 43210 for any delivery issues
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 pb-8">
          <p className="text-sm text-muted-foreground">
            Powered by MilkFlow • Fresh Milk Daily
          </p>
        </div>
      </div>
    </div>
  );
}
