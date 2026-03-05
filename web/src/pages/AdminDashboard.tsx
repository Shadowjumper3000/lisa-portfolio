import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchImages, fetchSettings, uploadImage, updateImage, deleteImage, reorderImages, updateSettings, type Image, type SiteSettings } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, Upload, LogOut, Save, X, Image as ImageIcon, ChevronUp, ChevronDown } from "lucide-react";
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

  // Local ordered list for optimistic reorder UI
  const [orderedImages, setOrderedImages] = useState<Image[]>([]);
  useEffect(() => {
    setOrderedImages([...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
  }, [images]);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", yearCreated: 0 });

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("image", file);
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<Image, "title" | "description" | "yearCreated">> }) =>
      updateImage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
      setEditingId(null);
      toast({ title: "Image updated" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: reorderImages,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["images"] });
    },
    onError: () => {
      toast({ title: "Failed to save order", variant: "destructive" });
      // Revert to server state
      setOrderedImages([...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
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
    setEditForm({ title: img.title, description: img.description || "", yearCreated: img.yearCreated || 0 });
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newList = [...orderedImages];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;
    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    const withOrder = newList.map((img, i) => ({ ...img, sort_order: i }));
    setOrderedImages(withOrder);
    reorderMutation.mutate(withOrder.map((img) => ({ id: img.id, sort_order: img.sort_order ?? 0 })));
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

      <main className="container py-6 space-y-6 max-w-5xl">
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
                value={settings?.hero_image_id ? String(settings.hero_image_id) : "random"}
                onValueChange={(v) =>
                  settingsMutation.mutate({
                    hero_image_id: v === "random" ? undefined : Number(v),
                    about_image_id: settings?.about_image_id,
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Random" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random from gallery</SelectItem>
                  {orderedImages.map((img) => (
                    <SelectItem key={img.id} value={String(img.id)}>{img.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>About Background</Label>
              <Select
                value={settings?.about_image_id ? String(settings.about_image_id) : "random"}
                onValueChange={(v) =>
                  settingsMutation.mutate({
                    hero_image_id: settings?.hero_image_id,
                    about_image_id: v === "random" ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="Random" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random from gallery</SelectItem>
                  {orderedImages.map((img) => (
                    <SelectItem key={img.id} value={String(img.id)}>{img.title}</SelectItem>
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
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
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
            <CardTitle className="text-lg">
              Gallery Images ({orderedImages.length})
              <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                Use the arrows to set gallery display order
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderedImages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No images uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {orderedImages.map((img, index) => (
                  <div key={img.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Image preview + order controls row */}
                    <div className="flex gap-0">
                      {/* Tall image preview */}
                      <div className="w-32 sm:w-44 shrink-0">
                        <img
                          src={img.url}
                          alt={img.title}
                          className="h-full w-full object-cover"
                          style={{ minHeight: "9rem", maxHeight: "12rem" }}
                          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                      </div>

                      {/* Right side: info / edit fields + action buttons */}
                      <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
                        {editingId === img.id ? (
                          /* Edit mode — stacked full-width inputs */
                          <div className="flex flex-col gap-2 flex-1">
                            <Input
                              className="w-full"
                              value={editForm.title}
                              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                              placeholder="Title"
                            />
                            <Input
                              className="w-full"
                              value={editForm.description}
                              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                              placeholder="Description"
                            />
                            <Input
                              className="w-full"
                              type="number"
                              value={editForm.yearCreated || ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, yearCreated: parseInt(e.target.value) || 0 }))}
                              placeholder="Year (e.g., 2024)"
                            />
                          </div>
                        ) : (
                          /* View mode */
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-snug">{img.title}</p>
                            {img.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{img.description}</p>
                            )}
                            {img.yearCreated ? (
                              <p className="text-xs text-muted-foreground mt-1">{img.yearCreated}</p>
                            ) : null}
                            <p className="text-xs text-muted-foreground/60 mt-1">Order: {index + 1}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {editingId === img.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateMutation.mutate({ id: String(img.id), data: editForm })}
                              >
                                <Save className="h-3.5 w-3.5 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5 mr-1" /> Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              {/* Reorder */}
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                disabled={index === 0 || reorderMutation.isPending}
                                onClick={() => moveImage(index, "up")}
                                title="Move up"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                disabled={index === orderedImages.length - 1 || reorderMutation.isPending}
                                onClick={() => moveImage(index, "down")}
                                title="Move down"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              {/* Edit */}
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(img)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {/* Delete */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
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
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(String(img.id))}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
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
