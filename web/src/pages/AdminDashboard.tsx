import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchImages, fetchSettings, uploadImage, updateImage, deleteImage, updateSettings, type Image, type SiteSettings } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Upload, LogOut, Save, X, Image as ImageIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: images = [] } = useQuery({ queryKey: ["images"], queryFn: fetchImages });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "" });

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", file.name.replace(/\.[^.]+$/, ""));
        await uploadImage(fd, setUploadProgress);
      }
      qc.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Upload complete!" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: deleteImage,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Image deleted" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<Image, "title" | "description" | "category">> }) =>
      updateImage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      setEditingId(null);
      toast({ title: "Image updated" });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const startEdit = (img: Image) => {
    setEditingId(img.id);
    setEditForm({ title: img.title, description: img.description || "", category: img.category || "" });
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <h1 className="text-xl font-serif font-bold">Admin Dashboard</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Site Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-5 w-5" /> Site Background Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Hero Background</Label>
              <Select
                value={settings?.hero_image_id || "random"}
                onValueChange={(v) =>
                  settingsMutation.mutate({
                    hero_image_id: v === "random" ? undefined : v,
                    about_image_id: settings?.about_image_id,
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Random" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random from gallery</SelectItem>
                  {images.map((img) => (
                    <SelectItem key={img.id} value={img.id}>{img.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>About Background</Label>
              <Select
                value={settings?.about_image_id || "random"}
                onValueChange={(v) =>
                  settingsMutation.mutate({
                    hero_image_id: settings?.hero_image_id,
                    about_image_id: v === "random" ? undefined : v,
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Random" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random from gallery</SelectItem>
                  {images.map((img) => (
                    <SelectItem key={img.id} value={img.id}>{img.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" /> Upload Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <p className="text-muted-foreground mb-4">
                Drag & drop images here, or click to select
              </p>
              <Input
                type="file"
                accept="image/*"
                multiple
                className="max-w-xs mx-auto"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>
            {isUploading && (
              <div className="mt-4 space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Images ({images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No images uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {images.map((img) => (
                  <div key={img.id} className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card">
                    <img
                      src={img.url}
                      alt={img.title}
                      className="h-16 w-16 object-cover rounded"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                    {editingId === img.id ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Title"
                        />
                        <Input
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Description"
                        />
                        <Input
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                          placeholder="Category"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{img.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{img.description || "No description"}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {editingId === img.id ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => updateMutation.mutate({ id: img.id, data: editForm })}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(img)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete image?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{img.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(img.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
