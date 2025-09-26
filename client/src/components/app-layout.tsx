import React from 'react';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { useLayout } from '@/contexts/LayoutContext';

interface AppLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Central layout so each page doesn't reimplement sidebar/header boilerplate
export function AppLayout({ title, description, actions, children }: AppLayoutProps) {
  useLayout(); // consume to re-render on sidebar changes if needed
  return (
    <div className="h-screen flex bg-neutral overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16">
        <Header title={title} description={description} actions={actions} />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;