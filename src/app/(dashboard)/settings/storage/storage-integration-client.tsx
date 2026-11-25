'use client';

import React, { useState, useTransition } from 'react';
import {
  Cloud,
  HardDrive,
  Server,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Database,
  RefreshCw,
  Eye,
  EyeOff,
  Star,
  ExternalLink,
  Lock,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { StorageProvider } from '@prisma/client';
import {
  saveStorageIntegrationAction,
  toggleStorageIntegrationAction,
  deleteStorageIntegrationAction,
  setDefaultStorageIntegrationAction,
} from '@/actions/storage.actions';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface StorageIntegrationItem {
  id: string;
  provider: 'GOOGLE_DRIVE' | 'AWS_S3' | 'CLOUDFLARE_R2';
  isActive: boolean;
  isDefault: boolean;
  recordCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface StorageIntegrationClientProps {
  initialIntegrations: StorageIntegrationItem[];
}

export function StorageIntegrationClient({ initialIntegrations }: StorageIntegrationClientProps) {
  const [integrations, setIntegrations] = useState<StorageIntegrationItem[]>(initialIntegrations);
  const [isPending, startTransition] = useTransition();

  // Handle redirect query params (e.g. from Google OAuth callback)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'google_connected') {
      toast.success('Google Drive successfully connected via OAuth 2.0!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(`Google Drive connection failed: ${error.replace(/_/g, ' ')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'AWS_S3' | 'CLOUDFLARE_R2' | 'GOOGLE_DRIVE'>('AWS_S3');
  const [editingIntegration, setEditingIntegration] = useState<StorageIntegrationItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states - AWS S3
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Region, setS3Region] = useState('ap-south-1');
  const [s3Endpoint, setS3Endpoint] = useState('');

  // Form states - Cloudflare R2
  const [r2AccountId, setR2AccountId] = useState('');
  const [r2AccessKey, setR2AccessKey] = useState('');
  const [r2SecretKey, setR2SecretKey] = useState('');
  const [r2Bucket, setR2Bucket] = useState('');
  const [r2PublicUrl, setR2PublicUrl] = useState('');

  // Common Form states
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Open modal for new integration
  const handleOpenAddModal = (provider?: 'AWS_S3' | 'CLOUDFLARE_R2' | 'GOOGLE_DRIVE') => {
    setEditingIntegration(null);
    setSelectedProvider(provider || 'AWS_S3');
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setS3AccessKey('');
    setS3SecretKey('');
    setS3Bucket('');
    setS3Region('ap-south-1');
    setS3Endpoint('');

    setR2AccountId('');
    setR2AccessKey('');
    setR2SecretKey('');
    setR2Bucket('');
    setR2PublicUrl('');

    setIsDefault(integrations.length === 0);
    setIsActive(true);
    setShowSecretKey(false);
    setFormError(null);
  };

  // Submit integration form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let credentials: Record<string, any> = {};

    if (selectedProvider === 'AWS_S3') {
      if (!s3AccessKey.trim()) {
        setFormError('AWS Access Key ID is required.');
        return;
      }
      if (!s3SecretKey.trim()) {
        setFormError('AWS Secret Access Key is required.');
        return;
      }
      if (!s3Bucket.trim()) {
        setFormError('S3 Bucket name is required.');
        return;
      }
      if (!s3Region.trim()) {
        setFormError('AWS Region is required.');
        return;
      }

      credentials = {
        accessKeyId: s3AccessKey.trim(),
        secretAccessKey: s3SecretKey.trim(),
        bucket: s3Bucket.trim(),
        region: s3Region.trim(),
        ...(s3Endpoint.trim() ? { endpoint: s3Endpoint.trim() } : {}),
      };
    } else if (selectedProvider === 'CLOUDFLARE_R2') {
      if (!r2AccountId.trim()) {
        setFormError('Cloudflare Account ID is required.');
        return;
      }
      if (!r2AccessKey.trim()) {
        setFormError('R2 Access Key ID is required.');
        return;
      }
      if (!r2SecretKey.trim()) {
        setFormError('R2 Secret Access Key is required.');
        return;
      }
      if (!r2Bucket.trim()) {
        setFormError('R2 Bucket name is required.');
        return;
      }

      credentials = {
        accountId: r2AccountId.trim(),
        accessKeyId: r2AccessKey.trim(),
        secretAccessKey: r2SecretKey.trim(),
        bucket: r2Bucket.trim(),
        ...(r2PublicUrl.trim() ? { publicUrl: r2PublicUrl.trim() } : {}),
      };
    } else if (selectedProvider === 'GOOGLE_DRIVE') {
      window.location.href = '/api/integrations/google/init';
      return;
    }

    startTransition(async () => {
      const payload = {
        ...(editingIntegration ? { id: editingIntegration.id } : {}),
        provider: selectedProvider as StorageProvider,
        credentials,
        isActive,
        isDefault,
      };

      const result = await saveStorageIntegrationAction(payload);

      if (!result.success) {
        setFormError(result.error || 'Failed to save storage integration.');
        toast.error(result.error || 'Failed to connect storage provider.');
        return;
      }

      toast.success(
        editingIntegration
          ? 'Storage integration updated successfully!'
          : 'Storage provider connected securely!'
      );

      // Update state locally
      const savedItem = result.data as StorageIntegrationItem;
      setIntegrations((prev) => {
        let updatedList: StorageIntegrationItem[];
        if (editingIntegration) {
          updatedList = prev.map((item) => (item.id === savedItem.id ? { ...item, ...savedItem } : item));
        } else {
          updatedList = [savedItem, ...prev];
        }

        // If saved as default, unmark other defaults
        if (savedItem.isDefault) {
          updatedList = updatedList.map((item) =>
            item.id === savedItem.id ? item : { ...item, isDefault: false }
          );
        }
        return updatedList;
      });

      setIsModalOpen(false);
      resetForm();
    });
  };

  // Toggle active status
  const handleToggleActive = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const nextActive = !currentActive;
      const result = await toggleStorageIntegrationAction(id, nextActive);

      if (!result.success) {
        toast.error(result.error || 'Failed to update provider status.');
        return;
      }

      setIntegrations((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isActive: nextActive } : item))
      );

      toast.success(`Storage provider ${nextActive ? 'activated' : 'deactivated'}.`);
    });
  };

  // Set as default provider
  const handleSetDefault = (id: string) => {
    startTransition(async () => {
      const result = await setDefaultStorageIntegrationAction(id);

      if (!result.success) {
        toast.error(result.error || 'Failed to set default provider.');
        return;
      }

      setIntegrations((prev) =>
        prev.map((item) => ({
          ...item,
          isDefault: item.id === id,
          isActive: item.id === id ? true : item.isActive,
        }))
      );

      toast.success('Default storage provider updated.');
    });
  };

  // Delete/Disconnect provider
  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;

    startTransition(async () => {
      const result = await deleteStorageIntegrationAction(deleteConfirmId);

      if (!result.success) {
        toast.error(result.error || 'Failed to remove storage provider.');
        return;
      }

      setIntegrations((prev) => prev.filter((item) => item.id !== deleteConfirmId));
      toast.success('Storage provider disconnected successfully.');
      setDeleteConfirmId(null);
    });
  };

  // Formatting helpers
  const getProviderInfo = (provider: StorageProvider | string) => {
    switch (provider) {
      case 'AWS_S3':
        return {
          title: 'Amazon Web Services S3',
          shortName: 'AWS S3',
          icon: Server,
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          description: 'Industry-standard object storage. Ideal for RAW footage and lifetime archiving.',
        };
      case 'CLOUDFLARE_R2':
        return {
          title: 'Cloudflare R2 Storage',
          shortName: 'Cloudflare R2',
          icon: Cloud,
          color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
          badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
          description: 'S3-compatible object storage with ZERO egress bandwidth fees. Recommended for customer album delivery.',
        };
      case 'GOOGLE_DRIVE':
        return {
          title: 'Google Drive Workspace',
          shortName: 'Google Drive',
          icon: HardDrive,
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
          description: 'Shared enterprise drive integration for direct folder access and client photo selection links.',
        };
      default:
        return {
          title: provider,
          shortName: provider,
          icon: Database,
          color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
          badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
          description: 'Custom cloud storage adapter.',
        };
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Information & Zero Markup Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Zero Markup Storage</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your personal cloud bucket. Files stream directly to your account with zero platform bandwidth markups.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">AES-256-GCM Encryption</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All cloud credentials and private tokens are encrypted at rest with authenticated 256-bit cryptography.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Automated Proof Delivery</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Customer gallery links, album selections, and watermark exports automatically resolve to your active cloud bucket.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Integrations Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Connected Storage Providers</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your connected cloud endpoints and configure default storage targets.
            </p>
          </div>
          <Button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Storage Provider</span>
          </Button>
        </div>

        {integrations.length === 0 ? (
          <Card className="border-dashed border-2 bg-card/40">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Cloud className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-semibold">No Cloud Storage Connected</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your AWS S3, Cloudflare R2, or Google Drive workspace to start delivering customer photo albums and high-res media.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenAddModal('CLOUDFLARE_R2')}
                  className="flex items-center gap-2"
                >
                  <Cloud className="w-4 h-4 text-orange-500" />
                  Connect Cloudflare R2
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenAddModal('AWS_S3')}
                  className="flex items-center gap-2"
                >
                  <Server className="w-4 h-4 text-amber-500" />
                  Connect AWS S3
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenAddModal('GOOGLE_DRIVE')}
                  className="flex items-center gap-2"
                >
                  <HardDrive className="w-4 h-4 text-blue-500" />
                  Connect Google Drive
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {integrations.map((item) => {
              const info = getProviderInfo(item.provider);
              const ProviderIcon = info.icon;

              return (
                <Card
                  key={item.id}
                  className={`relative flex flex-col justify-between transition-all duration-200 border ${
                    item.isDefault
                      ? 'border-primary/60 shadow-sm ring-1 ring-primary/20'
                      : 'border-border/80 hover:border-primary/40'
                  }`}
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header with Provider Icon & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg border ${info.color}`}>
                          <ProviderIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base leading-tight">{info.shortName}</h3>
                          <span className="text-xs text-muted-foreground">{info.title}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {item.isDefault && (
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-primary/20 text-xs flex items-center gap-1 font-medium">
                            <Star className="w-3 h-3 fill-primary" />
                            Default
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            item.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {info.description}
                    </p>

                    {/* Stats & Meta info */}
                    <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Linked Assets</span>
                        <span className="font-medium text-foreground">
                          {item.recordCount} {item.recordCount === 1 ? 'file' : 'files'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Connected On</span>
                        <span className="font-medium text-foreground">{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Actions Footer */}
                  <div className="px-5 py-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!item.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleSetDefault(item.id)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Set as Default Storage Target"
                        >
                          <Star className="w-3.5 h-3.5 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleToggleActive(item.id, item.isActive)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {item.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Disconnect Integration"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect Storage Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Cloud className="w-5 h-5 text-primary" />
              <span>Connect Storage Provider</span>
            </DialogTitle>
            <DialogDescription>
              Select your cloud provider and provide authenticated credentials. Keys are encrypted at rest with AES-256-GCM.
            </DialogDescription>
          </DialogHeader>

          {/* Provider Selection Tabs */}
          <div className="space-y-4 my-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Choose Cloud Provider
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('AWS_S3');
                  setFormError(null);
                }}
                className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                  selectedProvider === 'AWS_S3'
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Server className="w-6 h-6 mb-1.5 text-amber-500" />
                <span className="text-sm font-semibold">AWS S3</span>
                <span className="text-[11px] opacity-75 mt-0.5">Amazon Web Services</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('CLOUDFLARE_R2');
                  setFormError(null);
                }}
                className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                  selectedProvider === 'CLOUDFLARE_R2'
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Cloud className="w-6 h-6 mb-1.5 text-orange-500" />
                <span className="text-sm font-semibold">Cloudflare R2</span>
                <span className="text-[11px] opacity-75 mt-0.5">Zero Egress Fees</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('GOOGLE_DRIVE');
                  setFormError(null);
                }}
                className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                  selectedProvider === 'GOOGLE_DRIVE'
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <HardDrive className="w-6 h-6 mb-1.5 text-blue-500" />
                <span className="text-sm font-semibold">Google Drive</span>
                <span className="text-[11px] opacity-75 mt-0.5">Workspace / Drive</span>
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* AWS S3 Form */}
            {selectedProvider === 'AWS_S3' && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="s3AccessKey" className="text-xs">
                      AWS Access Key ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="s3AccessKey"
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      value={s3AccessKey}
                      onChange={(e) => setS3AccessKey(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="s3SecretKey" className="text-xs">
                        AWS Secret Access Key <span className="text-destructive">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showSecretKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <Input
                      id="s3SecretKey"
                      type={showSecretKey ? 'text' : 'password'}
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      value={s3SecretKey}
                      onChange={(e) => setS3SecretKey(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="s3Bucket" className="text-xs">
                      S3 Bucket Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="s3Bucket"
                      placeholder="pratima-studio-albums"
                      value={s3Bucket}
                      onChange={(e) => setS3Bucket(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="s3Region" className="text-xs">
                      AWS Region <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="s3Region"
                      placeholder="ap-south-1 (Mumbai), us-east-1, etc."
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s3Endpoint" className="text-xs text-muted-foreground">
                    Custom S3 Endpoint URL (Optional)
                  </Label>
                  <Input
                    id="s3Endpoint"
                    placeholder="https://s3.custom-gateway.com (leave empty for standard AWS)"
                    value={s3Endpoint}
                    onChange={(e) => setS3Endpoint(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Only required if using MinIO, Wasabi, or private S3 compatible gateways.
                  </p>
                </div>
              </div>
            )}

            {/* Cloudflare R2 Form */}
            {selectedProvider === 'CLOUDFLARE_R2' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="r2AccountId" className="text-xs">
                    Cloudflare Account ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="r2AccountId"
                    placeholder="32-character hexadecimal account ID"
                    value={r2AccountId}
                    onChange={(e) => setR2AccountId(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Found on your Cloudflare dashboard overview or R2 overview page.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="r2AccessKey" className="text-xs">
                      R2 Access Key ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="r2AccessKey"
                      placeholder="R2 API Token Access Key"
                      value={r2AccessKey}
                      onChange={(e) => setR2AccessKey(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="r2SecretKey" className="text-xs">
                        R2 Secret Access Key <span className="text-destructive">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showSecretKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <Input
                      id="r2SecretKey"
                      type={showSecretKey ? 'text' : 'password'}
                      placeholder="R2 API Token Secret"
                      value={r2SecretKey}
                      onChange={(e) => setR2SecretKey(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="r2Bucket" className="text-xs">
                      R2 Bucket Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="r2Bucket"
                      placeholder="pratima-media-bucket"
                      value={r2Bucket}
                      onChange={(e) => setR2Bucket(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="r2PublicUrl" className="text-xs text-muted-foreground">
                      Public Custom Domain / Worker URL (Optional)
                    </Label>
                    <Input
                      id="r2PublicUrl"
                      placeholder="https://media.pratimaphotography.com"
                      value={r2PublicUrl}
                      onChange={(e) => setR2PublicUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Google Drive Form (Platform OAuth 2.0) */}
            {selectedProvider === 'GOOGLE_DRIVE' && (
              <div className="space-y-4 py-1">
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Google Drive Workspace Integration</h4>
                      <p className="text-xs text-muted-foreground">
                        Connect your studio's Google Drive securely via Google OAuth 2.0.
                      </p>
                    </div>
                  </div>

                  <ul className="text-xs text-muted-foreground space-y-1.5 pl-4 list-disc">
                    <li>No complex Service Account keys or JSON file uploads required.</li>
                    <li>Secure offline authorization tokens encrypted at rest with AES-256-GCM.</li>
                    <li>Direct high-speed browser-to-cloud resumable streaming.</li>
                  </ul>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        window.location.href = '/api/integrations/google/init';
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 shadow-sm"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>Connect Google Drive (OAuth)</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Checkbox Options (for AWS S3 and Cloudflare R2) */}
            {selectedProvider !== 'GOOGLE_DRIVE' && (
              <div className="pt-2 border-t border-border/80 space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Set as Default Storage Target for all new customer albums and media</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Active (Enable immediate uploads and proof sharing)</span>
                </label>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-3 rounded-lg bg-muted/40 border text-xs flex items-center gap-2 text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                All credentials will be securely encrypted using AES-256-GCM. Plain-text keys are never stored.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              {selectedProvider !== 'GOOGLE_DRIVE' && (
                <Button type="submit" disabled={isPending} className="flex items-center gap-2">
                  {isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Encrypting & Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Connect Provider</span>
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Disconnect Storage Provider?</span>
            </DialogTitle>
            <DialogDescription>
              This will safely remove your API credentials from FRAMIQ. Past delivered file links will remain preserved in historical audit records, but new uploads to this bucket will cease.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              {isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Yes, Disconnect</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
