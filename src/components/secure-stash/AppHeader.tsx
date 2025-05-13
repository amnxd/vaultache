
"use client";
import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar'; 
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="md:hidden">
        <SidebarTrigger className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Vaultache</h1>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <ThemeToggleButton />
        {/* Encryption key input and status removed */}
      </div>
    </header>
  );
}

