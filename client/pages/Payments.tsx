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
  Download,
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
} from "lucide-react";
import { format } from "date-fns";
import { paymentApi, customerApi, ApiError } from "@/lib/api-client";
import { Payment, RecordPaymentRequest, Customer } from "../../shared/api";

const paymentMethods = ["UPI", "Cash", "Bank Transfer", "Card", "Cheque"];

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("current");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newPayment, setNewPayment] = useState<RecordPaymentRequest>({
    customerId: 0,
    amount: 0,
    paymentMethod: "UPI",
    paidDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [paymentsData, customersData] = await Promise.all([
        paymentApi.getAll(),
        customerApi.getAll(),
      ]);

      setPayments(paymentsData);
      setCustomers(customersData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!newPayment.customerId || newPayment.amount <= 0) {
      return;
    }

    try {
      setSubmitting(true);
      const payment = await paymentApi.record(newPayment);
      setPayments([...payments, payment]);
      setNewPayment({
        customerId: 0,
        amount: 0,
        paymentMethod: "UPI",
        paidDate: format(new Date(), "yyyy-MM-dd"),
      });
      setIsPaymentDialogOpen(false);
    } catch (err) {
      console.error('Failed to record payment:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const customer = customers.find(c => c.id === payment.customerId);
    const customerName = customer?.name || '';
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer?.phone.includes(searchTerm);
    const matchesStatus = filterStatus === "all" || payment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidPayments = payments.filter(p => p.status === "paid");
  const pendingPayments = payments.filter(p => p.status === "pending");
  const overduePayments = payments.filter(p => p.status === "overdue");

  const collectedRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingRevenue = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const overdueRevenue = overduePayments.reduce((sum, p) => sum + p.amount, 0);
  const collectionRate = totalRevenue > 0 ? (collectedRevenue / totalRevenue) * 100 : 0;

  if (loading) {
    return (
      <Layout>
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
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
              <Button variant="outline" size="sm" onClick={fetchData}>
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }


  const handleSendReminder = (customer: any, type: string) => {
    // This would integrate with WhatsApp/SMS/Email services
    console.log(`Sending ${type} reminder to ${customer.customerName}`);
    alert(`${type} reminder sent to ${customer.customerName}!`);
  };

  const handleGenerateInvoice = (customer: any) => {
    // This would generate PDF invoice
    console.log(`Generating invoice for ${customer.customerName}`);
    alert(`Invoice generated for ${customer.customerName}!`);
  };

  // Calculate statistics

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments & Billing</h1>
            <p className="text-muted-foreground">
              Track payments, manage billing, and send payment reminders
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminders
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Payment Reminders</DialogTitle>
                  <DialogDescription>
                    Send bulk payment reminders to customers with pending dues
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm">
                    <p className="font-medium">Customers with pending payments:</p>
                    <ul className="mt-2 space-y-1">
                      {payments.filter(p => p.status === "pending" || p.status === "overdue").map(p => {
                        const customer = customers.find(c => c.id === p.customerId);
                        return (
                          <li key={p.id} className="flex justify-between">
                            <span>{customer?.name || `Customer ${p.customerId}`}</span>
                            <span className="text-warning">₹{p.amount}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    alert("Bulk reminders sent to all pending customers!");
                    setIsReminderDialogOpen(false);
                  }}>
                    Send All Reminders
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment received from a customer
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Customer</Label>
                    <Select onValueChange={(value) => setNewPayment({...newPayment, customerId: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name} - {customer.area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Payment Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value)})}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select value={newPayment.paymentMethod} onValueChange={(value) => setNewPayment({...newPayment, paymentMethod: value as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(newPayment.paidDate), "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={new Date(newPayment.paidDate)}
                          onSelect={(date) => date && setNewPayment({...newPayment, paidDate: format(date, "yyyy-MM-dd")})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordPayment} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Record Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total payments recorded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">₹{collectedRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {collectionRate.toFixed(1)}% collection rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{(pendingRevenue + overdueRevenue).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {pendingPayments.length + overduePayments.length} pending payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-success rounded-full"></div>
                  <span>{paidPayments.length} Paid</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-warning rounded-full"></div>
                  <span>{pendingPayments.length + overduePayments.length} Due</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Tracking */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Tracking</CardTitle>
            <CardDescription>Monitor payments and manage billing for all customers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={filterMonth} onValueChange={setFilterMonth} className="space-y-6">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="current">Current Month</TabsTrigger>
                  <TabsTrigger value="last">Last Month</TabsTrigger>
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
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="current" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Bill Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Method</TableHead>
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
                                <div className="text-sm text-muted-foreground">{customer?.area || 'Unknown Area'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">₹{payment.amount.toLocaleString()}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-success">
                                ₹{payment.status === "paid" ? payment.amount.toLocaleString() : "0"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`font-medium ${payment.status !== "paid" ? 'text-warning' : 'text-success'}`}>
                                ₹{payment.status !== "paid" ? payment.amount.toLocaleString() : "0"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{payment.dueDate}</div>
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
                              <div className="flex items-center gap-1 text-sm">
                                {payment.paymentMethod === "UPI" && <Smartphone className="h-3 w-3" />}
                                {payment.paymentMethod === "Cash" && <IndianRupee className="h-3 w-3" />}
                                {payment.paymentMethod === "Bank Transfer" && <CreditCard className="h-3 w-3" />}
                                {payment.paymentMethod}
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
                                    <FileText className="h-4 w-4 mr-2" />
                                    Generate Invoice
                                  </DropdownMenuItem>
                                  {payment.status !== "paid" && (
                                    <>
                                      <DropdownMenuItem>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Send WhatsApp
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Smartphone className="h-4 w-4 mr-2" />
                                        Send UPI Link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Send Payment Link
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    View History
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
              </TabsContent>

              <TabsContent value="last" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Bill Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Date</TableHead>
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
                                <div className="text-sm text-muted-foreground">{customer?.area || 'Unknown Area'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">₹{payment.amount.toLocaleString()}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-success">
                                ₹{payment.status === "paid" ? payment.amount.toLocaleString() : "0"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                payment.status === "paid" ? "default" :
                                payment.status === "overdue" ? "destructive" : "outline"
                              }>
                                {payment.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {payment.status === "overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {payment.paidDate || "Not paid"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>

            {filteredPayments.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No payments found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
