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
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [monthly, workers, areas, paymentMethods] = await Promise.all([
        reportsApi.getMonthly(),
        reportsApi.getWorkerPerformance(),
        reportsApi.getAreaWise(),
        reportsApi.getPaymentMethods(),
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

  const handleExportPDF = (title: string) => {
    // In a real app, this would generate a PDF report
    alert(`PDF report "${title}" would be generated and downloaded.`);
  };

  // Calculate statistics from API data
  const totalRevenue = monthlyReports.reduce((sum, month) => sum + month.totalRevenue, 0);
  const totalMilkSold = monthlyReports.reduce((sum, month) => sum + month.milkSold, 0);
  const totalPendingDues = monthlyReports.reduce((sum, month) => sum + month.pendingRevenue, 0);

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
          </div>
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExportPDF("Complete Business Report")}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
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
                from last month
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
                from last month
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
                growth this month
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
                Across {areaReports.filter(a => a.pendingDues > 0).length} areas
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
                  <Button variant="ghost" size="sm" onClick={() => handleExportCSV(monthlyReports, "monthly-revenue")}>
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
                  <Button variant="ghost" size="sm" onClick={() => handleExportCSV(monthlyReports, "milk-sales")}>
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
              <Button variant="outline" onClick={() => handleExportCSV(workerPerformanceData, "worker-performance")}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Worker</CardTitle>
                <CardDescription>Monthly revenue generated by each delivery worker</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer height={300}>
                  <BarChart data={workerPerformanceData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Worker Performance Details</CardTitle>
                <CardDescription>Comprehensive performance metrics for all workers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Worker</TableHead>
                        <TableHead>Area Coverage</TableHead>
                        <TableHead>Customers</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Milk Delivered</TableHead>
                        <TableHead>Efficiency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workerPerformanceData.map((worker) => (
                        <TableRow key={worker.workerName}>
                          <TableCell className="font-medium">{worker.workerName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {worker.area}
                            </div>
                          </TableCell>
                          <TableCell>{worker.customers}</TableCell>
                          <TableCell>₹{worker.revenue.toLocaleString()}</TableCell>
                          <TableCell>{worker.milkDelivered}L</TableCell>
                          <TableCell>
                            <Badge variant={worker.efficiency >= 95 ? "default" : worker.efficiency >= 90 ? "secondary" : "outline"}>
                              {worker.efficiency}%
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

          <TabsContent value="areas" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Area-wise Analysis</h3>
                <p className="text-muted-foreground">Performance breakdown by geographical areas</p>
              </div>
              <Button variant="outline" onClick={() => handleExportCSV(areaReports, "area-wise-report")}>
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
                    <PieChart>
                      <Pie
                        data={areaReports}
                        dataKey="customers"
                        nameKey="area"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#3b82f6"
                        label={({ area, customers }) => `${area}: ${customers}`}
                      >
                        {areaReports.map((entry, index) => (
                          <Cell key={`area-cell-${entry.area}-${index}`} fill={`hsl(${210 + index * 40}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Area Performance Details</CardTitle>
                <CardDescription>Detailed metrics for each service area</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead>Customers</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Milk Sold</TableHead>
                        <TableHead>Pending Dues</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {areaReports.map((area) => (
                        <TableRow key={area.area}>
                          <TableCell className="font-medium">{area.area}</TableCell>
                          <TableCell>{area.customers}</TableCell>
                          <TableCell>₹{area.revenue.toLocaleString()}</TableCell>
                          <TableCell>{area.milkSold}L</TableCell>
                          <TableCell className={area.pendingDues > 0 ? "text-warning" : "text-success"}>
                            ₹{area.pendingDues.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={area.pendingDues === 0 ? "default" : "destructive"}>
                              {area.pendingDues === 0 ? "All Clear" : "Has Dues"}
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

          <TabsContent value="payments" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Payment Analytics</h3>
                <p className="text-muted-foreground">Payment method preferences and collection patterns</p>
              </div>
              <Button variant="outline" onClick={() => handleExportCSV(paymentMethodReports, "payment-methods")}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method Distribution</CardTitle>
                  <CardDescription>Customer preference by payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethodReports.map(pm => ({ name: pm.method, value: pm.percentage }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {paymentMethodReports.map((entry, index) => (
                          <Cell key={`payment-cell-${entry.method}-${index}`} fill={`hsl(${210 + index * 60}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Payment Method</CardTitle>
                  <CardDescription>Amount collected through each method</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer height={300}>
                    <BarChart data={paymentMethodReports.map(pm => ({ method: pm.method, amount: pm.amount, transactions: pm.transactions }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`₹${(value / 1000).toFixed(0)}K`, "Amount"]} />
                      <Bar dataKey="amount" fill="#f59e0b" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

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
              <Button variant="outline" onClick={() => handleExportCSV(monthlyReports, "customer-growth")}>
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
                  }))}>,
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

            <div className="grid gap-6 md:grid-cols-3">
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
                  <CardTitle>Customer Retention</CardTitle>
                  <CardDescription>Monthly retention rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">96.8%</div>
                  <p className="text-xs text-muted-foreground">Customers retained monthly</p>
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
