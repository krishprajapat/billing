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
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Milk,
  IndianRupee,
  Users,
  Truck,
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { customerApi, workerApi, dailyApi, areaApi, ApiError } from "@/lib/api-client";
import { Customer, CreateCustomerRequest, UpdateCustomerRequest, Worker, Area } from "../../shared/api";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<CreateCustomerRequest>({
    name: "",
    phone: "",
    address: "",
    areaId: 0,
    dailyQuantity: 1,
    ratePerLiter: 60,
    workerId: 0,
    status: "active",
  });
  const [editCustomer, setEditCustomer] = useState<UpdateCustomerRequest>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset worker selection when area changes in new customer form
  useEffect(() => {
    if (newCustomer.areaId) {
      const availableWorkers = workers.filter(w => w.areaId === newCustomer.areaId && w.status === 'active');
      if (availableWorkers.length === 0 || !availableWorkers.find(w => w.id === newCustomer.workerId)) {
        setNewCustomer(prev => ({ ...prev, workerId: 0 }));
      }
    }
  }, [newCustomer.areaId, workers]);

  // Reset worker selection when area changes in edit customer form
  useEffect(() => {
    if (editCustomer.areaId) {
      const availableWorkers = workers.filter(w => w.areaId === editCustomer.areaId && w.status === 'active');
      if (availableWorkers.length === 0 || !availableWorkers.find(w => w.id === editCustomer.workerId)) {
        setEditCustomer(prev => ({ ...prev, workerId: 0 }));
      }
    }
  }, [editCustomer.areaId, workers]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [customersData, workersData, areasData] = await Promise.all([
        customerApi.getAll(),
        workerApi.getAll(),
        areaApi.getAll(),
      ]);

      setCustomers(customersData);
      setWorkers(workersData);
      setAreas(areasData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm) ||
                         customer.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || customer.status === filterStatus;
    const matchesArea = filterArea === "all" || customer.areaId.toString() === filterArea;

    return matchesSearch && matchesStatus && matchesArea;
  });

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.address) {
      return;
    }

    try {
      setSubmitting(true);
      const customer = await customerApi.create(newCustomer);
      setCustomers([...customers, customer]);
      setNewCustomer({
        name: "",
        phone: "",
        address: "",
        areaId: 0,
        dailyQuantity: 1,
        ratePerLiter: 60,
        workerId: 0,
        status: "active",
      });
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to create customer:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCustomer({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      areaId: customer.areaId,
      dailyQuantity: customer.dailyQuantity,
      ratePerLiter: customer.ratePerLiter,
      workerId: customer.workerId,
      status: customer.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editCustomer.name || !editCustomer.phone || !editCustomer.address) {
      return;
    }

    try {
      setSubmitting(true);

      // Check if area is being changed
      const isAreaChanged = editCustomer.areaId && editCustomer.areaId !== editingCustomer.areaId;

      if (isAreaChanged) {
        const confirmChange = confirm(
          `Changing customer's area will unassign their current worker. Are you sure you want to continue?`
        );
        if (!confirmChange) {
          setSubmitting(false);
          return;
        }

        // Unassign worker when area changes (since worker may not serve the new area)
        editCustomer.workerId = 0;
      }

      const updatedCustomer = await customerApi.update(editingCustomer.id, editCustomer);
      setCustomers(customers.map(c =>
        c.id === editingCustomer.id ? updatedCustomer : c
      ));
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      setEditCustomer({});
    } catch (err) {
      console.error('Failed to update customer:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      await customerApi.delete(id);
      setCustomers(customers.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete customer:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to delete customer');
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    try {
      const newStatus = customer.status === "active" ? "inactive" : "active";
      const updatedCustomer = await customerApi.update(customer.id, { status: newStatus });
      setCustomers(customers.map(c =>
        c.id === customer.id ? updatedCustomer : c
      ));
    } catch (err) {
      console.error('Failed to update customer status:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to update customer status');
    }
  };

  const handleGenerateQuantityLink = async (customer: Customer) => {
    try {
      const linkData = await dailyApi.generateQuantityLink(customer.id);
      const baseUrl = window.location.origin;
      const customerLink = `${baseUrl}/customer/${linkData.uniqueToken}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(customerLink);

      // Show success message (you could use a toast here)
      alert(`Customer link copied to clipboard!\n\nLink: ${customerLink}\n\nShare this link with ${customer.name} to allow them to change their milk quantity for tomorrow.`);
    } catch (err) {
      console.error('Failed to generate customer link:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to generate customer link');
    }
  };

  // Calculate statistics based on daily billing
  const totalActiveCustomers = customers.filter(c => c.status === "active").length;
  const totalPendingDues = customers.reduce((sum, c) => sum + (c.pendingDues || 0), 0);
  const totalMonthlyRevenue = customers.filter(c => c.status === "active")
    .reduce((sum, c) => sum + (c.monthlyAmount || 0), 0); // Use actual daily accumulated amount
  const currentDayOfMonth = new Date().getDate();
  const totalCurrentMonthDeliveries = customers.filter(c => c.status === "active")
    .reduce((sum, c) => sum + (c.currentMonthDeliveries || 0), 0);

  if (loading) {
    return (
      <Layout>
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
            <p className="text-muted-foreground">
              Manage your customers, track deliveries, and handle billing
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Enter customer details to add them to your delivery route
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    placeholder="Enter full address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area">Area/Sector</Label>
                    <Select value={newCustomer.areaId ? newCustomer.areaId.toString() : ""} onValueChange={(value) => setNewCustomer({...newCustomer, areaId: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id.toString()}>{area.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker">Assign Worker</Label>
                    <Select value={newCustomer.workerId ? newCustomer.workerId.toString() : ""} onValueChange={(value) => setNewCustomer({...newCustomer, workerId: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No worker assigned</SelectItem>
                        {workers.filter(worker => worker.areaId === newCustomer.areaId && worker.status === 'active').map((worker) => (
                          <SelectItem key={worker.id} value={worker.id.toString()}>
                            {worker.name} - {worker.areaName || 'No area'}
                          </SelectItem>
                        ))}
                        {newCustomer.areaId && workers.filter(worker => worker.areaId === newCustomer.areaId && worker.status === 'active').length === 0 && (
                          <SelectItem value="no-workers" disabled>No workers available in this area</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Daily Quantity (Liters)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newCustomer.dailyQuantity}
                      onChange={(e) => setNewCustomer({...newCustomer, dailyQuantity: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rate">Rate per Liter (₹)</Label>
                    <Input
                      id="rate"
                      type="number"
                      value={newCustomer.ratePerLiter}
                      onChange={(e) => setNewCustomer({...newCustomer, ratePerLiter: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Estimated Monthly Amount: ₹{(newCustomer.dailyQuantity * newCustomer.ratePerLiter * 30).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Actual amount will be calculated from daily deliveries
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCustomer} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Customer Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>
                  Update customer details
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editName">Full Name</Label>
                    <Input
                      id="editName"
                      value={editCustomer.name || ""}
                      onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">Phone Number</Label>
                    <Input
                      id="editPhone"
                      value={editCustomer.phone || ""}
                      onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAddress">Address</Label>
                  <Textarea
                    id="editAddress"
                    value={editCustomer.address || ""}
                    onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
                    placeholder="Enter full address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editArea">Area/Sector</Label>
                    <Select value={editCustomer.areaId?.toString() || ""} onValueChange={(value) => setEditCustomer({...editCustomer, areaId: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id.toString()}>{area.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editWorker">Assign Worker</Label>
                    <Select value={editCustomer.workerId?.toString() || ""} onValueChange={(value) => setEditCustomer({...editCustomer, workerId: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No worker assigned</SelectItem>
                        {workers.filter(worker => worker.areaId === editCustomer.areaId && worker.status === 'active').map((worker) => (
                          <SelectItem key={worker.id} value={worker.id.toString()}>
                            {worker.name} - {worker.areaName || 'No area'}
                          </SelectItem>
                        ))}
                        {editCustomer.areaId && workers.filter(worker => worker.areaId === editCustomer.areaId && worker.status === 'active').length === 0 && (
                          <SelectItem value="no-workers" disabled>No workers available in this area</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editQuantity">Daily Quantity (Liters)</Label>
                    <Input
                      id="editQuantity"
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={editCustomer.dailyQuantity || ""}
                      onChange={(e) => setEditCustomer({...editCustomer, dailyQuantity: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editRate">Rate per Liter (₹)</Label>
                    <Input
                      id="editRate"
                      type="number"
                      value={editCustomer.ratePerLiter || ""}
                      onChange={(e) => setEditCustomer({...editCustomer, ratePerLiter: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editStatus">Status</Label>
                    <Select value={editCustomer.status || ""} onValueChange={(value) => setEditCustomer({...editCustomer, status: value as any})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="pt-4 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Current Monthly Amount: ₹{(editingCustomer?.monthlyAmount || 0).toLocaleString()}
                    <span className="text-xs ml-2">({editingCustomer?.currentMonthDeliveries || 0} days)</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Estimated Monthly (with changes): ₹{((editCustomer.dailyQuantity || 0) * (editCustomer.ratePerLiter || 0) * 30).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCustomer} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActiveCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {customers.length - totalActiveCustomers} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalMonthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Daily totals till {currentDayOfMonth} days (accumulated)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
              <IndianRupee className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{totalPendingDues.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Needs collection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
            <CardDescription>View and manage all your customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Daily Order</TableHead>
                    <TableHead>Monthly Amount (Daily Totals)</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dues</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {customer.areaName || 'No area assigned'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Milk className="h-4 w-4 text-muted-foreground" />
                          {customer.dailyQuantity}L @ ₹{customer.ratePerLiter}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₹{(customer.monthlyAmount || 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {customer.currentMonthDeliveries || 0} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          {workers.find(w => w.id === customer.workerId)?.name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                          {customer.status === "active" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(customer.pendingDues || 0) > 0 ? (
                          <span className="text-warning font-medium">₹{(customer.pendingDues || 0).toLocaleString()}</span>
                        ) : (
                          <span className="text-success">Paid</span>
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateQuantityLink(customer)}>
                              <Milk className="h-4 w-4 mr-2" />
                              Generate Quantity Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(customer)}>
                              {customer.status === "active" ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Mark Inactive
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Active
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
