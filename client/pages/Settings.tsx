import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings as SettingsIcon,
  Building2,
  IndianRupee,
  CreditCard,
  Users,
  Database,
  Save,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Shield,
  Download,
  Upload,
  Wifi,
  Globe,
  HardDrive,
  RefreshCw,
} from "lucide-react";

export default function Settings() {
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [businessSettings, setBusinessSettings] = useState({
    businessName: "MilkFlow Dairy Services",
    ownerName: "Rajesh Kumar",
    phone: "+91 98765 43210",
    email: "contact@milkflow.com",
    address: "123 Dairy Complex, Sector 15, Noida, UP 201301",
    gstNumber: "09ABCDE1234F1Z5",
    registrationNumber: "12345678901234",
    website: "www.milkflow.com",
  });

  const [pricingSettings, setPricingSettings] = useState({
    defaultRate: 60,
    premiumRate: 65,
    bulkRate: 55,
    minimumOrder: 0.5,
    deliveryCharge: 0,
    lateFee: 50,
    currency: "INR",
  });

  const [paymentSettings, setPaymentSettings] = useState({
    razorpayEnabled: true,
    razorpayKeyId: "rzp_test_1234567890",
    razorpaySecret: "••••••••••••••••••••••••",
    upiEnabled: true,
    upiId: "milkflow@paytm",
    bankAccount: "123456789012",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank",
    accountHolder: "MilkFlow Dairy Services",
  });

  const [users] = useState([
    { id: 1, name: "Admin User", email: "admin@milkflow.com", role: "Super Admin", status: "Active", lastLogin: "2024-12-03" },
    { id: 2, name: "Manager", email: "manager@milkflow.com", role: "Manager", status: "Active", lastLogin: "2024-12-02" },
    { id: 3, name: "Worker App", email: "worker@milkflow.com", role: "Worker", status: "Active", lastLogin: "2024-12-03" },
  ]);

  const handleSaveBusinessSettings = () => {
    alert("Business settings saved successfully!");
  };

  const handleSavePricingSettings = () => {
    alert("Pricing settings saved successfully!");
  };

  const handleSavePaymentSettings = () => {
    alert("Payment gateway settings saved successfully!");
  };

  const handleBackupData = () => {
    alert("Data backup initiated. You will receive an email when complete.");
  };

  const handleExportData = () => {
    alert("Data export started. Download link will be sent via email.");
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Configure your milk delivery business settings
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBackupData}>
              <Download className="h-4 w-4 mr-2" />
              Backup Data
            </Button>
            <Button variant="outline" onClick={handleExportData}>
              <Upload className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Business Profile */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Profile
                </CardTitle>
                <CardDescription>
                  Manage your business information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessSettings.businessName}
                      onChange={(e) => setBusinessSettings({...businessSettings, businessName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Owner Name</Label>
                    <Input
                      id="ownerName"
                      value={businessSettings.ownerName}
                      onChange={(e) => setBusinessSettings({...businessSettings, ownerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={businessSettings.phone}
                      onChange={(e) => setBusinessSettings({...businessSettings, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={businessSettings.email}
                      onChange={(e) => setBusinessSettings({...businessSettings, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={businessSettings.gstNumber}
                      onChange={(e) => setBusinessSettings({...businessSettings, gstNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      value={businessSettings.registrationNumber}
                      onChange={(e) => setBusinessSettings({...businessSettings, registrationNumber: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Textarea
                    id="address"
                    value={businessSettings.address}
                    onChange={(e) => setBusinessSettings({...businessSettings, address: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    value={businessSettings.website}
                    onChange={(e) => setBusinessSettings({...businessSettings, website: e.target.value})}
                    placeholder="www.yourwebsite.com"
                  />
                </div>
                <Button onClick={handleSaveBusinessSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Business Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing & Rates */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Pricing Configuration
                </CardTitle>
                <CardDescription>
                  Set default milk rates and pricing policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="defaultRate">Default Rate (₹/Liter)</Label>
                    <Input
                      id="defaultRate"
                      type="number"
                      value={pricingSettings.defaultRate || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        setPricingSettings({...pricingSettings, defaultRate: value});
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Standard milk rate for regular customers</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="premiumRate">Premium Rate (₹/Liter)</Label>
                    <Input
                      id="premiumRate"
                      type="number"
                      value={pricingSettings.premiumRate || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        setPricingSettings({...pricingSettings, premiumRate: value});
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Rate for premium quality milk</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulkRate">Bulk Rate (₹/Liter)</Label>
                    <Input
                      id="bulkRate"
                      type="number"
                      value={pricingSettings.bulkRate || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        setPricingSettings({...pricingSettings, bulkRate: value});
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Discounted rate for bulk orders</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="minimumOrder">Minimum Order (Liters)</Label>
                    <Input
                      id="minimumOrder"
                      type="number"
                      step="0.5"
                      value={pricingSettings.minimumOrder || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                        setPricingSettings({...pricingSettings, minimumOrder: value});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryCharge">Delivery Charge (₹)</Label>
                    <Input
                      id="deliveryCharge"
                      type="number"
                      value={pricingSettings.deliveryCharge || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        setPricingSettings({...pricingSettings, deliveryCharge: value});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFee">Late Payment Fee (₹)</Label>
                    <Input
                      id="lateFee"
                      type="number"
                      value={pricingSettings.lateFee || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        setPricingSettings({...pricingSettings, lateFee: value});
                      }}
                    />
                  </div>
                </div>

                <Button onClick={handleSavePricingSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Pricing Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Preview</CardTitle>
                <CardDescription>Preview of current pricing structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Regular Customer</h4>
                    <p className="text-2xl font-bold text-primary">₹{pricingSettings.defaultRate || 0}</p>
                    <p className="text-sm text-muted-foreground">Per liter</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Premium Quality</h4>
                    <p className="text-2xl font-bold text-primary">₹{pricingSettings.premiumRate || 0}</p>
                    <p className="text-sm text-muted-foreground">Per liter</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Bulk Orders</h4>
                    <p className="text-2xl font-bold text-primary">₹{pricingSettings.bulkRate || 0}</p>
                    <p className="text-sm text-muted-foreground">Per liter (5L+)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Gateways */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Gateway Configuration
                </CardTitle>
                <CardDescription>
                  Configure payment methods and gateway settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Razorpay Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Razorpay Integration</h4>
                      <p className="text-sm text-muted-foreground">Accept online payments via cards, UPI, wallets</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 ml-6">
                    <div className="space-y-2">
                      <Label>Razorpay Key ID</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showApiKeys ? "text" : "password"}
                          value={paymentSettings.razorpayKeyId}
                          onChange={(e) => setPaymentSettings({...paymentSettings, razorpayKeyId: e.target.value})}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowApiKeys(!showApiKeys)}
                        >
                          {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Razorpay Secret</Label>
                      <Input
                        type="password"
                        value={paymentSettings.razorpaySecret}
                        onChange={(e) => setPaymentSettings({...paymentSettings, razorpaySecret: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* UPI Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">UPI Integration</h4>
                      <p className="text-sm text-muted-foreground">Direct UPI payments and QR codes</p>
                    </div>
                  </div>
                  <div className="ml-6">
                    <div className="space-y-2">
                      <Label>UPI ID</Label>
                      <Input
                        value={paymentSettings.upiId}
                        onChange={(e) => setPaymentSettings({...paymentSettings, upiId: e.target.value})}
                        placeholder="your-upi-id@paytm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Bank Details */}
                <div className="space-y-4">
                  <h4 className="font-medium">Bank Account Details</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={paymentSettings.bankAccount}
                        onChange={(e) => setPaymentSettings({...paymentSettings, bankAccount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input
                        value={paymentSettings.ifscCode}
                        onChange={(e) => setPaymentSettings({...paymentSettings, ifscCode: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        value={paymentSettings.bankName}
                        onChange={(e) => setPaymentSettings({...paymentSettings, bankName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Holder Name</Label>
                      <Input
                        value={paymentSettings.accountHolder}
                        onChange={(e) => setPaymentSettings({...paymentSettings, accountHolder: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSavePaymentSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Payment Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Manage system users and their access permissions
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account with specific permissions
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input placeholder="Enter full name" />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" placeholder="user@example.com" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="worker">Worker</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline">Cancel</Button>
                        <Button>Create User</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              user.role === "Super Admin" ? "default" :
                              user.role === "Manager" ? "secondary" : "outline"
                            }>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === "Active" ? "default" : "destructive"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.lastLogin}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Backup, data export, and system maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Data Management</h4>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start" onClick={handleBackupData}>
                        <Download className="h-4 w-4 mr-2" />
                        Create Data Backup
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                        <Upload className="h-4 w-4 mr-2" />
                        Export All Data
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Database
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">System Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          <span className="text-sm">Database Status</span>
                        </div>
                        <Badge variant="default">Healthy</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          <span className="text-sm">API Status</span>
                        </div>
                        <Badge variant="default">Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="text-sm">System</span>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Backup Schedule</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Backup Frequency</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Backup Time</Label>
                      <Input type="time" defaultValue="02:00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Retention Period</Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
