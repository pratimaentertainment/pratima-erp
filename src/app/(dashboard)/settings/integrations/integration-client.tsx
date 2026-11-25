'use client';

import * as React from 'react';
import {
  generateIntegrationKeyAction,
  revokeIntegrationKeyAction,
  toggleIntegrationStatusAction,
  updateIntegrationMetadataAction,
} from '@/actions/integration.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Code2,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  ShieldCheck,
  Settings,
  ShieldAlert,
  Sliders,
  Lock,
  Key,
} from 'lucide-react';
import { IntegrationProvider } from '@prisma/client';

interface IntegrationRecord {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  apiKey: string;
  name: string | null;
  isActive: boolean;
  metadata?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ProviderCardMeta {
  provider: IntegrationProvider;
  title: string;
  category: string;
  description: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  badgeBg: string;
  icon: string;
}

const PROVIDER_METAS: ProviderCardMeta[] = [
  {
    provider: 'FACEBOOK',
    title: 'Unified Meta Lead Ads',
    category: 'Facebook & Instagram Instant Forms',
    description:
      'Directly ingest leads from Facebook and Instagram Lead Ads with real-time Graph API field extraction, SHA-256 HMAC anti-spoofing verification, and automatic high-priority CRM ingestion.',
    accentBg: 'bg-blue-600/10 dark:bg-blue-600/20',
    accentBorder: 'border-blue-500/30',
    accentText: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    icon: '♾️',
  },
  {
    provider: 'GOOGLE',
    title: 'Google Ads Extensions',
    category: 'Search & Performance Max',
    description:
      'Hook Google Search Lead Form assets directly to your pipeline without third-party delay.',
    accentBg: 'bg-emerald-600/10 dark:bg-emerald-600/20',
    accentBorder: 'border-emerald-500/30',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    icon: '🎯',
  },
  {
    provider: 'ZAPIER',
    title: 'Zapier Automation',
    category: 'iPaaS Workflow',
    description:
      'Connect 5,000+ marketing apps (Typeform, Google Sheets, Calendly) via Zapier Webhook Catch Hook.',
    accentBg: 'bg-orange-600/10 dark:bg-orange-600/20',
    accentBorder: 'border-orange-500/30',
    accentText: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    icon: '⚡',
  },
  {
    provider: 'PABBLY',
    title: 'Pabbly Connect',
    category: 'No-Code Integration',
    description:
      'Cost-effective automation route for Indian payment gateways, WhatsApp bots, and local forms.',
    accentBg: 'bg-purple-600/10 dark:bg-purple-600/20',
    accentBorder: 'border-purple-500/30',
    accentText: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    icon: '🔄',
  },
  {
    provider: 'CUSTOM',
    title: 'Custom Webhook API',
    category: 'Developer & Custom Site',
    description:
      'Send JSON payloads from WordPress, Webflow, React landing pages, or bespoke booking forms.',
    accentBg: 'bg-slate-600/10 dark:bg-slate-600/20',
    accentBorder: 'border-slate-500/30',
    accentText: 'text-slate-700 dark:text-slate-300',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    icon: '🌐',
  },
];

export function IntegrationClient({
  initialIntegrations,
  appUrl,
}: {
  initialIntegrations: IntegrationRecord[];
  appUrl: string;
}) {
  const [integrations, setIntegrations] = React.useState<IntegrationRecord[]>(initialIntegrations);
  const [loadingProvider, setLoadingProvider] = React.useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = React.useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = React.useState<string | null>(null);
  const [copiedUrlId, setCopiedUrlId] = React.useState<string | null>(null);

  // Sample Payload Dialog State
  const [sampleModalIntegration, setSampleModalIntegration] = React.useState<IntegrationRecord | null>(null);

  // Meta Credentials Configuration Modal State
  const [metaConfigModalIntegration, setMetaConfigModalIntegration] = React.useState<IntegrationRecord | null>(null);
  const [metaAppSecret, setMetaAppSecret] = React.useState('');
  const [metaVerifyToken, setMetaVerifyToken] = React.useState('');
  const [metaPageAccessToken, setMetaPageAccessToken] = React.useState('');
  const [metaPageId, setMetaPageId] = React.useState('');
  const [isSecretRevealed, setIsSecretRevealed] = React.useState(false);
  const [isTokenRevealed, setIsTokenRevealed] = React.useState(false);
  const [isSavingMetaConfig, setIsSavingMetaConfig] = React.useState(false);

  // Compute lookup map by provider
  const integrationMap = React.useMemo(() => {
    const map = new Map<IntegrationProvider, IntegrationRecord>();
    integrations.forEach((item) => {
      map.set(item.provider, item);
    });
    return map;
  }, [integrations]);

  const handleConnect = async (provider: IntegrationProvider) => {
    setLoadingProvider(provider);
    try {
      const res = await generateIntegrationKeyAction(provider);
      if (res.success) {
        toast.success(res.message || `Connected ${provider}`);
        if (res.data) {
          setIntegrations((prev) => {
            const filtered = prev.filter((i) => i.provider !== provider);
            return [res.data, ...filtered];
          });
        }
      } else {
        toast.error(res.error || 'Failed to generate integration key');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleRevoke = async (id: string, providerName: string) => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${providerName}? Any third-party platform currently posting to this webhook will immediately receive 401 Unauthorized.`
      )
    ) {
      return;
    }

    setLoadingProvider(id);
    try {
      const res = await revokeIntegrationKeyAction(id);
      if (res.success) {
        toast.success(`Disconnected ${providerName}`);
        setIntegrations((prev) => prev.filter((i) => i.id !== id));
      } else {
        toast.error(res.error || 'Failed to revoke integration');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      const res = await toggleIntegrationStatusAction(id, !currentActive);
      if (res.success) {
        toast.success(res.message || 'Updated status');
        setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, isActive: !currentActive } : i)));
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'url', id: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
      toast.success('Key copied to clipboard');
    } else {
      setCopiedUrlId(id);
      setTimeout(() => setCopiedUrlId(null), 2000);
      toast.success('Webhook Endpoint URL copied to clipboard');
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenMetaConfigModal = (integration: IntegrationRecord) => {
    const meta = (integration.metadata as Record<string, any>) || {};
    setMetaConfigModalIntegration(integration);
    setMetaAppSecret(meta.appSecret || '');
    setMetaVerifyToken(meta.verifyToken || integration.apiKey || '');
    setMetaPageAccessToken(meta.pageAccessToken || '');
    setMetaPageId(meta.pageId || '');
  };

  const handleSaveMetaConfig = async () => {
    if (!metaConfigModalIntegration) return;
    setIsSavingMetaConfig(true);
    try {
      const res = await updateIntegrationMetadataAction(metaConfigModalIntegration.id, {
        appSecret: metaAppSecret.trim() || undefined,
        verifyToken: metaVerifyToken.trim() || undefined,
        pageAccessToken: metaPageAccessToken.trim() || undefined,
        pageId: metaPageId.trim() || undefined,
      });

      if (res.success) {
        toast.success('Meta credentials saved successfully');
        setIntegrations((prev) =>
          prev.map((i) => (i.id === metaConfigModalIntegration.id ? res.data : i))
        );
        setMetaConfigModalIntegration(null);
      } else {
        toast.error(res.error || 'Failed to save Meta credentials');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsSavingMetaConfig(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Value Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unified Omnichannel Lead Engine v3</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
              Automated Inbound Lead Ingestion
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect Meta Lead Ads (Facebook &amp; Instagram), Google Ads, and automation pipelines.
              Leads are fetched in real-time via Meta Graph API, cryptographically verified with HMAC-SHA256,
              and deposited into your CRM as High-Priority Inquiries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-background/60 text-center min-w-[110px]">
              <span className="text-2xl font-black text-foreground">{integrations.length}</span>
              <span className="text-[11px] text-muted-foreground font-medium">Configured</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-background/60 text-center min-w-[110px]">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {integrations.filter((i) => i.isActive).length}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PROVIDER_METAS.map((meta) => {
          const integration = integrationMap.get(meta.provider);
          const isConnected = !!integration;
          const isMeta = meta.provider === 'FACEBOOK';

          const webhookUrl = integration
            ? isMeta
              ? `${appUrl}/api/webhooks/meta?key=${integration.apiKey}`
              : `${appUrl}/api/webhooks/inquiries?key=${integration.apiKey}&source=${meta.provider}`
            : '';

          const isKeyRevealed = integration ? !!revealedKeys[integration.id] : false;
          const isLoading =
            loadingProvider === meta.provider || (integration && loadingProvider === integration.id);

          const metaConfig = (integration?.metadata as Record<string, any>) || {};
          const isMetaConfigured = Boolean(metaConfig.pageAccessToken && metaConfig.appSecret);

          return (
            <Card
              key={meta.provider}
              className={`flex flex-col justify-between transition-all duration-200 ${
                isConnected
                  ? 'border-border/80 shadow-xs hover:border-primary/40'
                  : 'border-dashed border-border hover:border-border/90'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-xs border ${meta.accentBorder} ${meta.accentBg}`}
                    >
                      <span>{meta.icon}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold font-heading">{meta.title}</CardTitle>
                      <CardDescription className="text-xs font-medium mt-0.5">
                        {meta.category}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isConnected ? (
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold flex items-center gap-1 ${
                        integration.isActive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          integration.isActive ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <span>{integration.isActive ? 'Active' : 'Paused'}</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                      Available
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-xs flex-1">
                <p className="text-muted-foreground leading-relaxed">{meta.description}</p>

                {/* Connected View Details */}
                {isConnected && integration && (
                  <div className="space-y-3 pt-2 border-t">
                    {/* Meta Security Status Chips */}
                    {isMeta && (
                      <div className="flex flex-wrap items-center gap-1.5 py-1">
                        {metaConfig.appSecret ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>HMAC Active</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] gap-1"
                          >
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>Missing Secret</span>
                          </Badge>
                        )}

                        {metaConfig.pageAccessToken ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1"
                          >
                            <Zap className="w-3 h-3 text-emerald-600" />
                            <span>Graph API Active</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[10px] gap-1"
                          >
                            <Key className="w-3 h-3 text-rose-600" />
                            <span>Token Required</span>
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Webhook Endpoint */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground mb-1">
                        <span>Webhook Callback URL</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(webhookUrl, 'url', integration.id)}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {copiedUrlId === integration.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedUrlId === integration.id ? 'Copied' : 'Copy URL'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          readOnly
                          value={webhookUrl}
                          className="font-mono text-[11px] h-8 pr-8 bg-muted/40 text-muted-foreground"
                        />
                      </div>
                    </div>

                    {/* API Key / Verify Token */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground mb-1">
                        <span>{isMeta ? 'Verify Token / Key' : 'Secret API Key'}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility(integration.id)}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                          >
                            {isKeyRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{isKeyRevealed ? 'Hide' : 'Reveal'}</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                isMeta && metaConfig.verifyToken ? metaConfig.verifyToken : integration.apiKey,
                                'key',
                                integration.id
                              )
                            }
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {copiedKeyId === integration.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedKeyId === integration.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                      <Input
                        readOnly
                        type={isKeyRevealed ? 'text' : 'password'}
                        value={isMeta && metaConfig.verifyToken ? metaConfig.verifyToken : integration.apiKey}
                        className="font-mono text-[11px] h-8 bg-muted/40 text-muted-foreground"
                      />
                    </div>

                    {/* Active toggle, Inspect, and Meta Configuration */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={integration.isActive}
                          onCheckedChange={() => handleToggle(integration.id, integration.isActive)}
                          id={`switch-${integration.id}`}
                        />
                        <label
                          htmlFor={`switch-${integration.id}`}
                          className="text-[11px] text-muted-foreground cursor-pointer font-medium"
                        >
                          {integration.isActive ? 'Receiving Leads' : 'Paused'}
                        </label>
                      </div>

                      <div className="flex items-center gap-1">
                        {isMeta && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenMetaConfigModal(integration)}
                            className="h-7 text-[11px] px-2 text-foreground hover:bg-muted gap-1"
                            title="Configure Meta App Secret and Page Access Token"
                          >
                            <Sliders className="w-3 h-3 text-primary" />
                            <span>Credentials</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSampleModalIntegration(integration)}
                          className="h-7 text-[11px] px-2 text-primary font-medium hover:bg-primary/10 gap-1"
                        >
                          <Code2 className="w-3 h-3" />
                          <span>Inspect</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-3 border-t bg-muted/10 flex items-center justify-between">
                {isConnected && integration ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConnect(meta.provider)}
                      disabled={Boolean(isLoading)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      title="Rotate and regenerate secret key"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Rotate Key</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(integration.id, meta.title)}
                      disabled={Boolean(isLoading)}
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleConnect(meta.provider)}
                    disabled={Boolean(isLoading)}
                    className="w-full h-8 text-xs font-semibold gap-1.5"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>Connect &amp; Setup Webhook</span>
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Meta Credentials Setup Modal */}
      {metaConfigModalIntegration && (
        <Dialog
          open={Boolean(metaConfigModalIntegration)}
          onOpenChange={(open) => !open && setMetaConfigModalIntegration(null)}
        >
          <DialogContent className="max-w-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Meta Lead Ads Credentials &amp; Verification</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure your Meta Developer App credentials to enable real-time Graph API lead retrieval and
                HMAC-SHA256 signature verification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Webhook Callback URL display */}
              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <span className="font-semibold text-foreground">Callback URL (for Meta App Dashboard):</span>
                <p className="font-mono text-[11px] text-primary break-all">
                  {appUrl}/api/webhooks/meta?key={metaConfigModalIntegration.apiKey}
                </p>
              </div>

              {/* Verify Token */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Verify Token</span>
                  <span className="text-[10px] text-muted-foreground">Must match Meta App Dashboard</span>
                </label>
                <Input
                  value={metaVerifyToken}
                  onChange={(e) => setMetaVerifyToken(e.target.value)}
                  placeholder="e.g. my_meta_verify_token"
                  className="font-mono text-xs h-9"
                />
              </div>

              {/* Meta App Secret */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Meta App Secret</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSecretRevealed(!isSecretRevealed)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    {isSecretRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{isSecretRevealed ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <Input
                  type={isSecretRevealed ? 'text' : 'password'}
                  value={metaAppSecret}
                  onChange={(e) => setMetaAppSecret(e.target.value)}
                  placeholder="Paste Meta App Secret from App Settings > Basic"
                  className="font-mono text-xs h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Used to validate incoming X-Hub-Signature-256 HMAC headers and prevent spoofing.
                </p>
              </div>

              {/* Page Access Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Meta Page Access Token (Permanent / System User)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTokenRevealed(!isTokenRevealed)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    {isTokenRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{isTokenRevealed ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={metaPageAccessToken}
                  onChange={(e) => setMetaPageAccessToken(e.target.value)}
                  placeholder="EAAG..."
                  className="w-full p-2.5 rounded-lg border border-border bg-background font-mono text-[11px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-tight resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Required to fetch customer contact details from Graph API using the leadgen_id.
                </p>
              </div>

              {/* Optional Page ID */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Facebook Page ID (Optional)</span>
                  <span className="text-[10px] text-muted-foreground">For multi-tenant routing</span>
                </label>
                <Input
                  value={metaPageId}
                  onChange={(e) => setMetaPageId(e.target.value)}
                  placeholder="e.g. 102938475610293"
                  className="font-mono text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="flex sm:justify-between items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMetaConfigModalIntegration(null)}
                disabled={isSavingMetaConfig}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMetaConfig}
                disabled={isSavingMetaConfig}
                className="gap-1.5"
              >
                {isSavingMetaConfig ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>Save Credentials</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Developer Sample Payload & Testing Modal */}
      {sampleModalIntegration && (
        <Dialog open={!!sampleModalIntegration} onOpenChange={() => setSampleModalIntegration(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                <span>Test Webhook Payload ({sampleModalIntegration.provider === 'FACEBOOK' ? 'Unified Meta' : sampleModalIntegration.provider})</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {sampleModalIntegration.provider === 'FACEBOOK'
                  ? 'Meta Lead Ads sends real-time notifications with leadgen_id, which FRAMIQ automatically queries via Graph API.'
                  : 'Use this sample cURL request or JSON payload to verify your webhook in Postman, Zapier, or Pabbly Connect.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {sampleModalIntegration.provider === 'FACEBOOK' ? (
                <>
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">Meta Webhook Verification Handshake URL</span>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed">
{`${appUrl}/api/webhooks/meta?key=${sampleModalIntegration.apiKey}`}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">Sample Meta RTU Inbound Payload</span>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed">
{`{
  "object": "page",
  "entry": [
    {
      "id": "100234567890",
      "time": 1731557000,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "ad_id": "120210000000",
            "form_id": "893120000000",
            "leadgen_id": "774920000000",
            "created_time": 1731556990,
            "page_id": "100234567890"
          }
        }
      ]
    }
  ]
}`}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>cURL Command</span>
                    <button
                      type="button"
                      onClick={() => {
                        const curl = `curl -X POST "${appUrl}/api/webhooks/inquiries?key=${sampleModalIntegration.apiKey}&source=${sampleModalIntegration.provider}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ananya Sharma",
    "phone": "+91 98765 43210",
    "email": "ananya@example.com",
    "eventDate": "2026-11-20",
    "eventType": "Wedding Photography",
    "preferredContactTime": "Evening",
    "budgetRange": "₹1,50,000 - ₹3,00,000",
    "notes": "3-day destination wedding in Udaipur."
  }'`;
                        navigator.clipboard.writeText(curl);
                        toast.success('cURL command copied!');
                      }}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy cURL</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed">
{`curl -X POST "${appUrl}/api/webhooks/inquiries?key=${sampleModalIntegration.apiKey}&source=${sampleModalIntegration.provider}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ananya Sharma",
    "phone": "+91 98765 43210",
    "email": "ananya@example.com",
    "eventDate": "2026-11-20",
    "eventType": "Wedding Photography",
    "preferredContactTime": "Evening",
    "budgetRange": "₹1,50,000 - ₹3,00,000",
    "notes": "3-day destination wedding in Udaipur."
  }'`}
                  </pre>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSampleModalIntegration(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
