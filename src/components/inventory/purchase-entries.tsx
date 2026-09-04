"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Calendar, Search, ChevronDown, Image, MessageSquare } from "lucide-react";

interface PurchaseEntry {
  id: string;
  reference: string;
  date: string;
  supplier: string;
  total: number;
  note: string;
  hasImage: boolean;
}

const mockPurchases: PurchaseEntry[] = [
  { id: "1", reference: "#233", date: "23/06/2026", supplier: "نوزاري - plomerie general", total: 11250, note: "", hasImage: false },
  { id: "2", reference: "#232", date: "23/06/2026", supplier: "نوزاري - plomerie general", total: 9000, note: "", hasImage: false },
  { id: "3", reference: "#231", date: "22/06/2026", supplier: "/", total: 630, note: "ملاحظة", hasImage: true },
  { id: "4", reference: "#229", date: "17/06/2026", supplier: "نوزاري - plomerie general", total: 17990, note: "", hasImage: false },
  { id: "5", reference: "#228", date: "17/06/2026", supplier: "MK DOUCHAT", total: 24225, note: "", hasImage: false },
];

interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (purchase: Omit<PurchaseEntry, "id">) => void;
}

function AddPurchaseModal({ isOpen, onClose, onSave }: AddPurchaseModalProps) {
  const [date, setDate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [total, setTotal] = useState("");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      reference: `#${Math.floor(Math.random() * 1000)}`,
      date: date || new Date().toLocaleDateString("ar-DZ"),
      supplier,
      total: parseFloat(total) || 0,
      note,
      hasImage: false,
    });
    onClose();
    setDate("");
    setSupplier("");
    setTotal("");
    setNote("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-sm font-bold">إضافة إدخال شراء</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">التاريخ</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">المورد</label>
            <Input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="اسم المورد" className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">المجموع (دج)</label>
            <Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">ملاحظة</label>
            <Input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة اختيارية" className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">إرفاق صورة</label>
            <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <Image className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground">اضغط لرفع الصورة</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 text-xs">إلغاء</Button>
          <Button onClick={handleSave} className="flex-1 h-9 text-xs">حفظ</Button>
        </div>
      </div>
    </div>
  );
}

export function PurchaseEntries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [noteFilter, setNoteFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [purchases, setPurchases] = useState(mockPurchases);

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch = p.reference.includes(searchQuery) || p.supplier.includes(searchQuery);
    const matchesSupplier = !supplierFilter || p.supplier.includes(supplierFilter);
    const matchesNote = !noteFilter || p.note.includes(noteFilter);
    return matchesSearch && matchesSupplier && matchesNote;
  });

  const suppliers = [...new Set(purchases.map((p) => p.supplier))];

  const handleAddPurchase = (purchase: Omit<PurchaseEntry, "id">) => {
    setPurchases([{ ...purchase, id: Date.now().toString() }, ...purchases]);
  };

  const handleDelete = (id: string) => {
    setPurchases(purchases.filter((p) => p.id !== id));
  };

  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.total, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">إدخالات الشراء الخاصة بك</CardTitle>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 ml-1" />
            إضافة إدخال
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="البحث"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-8 text-xs"
            />
          </div>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="h-8 px-3 text-xs bg-muted rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
          >
            <option value="">اختر الموردين</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative min-w-[120px]">
            <Input
              type="text"
              placeholder="ملاحظة"
              value={noteFilter}
              onChange={(e) => setNoteFilter(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold w-10"></TableHead>
                <TableHead className="text-xs font-bold">المرجف</TableHead>
                <TableHead className="text-xs font-bold">التاريخ</TableHead>
                <TableHead className="text-xs font-bold">المورد</TableHead>
                <TableHead className="text-xs font-bold">المجموع</TableHead>
                <TableHead className="text-xs font-bold">ملاحظة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                    لا توجد إدخالات
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                        onClick={() => handleDelete(purchase.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs font-bold">{purchase.reference}</TableCell>
                    <TableCell className="text-xs">{purchase.date}</TableCell>
                    <TableCell className="text-xs">{purchase.supplier}</TableCell>
                    <TableCell className="text-xs font-bold">{purchase.total.toLocaleString()} دج</TableCell>
                    <TableCell>
                      {purchase.note ? (
                        <Badge variant="secondary" className="text-[10px]">
                          <MessageSquare className="h-2.5 w-2.5 ml-0.5" />
                          {purchase.note}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-muted/30">
          <span className="text-sm font-bold">المجموع</span>
          <span className="text-lg font-bold text-primary">{totalAmount.toLocaleString()} دج</span>
        </div>
      </CardContent>

      <AddPurchaseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddPurchase}
      />
    </Card>
  );
}
