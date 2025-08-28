import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IndianRupee,
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  CreditCard,
  Smartphone,
  Receipt,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  Minus,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { paymentApi, customerApi, dailyApi, ApiError } from "@/lib/api-client";
import { PDFBillGenerator, shareViaWhatsApp, generateRazorpayPaymentLink, BillData, BusinessInfo } from "@/lib/pdf-generator";
import { Payment, RecordPaymentRequest, Customer, PaymentMethod } from "../../shared/api";

interface CustomerPaymentInfo extends Customer {
  lastMonthAmount: number;
  currentMonthAmount: number;
  paymentStatus: 'paid' | 'partial' | 'pending' | 'overdue';
  lastPaymentDate?: string;
  totalDue: number;
  lastMonthPaid: number;
  currentMonthPaid: number;
  isOverdue: boolean;
}

const paymentMethods = ["Cash"]; // Only cash payments are recorded manually

export default function Payments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<CustomerPaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("current-month");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPaymentInfo | null>(null);
  const [newPayment, setNewPayment] = useState<RecordPaymentRequest>({
    customerId: 0,
    amount: 0,
    paymentMethod: "Cash",
    paidDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [submitting, setSubmitting] = useState(false);
  const [generatingBill, setGeneratingBill] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Handle customer filtering from URL parameters
    const customerId = searchParams.get('customerId');
    const customerName = searchParams.get('customerName');

    if (customerId && customerName) {
      setSearchTerm(decodeURIComponent(customerName));
      setActiveTab('current-month'); // Show current month tab by default
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [customersResponse, paymentsResponse] = await Promise.all([
        customerApi.getAll(),
        paymentApi.getAll()
      ]);

      // Calculate payment info for each customer
      const customersWithPaymentInfo = customersResponse.map((customer): CustomerPaymentInfo => {
        const customerPayments = paymentsResponse.filter(p => p.customerId === customer.id);

        // Get current month and last month dates
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        // Calculate last month amount from deliveries
        const lastMonthAmount = customer.monthlyAmount || (customer.dailyQuantity * customer.ratePerLiter * 30);

        // Current month amount (bills up to current date)
        const currentMonthAmount = customer.currentMonthAmount || 0;

        // Calculate payments for last month
        const lastMonthPaid = customerPayments
          .filter(p => {
            const paymentDate = new Date(p.paidDate || p.createdAt);
            return p.status === 'paid' &&
                   paymentDate >= lastMonth &&
                   paymentDate < currentMonth;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        // Calculate payments for current month
        const currentMonthPaid = customerPayments
          .filter(p => {
            const paymentDate = new Date(p.paidDate || p.createdAt);
            return p.status === 'paid' && paymentDate >= currentMonth;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        // Check if customer has overdue payments (unpaid current month, last month, or earlier)
        const lastPaymentDate = customerPayments
          .filter(p => p.paidDate && p.status === 'paid')
          .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())[0]?.paidDate;

        // Customer is overdue if they have unpaid bills from current month, last month, or earlier months
        const hasCurrentMonthDue = currentMonthAmount > currentMonthPaid;
        const hasLastMonthDue = lastMonthAmount > lastMonthPaid;
        const hasEarlierDues = (customer.pendingDues || 0) > 0;
        const isOverdue = hasCurrentMonthDue || hasLastMonthDue || hasEarlierDues;

        // Calculate dues
        const lastMonthDue = Math.max(0, lastMonthAmount - lastMonthPaid);
        const currentMonthDue = Math.max(0, currentMonthAmount - currentMonthPaid);
        const adjustedPendingDues = (customer.pendingDues || 0) + lastMonthDue;
        const totalDue = currentMonthDue + adjustedPendingDues;

        // Determine payment status
        let paymentStatus: 'paid' | 'partial' | 'pending' | 'overdue' = 'pending';
        const totalPaid = customerPayments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        if (isOverdue && totalDue > 0) {
          paymentStatus = 'overdue';
        } else if (totalPaid >= totalDue && totalDue > 0) {
          paymentStatus = 'paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        }

        const lastPayment = customerPayments
          .filter(p => p.paidDate)
          .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())[0];

        return {
          ...customer,
          lastMonthAmount,
          currentMonthAmount,
          paymentStatus,
          lastPaymentDate: lastPayment?.paidDate,
          totalDue,
          pendingDues: adjustedPendingDues,
          lastMonthPaid,
          currentMonthPaid,
          isOverdue
        };
      });

      setCustomers(customersWithPaymentInfo);
      setPayments(paymentsResponse);
    } catch (err) {
      console.error('Failed to fetch payment data:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomer || newPayment.amount <= 0) return;

    try {
      setSubmitting(true);
      const payment = await paymentApi.record({
        ...newPayment,
        customerId: selectedCustomer.id
      });

      // Update customer's pending dues and refresh data
      await fetchData();
      
      setIsPaymentDialogOpen(false);
      setSelectedCustomer(null);
      setNewPayment({
        customerId: 0,
        amount: 0,
        paymentMethod: "Cash",
        paidDate: format(new Date(), "yyyy-MM-dd"),
      });
    } catch (err) {
      console.error('Failed to record payment:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };


  const handleSendBill = async (customer: CustomerPaymentInfo) => {
    try {
      setGeneratingBill(customer.id);
      
      // Get current month's delivery data
      const currentDate = new Date();
      const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = currentDate.getFullYear();
      
      // Get daily deliveries for this customer for current month
      const deliveries = await dailyApi.getDeliveries({ 
        customerId: customer.id,
      });

      // Filter deliveries for current month
      const currentMonthDeliveries = deliveries.filter(delivery => {
        const deliveryDate = new Date(delivery.date);
        return deliveryDate.getMonth() === currentDate.getMonth() && 
               deliveryDate.getFullYear() === currentYear;
      });

      // Transform delivery data for PDF
      const billDeliveries = currentMonthDeliveries.map(delivery => ({
        date: delivery.date,
        quantity: delivery.quantityDelivered,
        rate: delivery.ratePerLiter,
        amount: delivery.dailyAmount
      }));

      // Generate Razorpay payment link
      const billNumber = `BILL-${customer.id}-${currentMonth}${currentYear}`;
      const totalAmount = customer.totalDue;
      const paymentLink = await generateRazorpayPaymentLink(
        totalAmount, 
        customer.name, 
        customer.phone, 
        billNumber
      );

      // Prepare bill data
      const billData: BillData = {
        customer,
        dailyDeliveries: billDeliveries,
        currentMonthAmount: customer.currentMonthAmount || 0,
        pendingDues: customer.pendingDues || 0,
        totalAmount,
        billMonth: `${currentMonth}/${currentYear}`,
        billNumber,
        razorpayPaymentLink: paymentLink
      };

      // Business information (this would typically come from settings)
      const businessInfo: BusinessInfo = {
        name: "MilkFlow Delivery Service",
        address: "123 Main Street, City, State - 123456",
        phone: "+91 98765 43210",
        email: "contact@milkflow.com",
        gst: "29XXXXX1234X1ZX"
      };

      // Generate PDF
      const pdfGenerator = new PDFBillGenerator();
      const pdfBlob = await pdfGenerator.generateBill(billData, businessInfo);

      // Share via WhatsApp
      shareViaWhatsApp(customer.phone, pdfBlob, customer.name, totalAmount);

    } catch (err) {
      console.error('Failed to generate bill:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to generate bill');
    } finally {
      setGeneratingBill(null);
    }
  };

  const handleSendLastMonthBill = async (customer: CustomerPaymentInfo) => {
    try {
      setGeneratingBill(customer.id);

      // Get last month's delivery data
      const currentDate = new Date();
      const lastMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonth = (lastMonthDate.getMonth() + 1).toString().padStart(2, '0');
      const lastMonthYear = lastMonthDate.getFullYear();

      // Get daily deliveries for this customer for last month
      const deliveries = await dailyApi.getDeliveries({
        customerId: customer.id,
      });

      // Filter deliveries for last month
      const lastMonthDeliveries = deliveries.filter(delivery => {
        const deliveryDate = new Date(delivery.date);
        return deliveryDate.getMonth() === lastMonthDate.getMonth() &&
               deliveryDate.getFullYear() === lastMonthYear;
      });

      // Transform delivery data for PDF
      const billDeliveries = lastMonthDeliveries.map(delivery => ({
        date: delivery.date,
        quantity: delivery.quantityDelivered,
        rate: delivery.ratePerLiter,
        amount: delivery.dailyAmount
      }));

      // Generate Razorpay payment link for last month bill
      const billNumber = `BILL-${customer.id}-${lastMonth}${lastMonthYear}`;
      const lastMonthDue = Math.max(0, customer.lastMonthAmount - customer.lastMonthPaid);
      const paymentLink = await generateRazorpayPaymentLink(
        lastMonthDue,
        customer.name,
        customer.phone,
        billNumber
      );

      // Prepare bill data for last month
      const billData: BillData = {
        customer,
        dailyDeliveries: billDeliveries,
        currentMonthAmount: customer.lastMonthAmount,
        pendingDues: 0, // No previous dues for last month bill
        totalAmount: lastMonthDue,
        billMonth: `${lastMonth}/${lastMonthYear}`,
        billNumber,
        razorpayPaymentLink: paymentLink
      };

      // Business information (this would typically come from settings)
      const businessInfo: BusinessInfo = {
        name: "MilkFlow Delivery Service",
        address: "123 Main Street, City, State - 123456",
        phone: "+91 98765 43210",
        email: "contact@milkflow.com",
        gst: "29XXXXX1234X1ZX"
      };

      // Generate PDF
      const pdfGenerator = new PDFBillGenerator();
      const pdfBlob = await pdfGenerator.generateBill(billData, businessInfo);

      // Share via WhatsApp
      shareViaWhatsApp(customer.phone, pdfBlob, customer.name, lastMonthDue);

    } catch (err) {
      console.error('Failed to generate last month bill:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to generate last month bill');
    } finally {
      setGeneratingBill(null);
    }
  };

  const handleQuickPayment = (customer: CustomerPaymentInfo) => {
    setSelectedCustomer(customer);
    setNewPayment({
      customerId: customer.id,
      amount: customer.totalDue,
      paymentMethod: "Cash",
      paidDate: format(new Date(), "yyyy-MM-dd"),
    });
    setIsPaymentDialogOpen(true);
  };

  // Filter customers based on active tab
  const getFilteredCustomers = () => {
    let baseCustomers = customers;

    // Filter by tab type
    if (activeTab === "current-month") {
      // Show customers with current month bills
      baseCustomers = customers.filter(c => c.currentMonthAmount > 0);
    } else if (activeTab === "last-month") {
      // Show customers with last month data
      baseCustomers = customers.filter(c => c.lastMonthAmount > 0);
    } else if (activeTab === "overdue") {
      // Show customers who haven't paid current month, last month, or have earlier dues
      baseCustomers = customers.filter(c => c.isOverdue && c.totalDue > 0);
    }

    // Apply search and status filters
    return baseCustomers.filter((customer) => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.phone.includes(searchTerm);
      const matchesStatus = filterStatus === "all" || customer.paymentStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredCustomers = getFilteredCustomers();

  const filteredPayments = payments.filter((payment) => {
    const customer = customers.find(c => c.id === payment.customerId);
    const customerName = customer?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer?.phone.includes(searchTerm);
    const matchesStatus = filterStatus === "all" || payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary statistics
  const totalCurrentMonth = customers.reduce((sum, c) => sum + c.currentMonthAmount, 0);
  const totalLastMonth = customers.reduce((sum, c) => sum + c.lastMonthAmount, 0);
  const totalPendingDues = customers.reduce((sum, c) => sum + c.pendingDues, 0);
  const paidCustomers = customers.filter(c => c.paymentStatus === 'paid').length;
  const overdueCustomers = customers.filter(c => c.isOverdue && c.totalDue > 0).length;
  const overdueAmount = customers.filter(c => c.isOverdue).reduce((sum, c) => sum + c.totalDue, 0);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const collectedRevenue = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const collectionRate = totalCurrentMonth > 0 ? (collectedRevenue / totalCurrentMonth) * 100 : 0;

  if (loading) {
    return (
      <Layout>
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
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
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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
            <h1 className="text-3xl font-bold tracking-tight">Payments & Billing</h1>
            <p className="text-muted-foreground">
              Track customer payments, bills, and dues with detailed monthly breakdowns
            </p>
            {searchParams.get('customerName') && (
              <div className="mt-2">
                <Badge variant="outline" className="text-sm">
                  Filtered by: {decodeURIComponent(searchParams.get('customerName')!)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-4 w-4 p-0"
                    onClick={() => {
                      setSearchParams({});
                      setSearchTerm('');
                    }}
                  >
                    ×
                  </Button>
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Month Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalCurrentMonth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {customers.length} customers this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">₹{collectedRevenue.toLocaleString()}</div>
              <div className="flex items-center text-xs">
                <TrendingUp className="h-3 w-3 text-success mr-1" />
                <span className="text-success">{collectionRate.toFixed(1)}% collection rate</span>
              </div>
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
                {overdueCustomers} customers overdue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{paidCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {((paidCustomers / customers.length) * 100).toFixed(1)}% customers paid
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Payment Tracking and Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Management</CardTitle>
            <CardDescription>
              Monitor customer payments and manage billing with detailed tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="current-month">Current Month</TabsTrigger>
                  <TabsTrigger value="last-month">Last Month</TabsTrigger>
                  <TabsTrigger value="overdue">Overdue Customers</TabsTrigger>
                  <TabsTrigger value="history">Payment History</TabsTrigger>
                </TabsList>
                
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current Month Tab */}
              <TabsContent value="current-month" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Current Month Bills</h3>
                    <p className="text-sm text-muted-foreground">
                      Bills for {format(new Date(), "MMMM yyyy")} up to current date
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₹{totalCurrentMonth.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{filteredCustomers.length} customers</div>
                  </div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Last Month</TableHead>
                        <TableHead>Current Month</TableHead>
                        <TableHead>Pending Dues</TableHead>
                        <TableHead>Total Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Payment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">{customer.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">₹{customer.lastMonthAmount.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              Paid: ₹{customer.lastMonthPaid.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">₹{customer.currentMonthAmount.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              Paid: ₹{customer.currentMonthPaid.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.pendingDues > 0 ? (
                              <span className="text-warning font-medium">
                                ₹{customer.pendingDues.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-lg">
                              ₹{customer.totalDue.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              customer.paymentStatus === "paid" ? "default" :
                              customer.paymentStatus === "partial" ? "secondary" :
                              customer.paymentStatus === "overdue" ? "destructive" : "outline"
                            }>
                              {customer.paymentStatus === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {customer.paymentStatus === "overdue" && <XCircle className="h-3 w-3 mr-1" />}
                              {customer.paymentStatus === "partial" && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {customer.paymentStatus.charAt(0).toUpperCase() + customer.paymentStatus.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {customer.lastPaymentDate ? (
                              <span className="text-sm">
                                {format(new Date(customer.lastPaymentDate), "MMM dd, yyyy")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">No payments</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Payment Actions</DropdownMenuLabel>
                                <DropdownMenuItem 
                                  onClick={() => handleSendBill(customer)}
                                  disabled={generatingBill === customer.id}
                                >
                                  {generatingBill === customer.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4 mr-2" />
                                  )}
                                  {generatingBill === customer.id ? 'Generating...' : 'Send Bill via WhatsApp'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickPayment(customer)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Record Cash Payment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No customers found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </TabsContent>

              {/* Last Month Tab */}
              <TabsContent value="last-month" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Last Month Bills</h3>
                    <p className="text-sm text-muted-foreground">
                      Payment status for {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "MMMM yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₹{totalLastMonth.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{filteredCustomers.length} customers</div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Last Month Bill</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Remaining Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Payment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => {
                        const lastMonthDue = Math.max(0, customer.lastMonthAmount - customer.lastMonthPaid);
                        const lastMonthStatus = customer.lastMonthPaid >= customer.lastMonthAmount ? 'paid' :
                                              customer.lastMonthPaid > 0 ? 'partial' : 'pending';

                        return (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">{customer.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">₹{customer.lastMonthAmount.toLocaleString()}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-green-600">₹{customer.lastMonthPaid.toLocaleString()}</div>
                            </TableCell>
                            <TableCell>
                              {lastMonthDue > 0 ? (
                                <span className="text-warning font-medium">
                                  ₹{lastMonthDue.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-green-600">Paid</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                lastMonthStatus === "paid" ? "default" :
                                lastMonthStatus === "partial" ? "secondary" : "outline"
                              }>
                                {lastMonthStatus === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {lastMonthStatus === "partial" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {lastMonthStatus.charAt(0).toUpperCase() + lastMonthStatus.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {customer.lastPaymentDate ? (
                                <span className="text-sm">
                                  {format(new Date(customer.lastPaymentDate), "MMM dd, yyyy")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">No payments</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Payment Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleQuickPayment(customer)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Cash Payment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No customers found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </TabsContent>

              {/* Overdue Customers Tab */}
              <TabsContent value="overdue" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Overdue Customers</h3>
                    <p className="text-sm text-muted-foreground">
                      Customers who haven't paid for over 3 months
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-destructive">₹{overdueAmount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{filteredCustomers.length} customers</div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Outstanding</TableHead>
                        <TableHead>Last Payment</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => {
                        const daysSinceLastPayment = customer.lastPaymentDate ?
                          Math.floor((new Date().getTime() - new Date(customer.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)) :
                          999;

                        return (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">{customer.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-destructive text-lg">
                                ₹{customer.totalDue.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Current: ₹{customer.currentMonthAmount.toLocaleString()} |
                                Pending: ₹{customer.pendingDues.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {customer.lastPaymentDate ? (
                                <div>
                                  <span className="text-sm">
                                    {format(new Date(customer.lastPaymentDate), "MMM dd, yyyy")}
                                  </span>
                                  <div className="text-xs text-muted-foreground">
                                    ₹{(customer.lastMonthPaid || 0) + (customer.currentMonthPaid || 0)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No payments</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-destructive font-medium">
                                {daysSinceLastPayment > 999 ? '999+' : daysSinceLastPayment} days
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Payment Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleSendBill(customer)}
                                    disabled={generatingBill === customer.id}
                                  >
                                    {generatingBill === customer.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <FileText className="h-4 w-4 mr-2" />
                                    )}
                                    {generatingBill === customer.id ? 'Sending...' : 'Send Bill via WhatsApp'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleQuickPayment(customer)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Cash Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No overdue customers</h3>
                    <p className="text-muted-foreground">All customers are up to date with their payments!</p>
                  </div>
                )}
              </TabsContent>

              {/* Payment History Tab */}
              <TabsContent value="history" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => {
                        const customer = customers.find(c => c.id === payment.customerId);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{customer?.name || `Customer ${payment.customerId}`}</div>
                                <div className="text-sm text-muted-foreground">{customer?.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`font-medium ${payment.amount < 0 ? 'text-destructive' : ''}`}>
                                {payment.amount < 0 ? '-₹' : '₹'}{Math.abs(payment.amount).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                {payment.paymentMethod === "UPI" && <Smartphone className="h-3 w-3" />}
                                {payment.paymentMethod === "Cash" && <IndianRupee className="h-3 w-3" />}
                                {payment.paymentMethod === "Bank Transfer" && <CreditCard className="h-3 w-3" />}
                                {payment.paymentMethod}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {payment.paidDate ? format(new Date(payment.paidDate), "MMM dd, yyyy") : "Not paid"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                payment.status === "paid" ? "default" :
                                payment.status === "partial" ? "secondary" :
                                payment.status === "overdue" ? "destructive" : "outline"
                              }>
                                {payment.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {payment.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                {payment.status === "overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground max-w-32 truncate">
                                {payment.notes || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    View Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Payment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {filteredPayments.length === 0 && (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No payments found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Payment Recording Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Cash Payment</DialogTitle>
              <DialogDescription>
                Record a cash payment received from {selectedCustomer?.name}. Online payments are automatically updated.
              </DialogDescription>
            </DialogHeader>

            {selectedCustomer && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Month Amount:</span>
                      <span>₹{selectedCustomer.currentMonthAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending Dues:</span>
                      <span>₹{selectedCustomer.pendingDues.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span>Total Due:</span>
                      <span>₹{selectedCustomer.totalDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newPayment.amount || ""}
                      onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Input value="Cash" disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      Only cash payments are recorded manually. Online payments (UPI, Card, etc.) are automatically updated when customers pay through Razorpay.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidDate">Payment Date</Label>
                  <Input
                    id="paidDate"
                    type="date"
                    value={newPayment.paidDate}
                    onChange={(e) => setNewPayment({...newPayment, paidDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newPayment.notes || ""}
                    onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                    placeholder="Additional notes..."
                  />
                  {newPayment.amount > 0 && newPayment.amount < selectedCustomer?.totalDue && (
                    <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                      <div className="flex items-center gap-2 text-info">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Partial Payment</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Remaining balance: ₹{((selectedCustomer?.totalDue || 0) - newPayment.amount).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordPayment} disabled={submitting || newPayment.amount <= 0}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Record Cash Payment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
