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
import { Progress } from "@/components/ui/progress";
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
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Users,
  IndianRupee,
  Truck,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Star,
  UserCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { workerApi, customerApi, areaApi, ApiError } from "@/lib/api-client";
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Customer, Area } from "../../shared/api";

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isManageCustomersDialogOpen, setIsManageCustomersDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerCustomers, setWorkerCustomers] = useState<Customer[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [newWorker, setNewWorker] = useState<CreateWorkerRequest>({
    name: "",
    phone: "",
    email: "",
    areaId: 0,
    address: "",
    emergencyContact: "",
    status: "active",
  });
  const [editWorker, setEditWorker] = useState<UpdateWorkerRequest>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [workersData, customersData, areasData] = await Promise.all([
        workerApi.getAll(),
        customerApi.getAll(),
        areaApi.getAll()
      ]);

      setWorkers(workersData);
      setCustomers(customersData);
      setAreas(areasData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.phone.includes(searchTerm) ||
                         (worker.area || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || worker.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleAddWorker = async () => {
    if (!newWorker.name || !newWorker.phone || !newWorker.email) {
      return;
    }

    try {
      setSubmitting(true);
      const worker = await workerApi.create(newWorker);
      setWorkers([...workers, worker]);
      setNewWorker({
        name: "",
        phone: "",
        email: "",
        area: "",
        address: "",
        emergencyContact: "",
        status: "active",
      });
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to create worker:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to create worker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setEditWorker({
      name: worker.name,
      phone: worker.phone,
      email: worker.email,
      areaId: worker.areaId,
      address: worker.address,
      emergencyContact: worker.emergencyContact,
      status: worker.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateWorker = async () => {
    if (!editingWorker || !editWorker.name || !editWorker.phone || !editWorker.email) {
      return;
    }

    try {
      setSubmitting(true);

      // Check if area is being changed
      const isAreaChanged = editWorker.areaId && editWorker.areaId !== editingWorker.areaId;

      if (isAreaChanged) {
        const confirmChange = confirm(
          `Changing worker's area will unassign all their current customers. Are you sure you want to continue?`
        );
        if (!confirmChange) {
          setSubmitting(false);
          return;
        }

        // Unassign all customers from this worker before area change
        const workerCustomers = customers.filter(c => c.workerId === editingWorker.id);
        for (const customer of workerCustomers) {
          await customerApi.update(customer.id, { workerId: 0 });
        }
      }

      const updatedWorker = await workerApi.update(editingWorker.id, editWorker);
      setWorkers(workers.map(w =>
        w.id === editingWorker.id ? updatedWorker : w
      ));

      // Refresh data to update customer assignments
      if (isAreaChanged) {
        await fetchData();
      }

      setIsEditDialogOpen(false);
      setEditingWorker(null);
      setEditWorker({});
    } catch (err) {
      console.error('Failed to update worker:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to update worker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorker = async (id: number) => {
    try {
      await workerApi.delete(id);
      setWorkers(workers.filter(w => w.id !== id));
    } catch (err) {
      console.error('Failed to delete worker:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to delete worker');
    }
  };

  const handleToggleStatus = async (worker: Worker) => {
    try {
      const newStatus = worker.status === "active" ? "inactive" : "active";
      const updatedWorker = await workerApi.update(worker.id, { status: newStatus });
      setWorkers(workers.map(w =>
        w.id === worker.id ? updatedWorker : w
      ));
    } catch (err) {
      console.error('Failed to update worker status:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to update worker status');
    }
  };

  const handleManageCustomers = async (worker: Worker) => {
    setSelectedWorker(worker);
    setSubmitting(true);
    
    try {
      const [workerCustomersData, allCustomersData] = await Promise.all([
        workerApi.getCustomers(worker.id),
        customerApi.getAll()
      ]);
      
      setWorkerCustomers(workerCustomersData);
      setAvailableCustomers(allCustomersData.filter(c => c.workerId !== worker.id));
      setIsManageCustomersDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch customer data:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load customer data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssignDialog = () => {
    setSelectedCustomerIds([]);
    setAvailableCustomers(customers.filter(c => c.status === 'active'));
    setIsAssignDialogOpen(true);
  };

  const handleAssignCustomers = async () => {
    if (!selectedWorker || selectedCustomerIds.length === 0) return;
    
    try {
      setSubmitting(true);
      await workerApi.assignCustomers(selectedWorker.id, selectedCustomerIds);
      
      // Refresh data
      await fetchData();
      
      setIsAssignDialogOpen(false);
      setSelectedWorker(null);
      setSelectedCustomerIds([]);
    } catch (err) {
      console.error('Failed to assign customers:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to assign customers');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignCustomer = async (customerId: number) => {
    try {
      await customerApi.update(customerId, { workerId: 0 });
      
      // Refresh worker customers
      if (selectedWorker) {
        const updatedWorkerCustomers = await workerApi.getCustomers(selectedWorker.id);
        setWorkerCustomers(updatedWorkerCustomers);
        
        // Refresh all data to update stats
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to unassign customer:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to unassign customer');
    }
  };

  // Calculate statistics
  const totalActiveWorkers = workers.filter(w => w.status === "active").length;
  const totalRevenue = workers.reduce((sum, w) => sum + (w.monthlyRevenue || 0), 0);
  const averageEfficiency = workers.length > 0
    ? workers.reduce((sum, w) => sum + (w.efficiency || 0), 0) / workers.length
    : 0;

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

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Delivery Workers</h1>
            <p className="text-muted-foreground">
              Manage your delivery team, track performance, and assign routes
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleOpenAssignDialog}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Customers
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Customers to Worker</DialogTitle>
                  <DialogDescription>
                    Select a worker and manage their customer assignments
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Worker</Label>
                    <Select value={selectedWorker?.id.toString() || ""} onValueChange={(value) => setSelectedWorker(workers.find(w => w.id === parseInt(value)) || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose worker" />
                      </SelectTrigger>
                      <SelectContent>
                        {workers.filter(w => w.status === "active").map((worker) => (
                          <SelectItem key={worker.id} value={worker.id.toString()}>
                            {worker.name} - {worker.areaName || 'No area'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedWorker && (
                    <div className="space-y-2">
                      <Label>Select Customers to Assign</Label>
                      <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                        {availableCustomers.map((customer) => (
                          <div key={customer.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`customer-${customer.id}`}
                              checked={selectedCustomerIds.includes(customer.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                                } else {
                                  setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`customer-${customer.id}`} className="text-sm flex-1 cursor-pointer">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-muted-foreground">{customer.area} - {customer.dailyQuantity}L/day</div>
                            </label>
                          </div>
                        ))}
                        {availableCustomers.length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No available customers to assign
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssignCustomers} disabled={!selectedWorker || selectedCustomerIds.length === 0 || submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Assign {selectedCustomerIds.length} Customer{selectedCustomerIds.length !== 1 ? 's' : ''}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Manage Customers Dialog */}
            <Dialog open={isManageCustomersDialogOpen} onOpenChange={setIsManageCustomersDialogOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Manage Customers - {selectedWorker?.name}</DialogTitle>
                  <DialogDescription>
                    View and manage customers assigned to {selectedWorker?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {workerCustomers.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Assigned Customers ({workerCustomers.length})</Label>
                      <div className="max-h-80 overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Area</TableHead>
                              <TableHead>Daily Order</TableHead>
                              <TableHead>Monthly Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {workerCustomers.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-sm text-muted-foreground">{customer.phone}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{customer.area}</TableCell>
                                <TableCell>{customer.dailyQuantity}L @ ₹{customer.ratePerLiter}</TableCell>
                                <TableCell>₹{customer.monthlyAmount.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                                    {customer.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnassignCustomer(customer.id)}
                                  >
                                    Unassign
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No customers assigned</h3>
                      <p className="text-muted-foreground">This worker has no customers assigned yet.</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsManageCustomersDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Worker
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Worker</DialogTitle>
                  <DialogDescription>
                    Register a new delivery worker to your team
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workerName">Full Name</Label>
                      <Input
                        id="workerName"
                        value={newWorker.name}
                        onChange={(e) => setNewWorker({...newWorker, name: e.target.value})}
                        placeholder="Enter worker name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workerPhone">Phone Number</Label>
                      <Input
                        id="workerPhone"
                        value={newWorker.phone}
                        onChange={(e) => setNewWorker({...newWorker, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workerEmail">Email Address</Label>
                    <Input
                      id="workerEmail"
                      type="email"
                      value={newWorker.email}
                      onChange={(e) => setNewWorker({...newWorker, email: e.target.value})}
                      placeholder="worker@milkflow.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workerArea">Assigned Area</Label>
                    <Select value={newWorker.areaId ? newWorker.areaId.toString() : ""} onValueChange={(value) => setNewWorker({...newWorker, areaId: parseInt(value)})}>
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
                    <Label htmlFor="workerAddress">Address</Label>
                    <Textarea
                      id="workerAddress"
                      value={newWorker.address}
                      onChange={(e) => setNewWorker({...newWorker, address: e.target.value})}
                      placeholder="Enter full address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={newWorker.emergencyContact}
                      onChange={(e) => setNewWorker({...newWorker, emergencyContact: e.target.value})}
                      placeholder="+91 98765 43211"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddWorker} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Worker
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Worker Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Worker</DialogTitle>
                  <DialogDescription>
                    Update worker details
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editWorkerName">Full Name</Label>
                      <Input
                        id="editWorkerName"
                        value={editWorker.name || ""}
                        onChange={(e) => setEditWorker({...editWorker, name: e.target.value})}
                        placeholder="Enter worker name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editWorkerPhone">Phone Number</Label>
                      <Input
                        id="editWorkerPhone"
                        value={editWorker.phone || ""}
                        onChange={(e) => setEditWorker({...editWorker, phone: e.target.value})}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editWorkerEmail">Email Address</Label>
                    <Input
                      id="editWorkerEmail"
                      type="email"
                      value={editWorker.email || ""}
                      onChange={(e) => setEditWorker({...editWorker, email: e.target.value})}
                      placeholder="worker@milkflow.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editWorkerArea">Assigned Area</Label>
                    <Select value={editWorker.areaId?.toString() || ""} onValueChange={(value) => setEditWorker({...editWorker, areaId: parseInt(value)})}>
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
                    <Label htmlFor="editWorkerAddress">Address</Label>
                    <Textarea
                      id="editWorkerAddress"
                      value={editWorker.address || ""}
                      onChange={(e) => setEditWorker({...editWorker, address: e.target.value})}
                      placeholder="Enter full address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editEmergencyContact">Emergency Contact</Label>
                      <Input
                        id="editEmergencyContact"
                        value={editWorker.emergencyContact || ""}
                        onChange={(e) => setEditWorker({...editWorker, emergencyContact: e.target.value})}
                        placeholder="+91 98765 43211"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editWorkerStatus">Status</Label>
                      <Select value={editWorker.status || ""} onValueChange={(value) => setEditWorker({...editWorker, status: value as any})}>
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
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateWorker} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Update Worker
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
              <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActiveWorkers}</div>
              <p className="text-xs text-muted-foreground">
                {workers.length - totalActiveWorkers} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers Managed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workers.reduce((sum, w) => sum + (w.customersAssigned || 0), 0)}</div>
              <p className="text-xs text-muted-foreground">
                Total customer assignments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Daily totals accumulated (active workers)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageEfficiency.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Team performance average
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workers List */}
        <Card>
          <CardHeader>
            <CardTitle>Worker Management</CardTitle>
            <CardDescription>View and manage all delivery workers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workers..."
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
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Route/Area</TableHead>
                    <TableHead>Customers</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Revenue (Daily Totals)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{worker.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {worker.rating}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {worker.phone}
                          </div>
                          <div className="text-xs text-muted-foreground">{worker.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{worker.areaName || 'No area assigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{worker.customersAssigned}</div>
                          {worker.status === "active" && (
                            <div className="text-xs text-muted-foreground">
                              {worker.onTimeDeliveries}/{worker.totalDeliveries} on-time
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {worker.status === "active" && worker.efficiency > 0 ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Progress value={worker.efficiency} className="h-2 w-16" />
                              <span className="text-sm font-medium">{worker.efficiency}%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">₹{(worker.monthlyRevenue || 0).toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={worker.status === "active" ? "default" : "secondary"}>
                          {worker.status === "active" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {worker.status}
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditWorker(worker)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleManageCustomers(worker)}>
                              <Users className="h-4 w-4 mr-2" />
                              Manage Customers
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Clock className="h-4 w-4 mr-2" />
                              View Performance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(worker)}>
                              {worker.status === "active" ? (
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
                              onClick={() => handleDeleteWorker(worker.id)}
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

            {filteredWorkers.length === 0 && (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No workers found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
