
"use client";
import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader as ShadSidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { FileGrid } from './FileGrid';
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        variant="sidebar" 
        collapsible="icon"
        className="border-r"
        side="left"
      >
        <ShadSidebarHeader className="p-2 flex items-center justify-between">
           <Button variant="ghost" className="flex items-center gap-2 text-lg font-semibold px-2 group-data-[collapsible=icon]:hidden" asChild>
             <a href="#"> {/* Link or action */}
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span>SecureStash</span>
             </a>
           </Button>
           <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </ShadSidebarHeader>
        <SidebarContent className="p-0">
          <AppSidebar />
        </SidebarContent>
        {/* <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
          Footer content
        </SidebarFooter> */}
      </Sidebar>
      <SidebarInset className="min-h-screen">
        <AppHeader />
        <main className="flex-1">
          <FileGrid />
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
