'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Plus, Edit, Eye, Save, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface BuilderLayoutProps {
  children: React.ReactNode;
  preview: React.ReactNode;
  isMobile?: boolean;
  showPreview?: boolean;
  isDirty?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
}

export function BuilderLayout({
  children,
  preview,
  isMobile = false,
  showPreview = true,
  isDirty,
  onSave,
  isSaving = false,
  saveLabel = 'Save Draft',
}: BuilderLayoutProps) {
  const [view, setView] = React.useState<'edit' | 'preview' | 'both'>(isMobile ? 'edit' : 'both');

  const isDesktop = !isMobile;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-accent" />
              <h1 className="text-xl font-bold text-foreground">Document Builder</h1>
            </div>
            <div className="flex items-center gap-3">
              {isDirty && (
                <Button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : saveLabel}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setView('edit')}
                className={`flex items-center gap-2 text-sm ${view === 'edit' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <Edit className="h-4 w-4" /> Edit
              </Button>
              {showPreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setView('preview')}
                  className={`flex items-center gap-2 text-sm ${view === 'preview' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <Eye className="h-4 w-4" /> Preview
                </Button>
              )}
              {showPreview && isDesktop && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setView('both')}
                  className={`flex items-center gap-2 text-sm ${view === 'both' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <Plus className="h-4 w-4" /> Both
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                You have unsaved changes. Save your draft before navigating away.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {view === 'edit' && <div className="space-y-6">{children}</div>}
        {view === 'preview' && <div className="space-y-6">{preview}</div>}
        {view === 'both' && isDesktop && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
            <div className="flex flex-col">
              <Card className="flex-1 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Editor</CardTitle>
                  <CardDescription className="text-xs">
                    Make changes to your document
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-auto">
                  <div className="p-4">{children}</div>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col">
              <Card className="flex-1 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Live Preview</CardTitle>
                  <CardDescription className="text-xs">
                    A4 document preview updates live
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-auto">
                  <div className="p-4">{preview}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        {!isDesktop && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setView('edit')}
                className={`flex items-center gap-2 text-sm ${view === 'edit' ? 'text-accent' : 'text-muted-foreground hover:text-accent/90'}`}
              >
                <ChevronLeft className="h-4 w-4" /> Editor
              </button>
              <button
                onClick={() => setView('preview')}
                className={`flex items-center gap-2 text-sm ${view === 'preview' ? 'text-accent' : 'text-muted-foreground hover:text-accent/90'}`}
              >
                Preview <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {view === 'edit' ? (
              <div className="space-y-6">{children}</div>
            ) : (
              <div className="space-y-6">{preview}</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
