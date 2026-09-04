"use client";

import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
          {description && <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="بحث..." className="w-64 pr-9" />
        </div>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 md:h-10 md:w-10">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10">
          <User className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>
    </header>
  );
}
