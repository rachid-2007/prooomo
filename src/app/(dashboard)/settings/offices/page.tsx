"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WILAYAS_DATA, OFFICES_DATA } from "@/lib/constants";
import { Save, Loader2, ArrowRight, Check, Plus, Trash2, MapPin, Store, Search, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface OfficeEntry {
  id: string;
  wilayaCode: string;
  name: string;
  source: "default" | "custom";
}

export default function OfficesPage() {
  const [offices, setOffices] = useState<OfficeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newWilaya, setNewWilaya] = useState("");
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedWilayas, setExpandedWilayas] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const defaultOffices: OfficeEntry[] = [];
    for (const [code, names] of Object.entries(OFFICES_DATA)) {
      for (const name of names) {
        defaultOffices.push({
          id: `default-${code}-${name}`,
          wilayaCode: code,
          name,
          source: "default",
        });
      }
    }

    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => {
        const s = settings.find((x: any) => x.key === "offices");
        if (s) {
          try {
            const custom: { id: string; wilayaCode: string; name: string }[] = JSON.parse(s.value);
            const customEntries: OfficeEntry[] = custom.map((c) => ({
              id: c.id,
              wilayaCode: c.wilayaCode,
              name: c.name,
              source: "custom",
            }));

            const existingKeys = new Set(defaultOffices.map((o) => `${o.wilayaCode}-${o.name}`));
            const uniqueCustom = customEntries.filter((c) => !existingKeys.has(`${c.wilayaCode}-${c.name}`));

            setOffices([...defaultOffices, ...uniqueCustom]);
          } catch {
            setOffices(defaultOffices);
          }
        } else {
          setOffices(defaultOffices);
        }
        setLoading(false);
      })
      .catch(() => {
        setOffices(defaultOffices);
        setLoading(false);
      });
  }, []);

  const addOffice = () => {
    if (!newWilaya || !newName.trim()) return;
    setOffices((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, wilayaCode: newWilaya, name: newName.trim(), source: "custom" },
    ]);
    setNewName("");
    setExpandedWilayas((prev) => new Set([...prev, newWilaya]));
  };

  const removeOffice = (id: string) => {
    setOffices((prev) => prev.filter((o) => o.id !== id));
  };

  const startEdit = (office: OfficeEntry) => {
    setEditId(office.id);
    setEditName(office.name);
  };

  const saveEdit = () => {
    if (!editId || !editName.trim()) return;
    setOffices((prev) =>
      prev.map((o) => (o.id === editId ? { ...o, name: editName.trim() } : o))
    );
    setEditId(null);
    setEditName("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const allEntries = offices.map((o) => ({
        id: o.id,
        wilayaCode: o.wilayaCode,
        name: o.name,
      }));
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "offices", value: JSON.stringify(allEntries) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const toggleWilaya = (code: string) => {
    setExpandedWilayas((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const grouped = offices.reduce<Record<string, OfficeEntry[]>>((acc, office) => {
    if (!acc[office.wilayaCode]) acc[office.wilayaCode] = [];
    acc[office.wilayaCode].push(office);
    return acc;
  }, {});

  const sortedGrouped = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  const filteredGrouped = sortedGrouped.filter(([code, officeList]) => {
    if (!searchQuery) return true;
    const wilaya = WILAYAS_DATA.find((w) => w.code === code);
    const q = searchQuery.toLowerCase();
    return (
      wilaya?.name.toLowerCase().includes(q) ||
      wilaya?.code.includes(q) ||
      officeList.some((o) => o.name.toLowerCase().includes(q))
    );
  });

  const totalOffices = offices.length;
  const totalWilayas = Object.keys(grouped).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="p-2 rounded-xl hover:bg-muted transition-colors">
                <ArrowRight className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-black">المكاتب</h1>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "h-10 rounded-xl font-bold px-4 gap-2 text-sm",
                saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{saved ? "تم الحفظ" : "حفظ التغييرات"}</span>
            </Button>
          </div>

          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
              <Store className="h-3.5 w-3.5" />
              <span className="font-bold">{totalOffices}</span>
              <span className="text-muted-foreground">مكتب</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="font-bold">{totalWilayas}</span>
              <span className="text-muted-foreground">ولاية</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالولاية أو اسم المكتب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl pr-10"
                />
              </div>

              <div className="space-y-2">
                {filteredGrouped.length === 0 ? (
                  <div className="py-12 text-center bg-card rounded-xl border border-border">
                    <Store className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "لا توجد نتائج" : "لا توجد مكاتب"}
                    </p>
                  </div>
                ) : (
                  filteredGrouped.map(([code, officeList]) => {
                    const wilaya = WILAYAS_DATA.find((w) => w.code === code);
                    const isExpanded = expandedWilayas.has(code) || !!searchQuery;
                    return (
                      <div key={code} className="bg-card rounded-xl border border-border overflow-hidden">
                        <button
                          onClick={() => toggleWilaya(code)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">{code}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{wilaya?.name || code}</p>
                              <p className="text-[11px] text-muted-foreground">{officeList.length} مكتب</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border px-4 py-2 space-y-1.5">
                            {officeList.map((office) => (
                              <div key={office.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/20 transition-colors">
                                <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                {editId === office.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <Input
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="h-8 text-xs font-bold rounded-lg"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveEdit();
                                        if (e.key === "Escape") cancelEdit();
                                      }}
                                      autoFocus
                                    />
                                    <Button size="sm" onClick={saveEdit} className="h-8 px-3 text-xs rounded-lg">
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 px-3 text-xs rounded-lg">
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold truncate">{office.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => startEdit(office)}
                                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                      >
                                        <span className="text-xs">✏️</span>
                                      </button>
                                      <button
                                        onClick={() => removeOffice(office.id)}
                                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}

                            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                              <Input
                                placeholder={`إضافة مكتب لـ ${wilaya?.name || code}`}
                                value={newWilaya === code ? newName : ""}
                                onChange={(e) => { setNewWilaya(code); setNewName(e.target.value); }}
                                onFocus={() => setNewWilaya(code)}
                                className="h-8 text-xs font-bold rounded-lg flex-1"
                                onKeyDown={(e) => { if (e.key === "Enter") { setNewWilaya(code); addOffice(); } }}
                              />
                              <Button
                                size="sm"
                                onClick={() => { setNewWilaya(code); addOffice(); }}
                                disabled={newWilaya !== code || !newName.trim()}
                                className="h-8 px-3 text-xs rounded-lg"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
