"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { X, ExternalLink, Pencil, Plus, Users, User, Shield, Trash2, Loader2, Search } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  phone: string | null;
  storeSlug: string | null;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  thumbnail: string;
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState<User | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "WORKER",
    phone: "",
    storeSlug: "",
  });
  const [editData, setEditData] = useState({
    name: "",
    username: "",
    role: "",
    password: "",
    phone: "",
    storeSlug: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !currentUser) router.push("/login");
    if (!authLoading && currentUser && currentUser.role !== "ADMIN") router.push("/orders");
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      fetchUsers();
      fetchProducts();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      setUsers(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products/cards?limit=500");
      const data = await res.json();
      setProducts((data.products || []).map((p: any) => ({ id: p.id, name: p.name, price: p.price, thumbnail: p.thumbnail || "" })));
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setUsers([data, ...users]);
      setShowForm(false);
      setFormData({ name: "", email: "", username: "", password: "", role: "WORKER", phone: "", storeSlug: "" });
    } catch { setError("حدث خطأ"); }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${showEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setUsers(users.map(u => u.id === showEdit.id ? data : u));
      setShowEdit(null);
    } catch { setError("حدث خطأ"); }
    setSaving(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) setUsers(users.filter(u => u.id !== userId));
    } catch {}
  };

  const openEdit = (user: User) => {
    setEditData({
      name: user.name,
      username: user.username,
      role: user.role,
      password: "",
      phone: user.phone || "",
      storeSlug: user.storeSlug || "",
    });
    setShowEdit(user);
    setError("");
  };

  const openAssign = async (workerId: string) => {
    setShowAssign(workerId);
    try {
      const res = await fetch(`/api/worker-assignments?workerId=${workerId}`);
      const assigned = await res.json();
      setSelectedProducts(assigned.map((p: Product) => p.id));
    } catch { setSelectedProducts([]); }
  };

  const saveAssign = async () => {
    if (!showAssign) return;
    setSaving(true);
    try {
      const res = await fetch("/api/worker-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: showAssign, productIds: selectedProducts }),
      });
      if (res.ok) {
        setShowAssign(null);
      } else {
        alert("حدث خطأ أثناء الحفظ");
      }
    } catch { alert("حدث خطأ"); }
    setSaving(false);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
      </div>
    );
  }
  if (currentUser?.role !== "ADMIN") return null;

  const adminCount = users.filter(u => u.role === "ADMIN").length;
  const workerCount = users.filter(u => u.role === "WORKER").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl font-black">المستخدمين</h1>
          </div>
          <Button onClick={() => { setShowForm(true); setError(""); }} className="h-9 rounded-xl text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">إضافة مستخدم</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">المديرين</p>
            <p className="text-lg font-black text-blue-600 dark:text-blue-400">{adminCount}</p>
          </div>
          <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">العمال</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{workerCount}</p>
          </div>
          <div className="flex-1 bg-purple-50 dark:bg-purple-950/30 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">الكل</p>
            <p className="text-lg font-black text-purple-600 dark:text-purple-400">{users.length}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Users List */}
        {users.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="h-14 w-14 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-lg font-bold text-muted-foreground">لا يوجد مستخدمين</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      user.role === "ADMIN"
                        ? "bg-blue-100 dark:bg-blue-950/50"
                        : "bg-emerald-100 dark:bg-emerald-950/50"
                    }`}>
                      {user.role === "ADMIN" ? (
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                          user.role === "ADMIN"
                            ? "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                            : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {user.role === "ADMIN" ? "مدير" : "عامل"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{user.email}</p>
                      {user.username && (
                        <p className="text-[11px] text-blue-500 dark:text-blue-400" dir="ltr">@{user.username}</p>
                      )}
                      {user.phone && (
                        <p className="text-[11px] text-muted-foreground" dir="ltr">{user.phone}</p>
                      )}
                      {user.storeSlug && (
                        <a href={`/stores/${user.storeSlug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-purple-500 dark:text-purple-400 hover:underline" dir="ltr">stores/{user.storeSlug} ↗</a>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <button
                          onClick={() => openEdit(user)}
                          className="h-7 px-2 rounded-lg bg-muted text-xs font-bold flex items-center gap-1 hover:bg-muted/80 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          تعديل
                        </button>
                        {user.role === "WORKER" && user.username && (
                          <>
                            <button
                              onClick={() => openAssign(user.id)}
                              className="h-7 px-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                            >
                              تخصيص
                            </button>
                            <a href={`/worker/${user.username}`} target="_blank" rel="noopener noreferrer">
                              <button className="h-7 px-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                                <ExternalLink className="h-3 w-3" />
                                واجهة
                              </button>
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="h-7 px-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ===== ADD USER MODAL ===== */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">إضافة مستخدم جديد</h3>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 overflow-y-auto max-h-[calc(90vh-80px)]">
                {error && (
                  <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-xl">{error}</div>
                )}
                <Input placeholder="الاسم الكامل" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-11 rounded-xl" />
                <Input placeholder="اسم المستخدم (للرابط)" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required dir="ltr" className="h-11 rounded-xl" />
                <Input placeholder="البريد الإلكتروني" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required dir="ltr" className="h-11 rounded-xl" />
                <Input placeholder="كلمة المرور" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required dir="ltr" className="h-11 rounded-xl" />
                <Input placeholder="رقم الهاتف (اختياري)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} dir="ltr" className="h-11 rounded-xl" />
                <Input placeholder="رابط المتجر (مثلا: my-store)" value={formData.storeSlug} onChange={(e) => setFormData({ ...formData, storeSlug: e.target.value.replace(/[^a-z0-9-]/g, "") })} dir="ltr" className="h-11 rounded-xl" />
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold">
                  <option value="WORKER">عامل</option>
                  <option value="ADMIN">مدير</option>
                </select>
                <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl font-bold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
                </Button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ===== EDIT USER MODAL ===== */}
      {showEdit && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowEdit(null)} />
          <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">تعديل المستخدم</h3>
                <button onClick={() => setShowEdit(null)} className="p-2 rounded-xl hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleEdit} className="px-5 py-4 space-y-3 overflow-y-auto max-h-[calc(90vh-80px)]">
                {error && (
                  <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-xl">{error}</div>
                )}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">الاسم</label>
                  <Input placeholder="الاسم الكامل" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">اسم المستخدم</label>
                  <Input placeholder="اسم المستخدم" value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} required dir="ltr" className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">الدور</label>
                  <select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} className="flex h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold">
                    <option value="WORKER">عامل</option>
                    <option value="ADMIN">مدير</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">رقم الهاتف</label>
                  <Input placeholder="رقم الهاتف" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} dir="ltr" className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">رابط المتجر</label>
                  <Input placeholder="my-store" value={editData.storeSlug} onChange={(e) => setEditData({ ...editData, storeSlug: e.target.value.replace(/[^a-z0-9-]/g, "") })} dir="ltr" className="h-11 rounded-xl" />
                  {editData.storeSlug && <p className="text-[10px] text-muted-foreground mt-1" dir="ltr">prooomo.vercel.app/stores/{editData.storeSlug}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">كلمة المرور الجديدة (اتركها فارغة)</label>
                  <Input placeholder="كلمة المرور الجديدة" type="password" value={editData.password} onChange={(e) => setEditData({ ...editData, password: e.target.value })} dir="ltr" className="h-11 rounded-xl" />
                </div>
                <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl font-bold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
                </Button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ===== ASSIGN PRODUCTS MODAL ===== */}
      {showAssign && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => { setShowAssign(null); setProductSearch(""); }} />
          <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
            <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold">تخصيص المنتجات</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    اختر المنتجات التي يراها هذا العامل
                  </p>
                </div>
                <button onClick={() => { setShowAssign(null); setProductSearch(""); }} className="p-2 rounded-xl hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن منتج..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pr-9 h-10 rounded-xl text-sm"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  تم تحديد <span className="font-bold text-primary">{selectedProducts.length}</span> منتج
                </p>
              </div>
              <div className="px-5 py-3 overflow-y-auto max-h-[calc(85vh-160px)]">
                {products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد منتجات</p>
                ) : (
                  <div className="space-y-1.5">
                    {products
                      .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      .map((product) => {
                        const isSelected = selectedProducts.includes(product.id);
                        return (
                          <div
                            key={product.id}
                            onClick={() => toggleProduct(product.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-border/80"
                            }`}
                          >
                            <div className="h-11 w-11 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              <img
                                src={product.thumbnail || `/api/products/${product.id}/image/0?size=80`}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.price.toLocaleString()} دج</p>
                            </div>
                            <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && (
                                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-border flex gap-2">
                <Button onClick={saveAssign} disabled={saving} className="flex-1 h-11 rounded-xl font-bold">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
                </Button>
                <Button variant="outline" onClick={() => { setShowAssign(null); setProductSearch(""); }} className="h-11 rounded-xl font-bold">
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
