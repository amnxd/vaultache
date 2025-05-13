
"use client";
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { SidebarTrigger } from '@/components/ui/sidebar'; 
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export function AppHeader() {
  const { encryptionKey, setEncryptionKey } = useAppContext();
  const [tempKey, setTempKey] = useState(encryptionKey || '');

  const handleSetKey = () => {
    setEncryptionKey(tempKey);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">SecureStash</h1>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <ThemeToggleButton />
        <div className="flex items-center gap-2">
          <Label htmlFor="encryptionKey" className="text-sm font-medium sr-only">
            Encryption Key
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="encryptionKey"
              type="password"
              placeholder="Enter encryption key..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="w-48 md:w-64 pl-10 pr-20"
            />
          </div>
          <Button onClick={handleSetKey} variant="outline" size="sm">
            Set Key
          </Button>
        </div>
        {encryptionKey ? (
          <ShieldCheck className="h-6 w-6 text-green-500" title="Encryption key is set" />
        ) : (
          <ShieldAlert className="h-6 w-6 text-destructive" title="Encryption key is not set" />
        )}
      </div>
    </header>
  );
}
