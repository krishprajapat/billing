import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Truck,
  IndianRupee,
  Milk,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { dashboardApi, ApiError } from "@/lib/api-client";
import { DashboardStats } from "../../shared/api";
import { EndOfDayProcessor } from "@/components/EndOfDayProcessor";

export default function Index() {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const stats = await dashboardApi.getStats();

        setDashboardStats(stats);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleProcessComplete = async () => {
    // Refresh dashboard data after end-of-day processing
    try {
      const stats = await dashboardApi.getStats();

      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to refresh dashboard after EOD:', err);
      // Could show a toast or alert here
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 space-y-8">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Stats cards skeleton */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional skeleton content */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (!dashboardStats) {
    return (
      <Layout>
        <div className="p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No dashboard data available</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your milk delivery business today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/customers')}>
              <Users className="h-4 w-4 mr-2" />
              Customers
            </Button>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-success">+{dashboardStats.newCustomers}</span> new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.activeWorkers}</div>
              <p className="text-xs text-muted-foreground">
                All workers on duty today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboardStats.todayRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Collection rate: {dashboardStats.collectionRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Milk Delivered</CardTitle>
              <Milk className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.milkDelivered}L</div>
              <p className="text-xs text-muted-foreground">
                Today's total delivery
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{dashboardStats.monthlyRevenue.toLocaleString()}</div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-success">Collection rate: {dashboardStats.collectionRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Milk Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalMilkSold.toLocaleString()}L</div>
              <div className="flex items-center gap-2 text-sm">
                <Milk className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">This month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{dashboardStats.pendingDues.toLocaleString()}</div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-muted-foreground">Needs attention</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{dashboardStats.newCustomers}</div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">This month</span>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* End of Day Processing */}
        <EndOfDayProcessor onProcessComplete={handleProcessComplete} />
      </div>
    </Layout>
  );
}
