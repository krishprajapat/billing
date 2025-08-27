import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  Map,
  Loader2,
} from "lucide-react";
import { areaApi, ApiError } from "@/lib/api-client";
import { Area, CreateAreaRequest, UpdateAreaRequest } from "../../shared/api";
import { useToast } from "@/hooks/use-toast";

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state for create/edit
  const [formData, setFormData] = useState<CreateAreaRequest>({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await areaApi.getAll();
      setAreas(data);
    } catch (err) {
      console.error('Failed to fetch areas:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArea = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Area name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const newArea = await areaApi.create(formData);
      setAreas(prev => [...prev, newArea]);
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
      toast({
        title: "Success",
        description: "Area created successfully",
      });
    } catch (err) {
      console.error('Failed to create area:', err);
      toast({
        title: "Error",
        description: err instanceof ApiError ? err.message : 'Failed to create area',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditArea = async () => {
    if (!editingArea || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Area name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedArea = await areaApi.update(editingArea.id, formData);
      setAreas(prev => prev.map(a => a.id === editingArea.id ? updatedArea : a));
      setIsEditDialogOpen(false);
      setEditingArea(null);
      setFormData({ name: "", description: "" });
      toast({
        title: "Success",
        description: "Area updated successfully",
      });
    } catch (err) {
      console.error('Failed to update area:', err);
      toast({
        title: "Error",
        description: err instanceof ApiError ? err.message : 'Failed to update area',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArea = async (area: Area) => {
    if (!confirm(`Are you sure you want to delete "${area.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await areaApi.delete(area.id);
      setAreas(prev => prev.filter(a => a.id !== area.id));
      toast({
        title: "Success",
        description: "Area deleted successfully",
      });
    } catch (err) {
      console.error('Failed to delete area:', err);
      toast({
        title: "Error",
        description: err instanceof ApiError ? err.message : 'Failed to delete area. It may have assigned customers or workers.',
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (area: Area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const closeDialogs = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setEditingArea(null);
    setFormData({ name: "", description: "" });
  };

  // Filter areas based on search term
  const filteredAreas = areas.filter(area =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (area.description && area.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Search skeleton */}
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
          </div>

          {/* Table skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 flex-1" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-20" />
                  </div>
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
              <Button variant="outline" size="sm" onClick={fetchAreas}>
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
            <h1 className="text-3xl font-bold tracking-tight">Area Management</h1>
            <p className="text-muted-foreground">
              Manage delivery areas and zones for your milk distribution network
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Area
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Area</DialogTitle>
                <DialogDescription>
                  Create a new delivery area for your milk distribution network
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Area Name *</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sector 15, Downtown, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-description">Description</Label>
                  <Textarea
                    id="create-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of the area"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeDialogs}>
                  Cancel
                </Button>
                <Button onClick={handleCreateArea} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Area
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search areas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Areas table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Areas ({filteredAreas.length})
            </CardTitle>
            <CardDescription>
              Manage your delivery areas and zones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAreas.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No areas found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No areas match your search criteria." : "Get started by creating your first delivery area."}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Area
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAreas.map((area) => (
                      <TableRow key={area.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{area.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {area.description ? (
                              <span className="text-sm text-muted-foreground">{area.description}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">No description</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(area.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(area)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteArea(area)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Area</DialogTitle>
              <DialogDescription>
                Update the area information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Area Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sector 15, Downtown, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description of the area"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeDialogs}>
                Cancel
              </Button>
              <Button onClick={handleEditArea} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Area
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
