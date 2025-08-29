import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  Download,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Milk,
  AlertTriangle,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Truck,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { reportsApi, ApiError } from "@/lib/api-client";
import { MonthlyReport, WorkerPerformance, AreaReport, PaymentMethodReport } from "../../shared/api";

// This data will be replaced by actual API data

// This data will be replaced by actual API data

// This data will be replaced by actual API data

// This data will be replaced by actual API data

// This data will be replaced by actual API data

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [selectedWorker, setSelectedWorker] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  // API data state
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [workerPerformanceData, setWorkerPerformanceData] = useState<WorkerPerformance[]>([]);
  const [areaReports, setAreaReports] = useState<AreaReport[]>([]);
  const [paymentMethodReports, setPaymentMethodReports] = useState<PaymentMethodReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportsData();
  }, [selectedPeriod]); // Refetch when period changes

  // Auto-refresh data every 30 seconds for real-time sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReportsData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const periodParams = { period: selectedPeriod };

      const [monthly, workers, areas, paymentMethods] = await Promise.all([
        reportsApi.getMonthly(periodParams),
        reportsApi.getWorkerPerformance(periodParams),
        reportsApi.getAreaWise(periodParams),
        reportsApi.getPaymentMethods(periodParams),
      ]);

      setMonthlyReports(monthly);
      setWorkerPerformanceData(workers);
      setAreaReports(areas);
      setPaymentMethodReports(paymentMethods);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = (data: any[], filename: string) => {
    const csvContent = [
      Object.keys(data[0]).join(","),
      ...data.map(row => Object.values(row).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async (reportType: string = 'complete') => {
    try {
      setLoading(true);

      // Generate PDF with current period data
      const pdfData = {
        period: selectedPeriod,
        monthlyReports,
        workerPerformanceData,
        areaReports,
        paymentMethodReports,
        generatedAt: new Date().toISOString(),
        reportType
      };

      // Create text content (since we don't have a PDF library)
      const textContent = generateReportContent(pdfData);

      // Download as text file for now
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to export report:', error);
      setError('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const generateReportContent = (data: any): string => {
    const periodText = {
      '1month': 'Last Month',
      '3months': 'Last 3 Months',
      '6months': 'Last 6 Months',
      '1year': 'Last Year'
    }[selectedPeriod] || 'Selected Period';

    return `Business Report - ${periodText}
Generated: ${new Date().toLocaleDateString()}

=== SUMMARY ===
Total Revenue: ₹${totalRevenue.toLocaleString()}
Total Milk Sold: ${totalMilkSold.toLocaleString()}L
Active Customers: ${currentMonthData?.totalCustomers || 0}
Pending Dues: ₹${totalPendingDues.toLocaleString()}

=== MONTHLY DATA ===
${monthlyReports.map(m => `${m.month} ${m.year}: ₹${m.totalRevenue.toLocaleString()}`).join('\n')}

=== WORKER PERFORMANCE ===
${workerPerformanceData.map(w => `${w.workerName}: ${w.milkDelivered}L milk, ${w.customers} customers`).join('\n')}

=== AREA ANALYSIS ===
${areaReports.map(a => `${a.area}: ₹${a.revenue.toLocaleString()} revenue, ${a.customers} customers`).join('\n')}
`;
  };

  // Calculate statistics from API data for selected period
  const totalRevenue = monthlyReports.reduce((sum, month) => sum + month.totalRevenue, 0);
  const totalMilkSold = monthlyReports.reduce((sum, month) => sum + month.milkSold, 0);
  const totalPendingDues = monthlyReports.reduce((sum, month) => sum + month.pendingRevenue, 0);

  // Get period text for display
  const getPeriodText = () => {
    switch (selectedPeriod) {
      case '1month': return 'Last Month';
      case '3months': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case '1year': return 'Last Year';
      default: return 'Selected Period';
    }
  };

  // Calculate growth rates
  const currentMonthData = monthlyReports[monthlyReports.length - 1];
  const previousMonthData = monthlyReports[monthlyReports.length - 2];

  const revenueGrowth = currentMonthData && previousMonthData
    ? ((currentMonthData.totalRevenue - previousMonthData.totalRevenue) / previousMonthData.totalRevenue) * 100
    : 0;
  const milkGrowth = currentMonthData && previousMonthData
    ? ((currentMonthData.milkSold - previousMonthData.milkSold) / previousMonthData.milkSold) * 100
    : 0;
  const customerGrowth = currentMonthData && previousMonthData
    ? ((currentMonthData.totalCustomers - previousMonthData.totalCustomers) / previousMonthData.totalCustomers) * 100
    : 0;

  if (loading) {
    return (
      <Layout>
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={`skeleton-card-${i}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={`skeleton-chart-${i}`} className="h-64 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
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
              <Button variant="outline" size="sm" onClick={fetchReportsData}>
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
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
            <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and reporting based on daily billing and delivery data
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`h-2 w-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
              <span className="text-xs text-muted-foreground">
                {loading ? 'Updating data...' : `Real-time data • Last updated: ${new Date().toLocaleTimeString()}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchReportsData}
                disabled={loading}
                className="h-6 px-2 text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => handleExportPDF('complete-report')}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">+{revenueGrowth.toFixed(1)}%</span>
                for {getPeriodText().toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Milk Sold</CardTitle>
              <Milk className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMilkSold.toLocaleString()} L</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">+{milkGrowth.toFixed(1)}%</span>
                for {getPeriodText().toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonthData ? currentMonthData.totalCustomers : 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success">+{customerGrowth.toFixed(1)}%</span>
                growth in {getPeriodText().toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{totalPendingDues.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                For {getPeriodText().toLowerCase()} • {areaReports.filter(a => a.pendingDues > 0).length} areas affected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workers">Workers</TabsTrigger>
            <TabsTrigger value="areas">Areas</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Monthly Revenue Trend</CardTitle>
                    <CardDescription>Revenue collection over time</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportCSV(monthlyReports, `monthly-revenue-${selectedPeriod}`)}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ChartContainer height={300}>
                    <AreaChart data={monthlyReports.map(report => ({
                      month: `${report.month} ${report.year}`,
                      revenue: report.totalRevenue,
                      collected: report.collectedRevenue,
                      pending: report.pendingRevenue
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`₹${(value / 1000).toFixed(0)}K`, "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Milk Sales Volume</CardTitle>
                    <CardDescription>Monthly milk delivery in liters</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportCSV(monthlyReports, `milk-sales-${selectedPeriod}`)}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ChartContainer height={300}>
                    <BarChart data={monthlyReports.map(report => ({
                      month: `${report.month.slice(0, 3)} ${report.year}`,
                      milkSold: report.milkSold,
                      customers: report.totalCustomers
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`${value.toLocaleString()}L`, "Milk Sold"]} />
                      <Bar dataKey="milkSold" fill="#10b981" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Summary</CardTitle>
                <CardDescription>Detailed breakdown of monthly metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Milk Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Customers</TableHead>
                        <TableHead>Pending Dues</TableHead>
                        <TableHead>Collection Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReports.map((month) => (
                        <TableRow key={`${month.month}-${month.year}`}>
                          <TableCell className="font-medium">{month.month} {month.year}</TableCell>
                          <TableCell>{month.milkSold.toLocaleString()}L</TableCell>
                          <TableCell>₹{month.totalRevenue.toLocaleString()}</TableCell>
                          <TableCell>{month.totalCustomers}</TableCell>
                          <TableCell className={month.pendingRevenue > 0 ? "text-warning" : "text-success"}>
                            ₹{month.pendingRevenue.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {(month.collectedRevenue / month.totalRevenue * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workers" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Worker Performance</h3>
                <p className="text-muted-foreground">Analyze individual worker performance and efficiency</p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleExportCSV(workerPerformanceData, `worker-performance-${selectedPeriod}`)}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>


            <Card>
              <CardHeader>
                <CardTitle>Worker Performance Details</CardTitle>
                <CardDescription>Milk delivery and customer metrics for all workers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead>Area Coverage</TableHead>
                        <TableHead>Customers</TableHead>
                        <TableHead>Milk Delivered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workerPerformanceData.map((worker) => (
                        <TableRow key={`worker-${worker.workerId}-${worker.workerName}`}>
                          <TableCell className="font-medium">{worker.workerName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {worker.area}
                            </div>
                          </TableCell>
                          <TableCell>{worker.customers}</TableCell>
                          <TableCell>{worker.milkDelivered}L</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="areas" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Area-wise Analysis</h3>
                <p className="text-muted-foreground">Performance breakdown by geographical areas</p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleExportCSV(areaReports, `area-wise-report-${selectedPeriod}`)}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Area</CardTitle>
                  <CardDescription>Monthly revenue distribution across areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer height={300}>
                    <BarChart data={areaReports}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="area" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#10b981" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Distribution</CardTitle>
                  <CardDescription>Number of customers per area</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer height={300}>
                    <BarChart data={areaReports}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="area" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`${value} customers`, "Customer Count"]} />
                      <Bar dataKey="customers" fill="#3b82f6" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Payment Analytics</h3>
                <p className="text-muted-foreground">Payment method preferences and collection patterns</p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleExportCSV(paymentMethodReports, `payment-methods-${selectedPeriod}`)}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Payment Method</CardTitle>
                <CardDescription>Amount collected through each method</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer height={300}>
                  <BarChart data={paymentMethodReports.map(pm => ({ method: pm.method, amount: pm.amount, transactions: pm.transactions }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`₹${(value / 1000).toFixed(0)}K`, "Amount"]} />
                    <Bar dataKey="amount" fill="#f59e0b" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method Summary</CardTitle>
                <CardDescription>Detailed breakdown of payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {paymentMethodReports.map((method) => (
                    <div key={method.method} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full bg-primary"
                        ></div>
                        <div>
                          <p className="font-medium">{method.method}</p>
                          <p className="text-sm text-muted-foreground">{method.percentage.toFixed(1)}% of transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{method.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Monthly collection</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Business Growth</h3>
                <p className="text-muted-foreground">Customer acquisition and business expansion metrics</p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleExportCSV(monthlyReports, `customer-growth-${selectedPeriod}`)}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Growth Trend</CardTitle>
                <CardDescription>Monthly customer acquisition and total customer base</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer height={300}>
                  <LineChart data={monthlyReports.map(report => ({
                    month: report.month.slice(0, 3),
                    newCustomers: report.newCustomers,
                    totalCustomers: report.totalCustomers
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="totalCustomers"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Total Customers"
                    />
                    <Line
                      type="monotone"
                      dataKey="newCustomers"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="New Customers"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Average Customer Value</CardTitle>
                  <CardDescription>Monthly revenue per customer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{currentMonthData ? (currentMonthData.totalRevenue / currentMonthData.totalCustomers).toFixed(0) : '0'}</div>
                  <p className="text-xs text-muted-foreground">Per customer per month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Growth Rate</CardTitle>
                  <CardDescription>Monthly business growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">+{customerGrowth.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Customer base growth</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
