/**
 * AgencyOS Settings page.
 * Functional settings workspace for organization and user preferences.
 * Organization-level settings are restricted to Administrator role.
 * Users can always update their own profile fields.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OrganizationSettings {
  brandName?: string;
  brandColor?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  defaultCurrency?: string;
  dateFormat?: string;
  invoiceNumberPrefix?: string;
  invoiceNextNumber?: number;
  invoiceTaxDefault?: number;
  proposalNumberPrefix?: string;
  proposalNextNumber?: number;
  proposalValidDays?: number;
}

interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: OrganizationSettings;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfileResponse {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  status: string;
  organizationId: string | null;
}

type FormMode = 'idle' | 'saving' | 'success' | 'error';

export default function SettingsPage() {
  const [org, setOrg] = useState<OrganizationResponse | null>(null);
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [orgMode, setOrgMode] = useState<FormMode>('idle');
  const [userMode, setUserMode] = useState<FormMode>('idle');
  const [orgMessage, setOrgMessage] = useState<string>('');
  const [userMessage, setUserMessage] = useState<string>('');
  const [orgError, setOrgError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  // Organization form state (defaults from server)
  const [orgName, setOrgName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceNextNumber, setInvoiceNextNumber] = useState('');
  const [invoiceTaxDefault, setInvoiceTaxDefault] = useState('');
  const [proposalPrefix, setProposalPrefix] = useState('');
  const [proposalNextNumber, setProposalNextNumber] = useState('');
  const [proposalValidDays, setProposalValidDays] = useState('');

  // User form state
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [orgRes, userRes] = await Promise.all([
          fetch('/api/v1/settings/organization'),
          fetch('/api/v1/settings/user'),
        ]);

        if (cancelled) return;

        if (!orgRes.ok || !userRes.ok) {
          throw new Error('Failed to load settings');
        }

        const orgData: OrganizationResponse = await orgRes.json();
        const userData: UserProfileResponse = await userRes.json();

        if (cancelled) return;

        setOrg(orgData);
        setUser(userData);

        // Populate org form
        setOrgName(orgData.name);
        const s = orgData.settings;
        setBrandName(s.brandName ?? '');
        setBrandColor(s.brandColor ?? '');
        setLogoUrl(s.logoUrl ?? '');
        setContactEmail(s.contactEmail ?? '');
        setContactPhone(s.contactPhone ?? '');
        setAddress(s.address ?? '');
        setCity(s.city ?? '');
        setCountry(s.country ?? '');
        setPostalCode(s.postalCode ?? '');
        setDefaultCurrency(s.defaultCurrency ?? '');
        setDateFormat(s.dateFormat ?? '');
        setInvoicePrefix(s.invoiceNumberPrefix ?? '');
        setInvoiceNextNumber(s.invoiceNextNumber?.toString() ?? '');
        setInvoiceTaxDefault(s.invoiceTaxDefault?.toString() ?? '');
        setProposalPrefix(s.proposalNumberPrefix ?? '');
        setProposalNextNumber(s.proposalNextNumber?.toString() ?? '');
        setProposalValidDays(s.proposalValidDays?.toString() ?? '');

        // Populate user form
        setDisplayName(userData.name ?? '');
        setAvatarUrl(userData.image ?? '');
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load settings:', err);
          const message = err instanceof Error ? err.message : 'Failed to load settings';
          setOrgError(message);
          setUserError(message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.isAdmin) return;

    setOrgMode('saving');
    setOrgMessage('');

    try {
      const res = await fetch('/api/v1/settings/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName || undefined,
          settings: {
            brandName: brandName || undefined,
            brandColor: brandColor || undefined,
            logoUrl: logoUrl || undefined,
            contactEmail: contactEmail || undefined,
            contactPhone: contactPhone || undefined,
            address: address || undefined,
            city: city || undefined,
            country: country || undefined,
            postalCode: postalCode || undefined,
            defaultCurrency: defaultCurrency || undefined,
            dateFormat: dateFormat || undefined,
            invoiceNumberPrefix: invoicePrefix || undefined,
            invoiceNextNumber: invoiceNextNumber ? parseInt(invoiceNextNumber, 10) : undefined,
            invoiceTaxDefault: invoiceTaxDefault ? parseFloat(invoiceTaxDefault) : undefined,
            proposalNumberPrefix: proposalPrefix || undefined,
            proposalNextNumber: proposalNextNumber ? parseInt(proposalNextNumber, 10) : undefined,
            proposalValidDays: proposalValidDays ? parseInt(proposalValidDays, 10) : undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || 'Failed to update organization settings');
      }

      const data = await res.json();
      setOrg(data);
      setOrgMode('success');
      setOrgMessage('Organization settings saved.');
    } catch (err) {
      setOrgMode('error');
      setOrgMessage((err as Error).message);
    } finally {
      setTimeout(() => setOrgMode('idle'), 3000);
    }
  };

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setUserMode('saving');
    setUserMessage('');

    try {
      const res = await fetch('/api/v1/settings/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName || undefined,
          avatarUrl: avatarUrl || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || 'Failed to update profile');
      }

      const data = await res.json();
      setUser(data);
      setUserMode('success');
      setUserMessage('Profile saved.');

      setTimeout(() => setUserMode('idle'), 3000);
    } catch (err) {
      setUserMode('error');
      setUserMessage((err as Error).message);
    } finally {
      setTimeout(() => setUserMode('idle'), 3000);
    }
  };

  if (!org || !user) {
    if (orgError || userError) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-1">Failed to load settings</h3>
            <p className="text-sm text-red-700">
              {orgError || userError || 'Unable to load settings. Please try again.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1.5 text-sm font-medium text-red-600 hover:underline"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage organization and user preferences.</p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Organization Settings */}
      <section className="rounded-md border bg-background p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Organization Settings</h2>
          {org.isAdmin ? (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Administrator
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
              Read-only
            </span>
          )}
        </div>

        {!org.isAdmin && (
          <div className="mb-4 p-3 rounded-md bg-amber-50 text-amber-800 text-sm">
            You are viewing organization settings in read-only mode. Organization-level changes
            require the Administrator role.
          </div>
        )}

        <form onSubmit={handleOrgSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                placeholder="AgencyOS"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default currency</label>
              <input
                type="text"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                placeholder="USD"
                maxLength={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50 bg-background"
              >
                <option value="">System default</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand color</label>
              <input
                type="color"
                value={brandColor || '#000000'}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={!org.isAdmin}
                className="w-12 h-9 rounded-md border-0 disabled:opacity-50 cursor-pointer disabled:not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              disabled={!org.isAdmin}
              className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              placeholder="AgencyOS"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Logo URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={!org.isAdmin}
              className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <h3 className="text-sm font-semibold mb-2 mt-4">Contact information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Postal code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
              />
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-2 mt-4">Invoice preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Number prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                placeholder="INV"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Next number</label>
              <input
                type="number"
                value={invoiceNextNumber}
                onChange={(e) => setInvoiceNextNumber(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default tax rate (%)</label>
              <input
                type="number"
                value={invoiceTaxDefault}
                onChange={(e) => setInvoiceTaxDefault(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-2 mt-4">Proposal preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Number prefix</label>
              <input
                type="text"
                value={proposalPrefix}
                onChange={(e) => setProposalPrefix(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                placeholder="PROP"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Next number</label>
              <input
                type="number"
                value={proposalNextNumber}
                onChange={(e) => setProposalNextNumber(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valid days</label>
              <input
                type="number"
                value={proposalValidDays}
                onChange={(e) => setProposalValidDays(e.target.value)}
                disabled={!org.isAdmin}
                className="border border-input rounded-md px-3 py-2 text-sm disabled:bg-muted/50"
                min="1"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!org.isAdmin || orgMode === 'saving'}
              className={`px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 ${
                orgMode === 'saving'
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90'
              }`}
            >
              {orgMode === 'saving' ? 'Saving...' : 'Save Organization Settings'}
            </button>
          </div>

          {orgMessage && (
            <div
              className={`mt-3 p-3 rounded-md text-sm ${
                orgMode === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {orgMessage}
            </div>
          )}
        </form>
      </section>

      {/* User Profile Settings */}
      <section className="rounded-md border bg-background p-6">
        <h2 className="text-lg font-semibold mb-4">User Profile</h2>
        <form onSubmit={handleUserSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="border border-input rounded-md px-3 py-2 text-sm"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="border border-input rounded-md px-3 py-2 text-sm"
                placeholder="https://example.com/avatar.png"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="border border-input rounded-md px-3 py-2 text-sm bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed from Settings.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <input
              type="text"
              value={user.role}
              readOnly
              className="border border-input rounded-md px-3 py-2 text-sm bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <input
              type="text"
              value={user.status}
              readOnly
              className="border border-input rounded-md px-3 py-2 text-sm bg-muted/50"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={userMode === 'saving'}
              className={`px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 ${
                userMode === 'saving'
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90'
              }`}
            >
              {userMode === 'saving' ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          {userMessage && (
            <div
              className={`mt-3 p-3 rounded-md text-sm ${
                userMode === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {userMessage}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
