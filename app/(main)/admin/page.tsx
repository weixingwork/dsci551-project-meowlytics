'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { ShieldIcon, UploadIcon, UserIcon } from '../components/icons';

interface UploadResult {
  success?: boolean;
  message?: string;
  created?: number;
  updated?: number;
  error?: string;
  details?: string[];
}

interface RateLimitConfig {
  analyzeIpPerMinute: number;
  analyzeUserPerDay: number;
  forgotPerIpPerMinute: number;
  forgotEmailCooldownSeconds: number;
}

interface RateLimitResponse {
  config?: RateLimitConfig;
  error?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  analyzeIpPerMinute: 6,
  analyzeUserPerDay: 10,
  forgotPerIpPerMinute: 5,
  forgotEmailCooldownSeconds: 300,
};

export default function AdminPage() {
  const user = useFavoritesStore((state) => state.user);
  const initialized = useFavoritesStore((state) => state.initialized);
  const initialize = useFavoritesStore((state) => state.initialize);
  const [payload, setPayload] = useState(
    '{\n  "ingredients": [\n    {\n      "name": "Chicken",\n      "nameEn": "Chicken",\n      "aliases": ["Chicken breast", "Chicken meal"],\n      "category": "protein",\n      "healthImpact": "good",\n      "description": "High-quality animal protein source",\n      "benefits": ["Provides protein"],\n      "concerns": ["Possible allergen"],\n      "suitableFor": ["Adult cats"],\n      "notSuitableFor": ["Chicken-allergic cats"],\n      "source": "knowledge_base"\n    }\n  ]\n}'
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [limitConfig, setLimitConfig] = useState<RateLimitConfig>(DEFAULT_CONFIG);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  const prettyResult = useMemo(() => (result ? JSON.stringify(result, null, 2) : ''), [result]);

  const loadRateLimits = async () => {
    setLoadingLimits(true);
    setLimitError(null);
    try {
      const response = await fetch('/api/admin/rate-limits', {
        credentials: 'include',
      });
      const data = (await response.json()) as RateLimitResponse;
      if (!response.ok || !data.config) {
        throw new Error(data.error || 'Failed to load rate limit config');
      }
      setLimitConfig(data.config);
    } catch (error) {
      setLimitError(error instanceof Error ? error.message : 'Failed to load rate limit config');
    } finally {
      setLoadingLimits(false);
    }
  };

  useEffect(() => {
    if (initialized && user?.isAdmin) {
      void loadRateLimits();
    }
  }, [initialized, user?.isAdmin]);

  const handleUpload = async () => {
    setSubmitting(true);
    setResult(null);

    try {
      const parsed = JSON.parse(payload);
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed),
      });
      const data = (await response.json()) as UploadResult;
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Upload failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPayload(await file.text());
  };

  const handleLimitInputChange = (key: keyof RateLimitConfig, value: string) => {
    const parsed = Number(value);
    setLimitConfig((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleSaveLimits = async () => {
    setSavingLimits(true);
    setLimitMessage(null);
    setLimitError(null);
    try {
      const response = await fetch('/api/admin/rate-limits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(limitConfig),
      });
      const data = (await response.json()) as RateLimitResponse;
      if (!response.ok || !data.config) {
        throw new Error(data.error || 'Failed to save rate limit config');
      }
      setLimitConfig(data.config);
      setLimitMessage('Rate limit config saved and applied.');
    } catch (error) {
      setLimitError(error instanceof Error ? error.message : 'Failed to save rate limit config');
    } finally {
      setSavingLimits(false);
    }
  };

  if (!initialized) {
    return <div className="site-container py-20 text-slate-500">Loading admin page...</div>;
  }

  if (!user) {
    return (
      <div className="site-container py-10">
        <div className="glass-card rounded-3xl p-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <UserIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Please sign in as admin</h2>
          <p className="text-slate-500 mb-6">Sign in to bulk-import and update the ingredient knowledge base.</p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-semibold text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="site-container py-10">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-xl font-black text-red-700 mb-2">No admin permission</h2>
          <p className="text-red-600">This account cannot access knowledge base management. Please sign in with an admin-whitelisted email.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container py-8">
      <section className="glass-card rounded-3xl p-6 mb-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-20 w-52 h-52 rounded-full bg-teal-100/70 blur-3xl" />
        <h1 className="text-3xl font-black bg-gradient-to-r from-orange-700 via-orange-500 to-teal-500 bg-clip-text text-transparent">
          <span className="mr-2 inline-flex align-middle text-orange-700">
            <ShieldIcon className="h-7 w-7" />
          </span>
          Knowledge Base Admin
        </h1>
        <p className="text-slate-500 mt-2">
          Use <code className="rounded px-1.5 py-0.5 bg-orange-50 border border-orange-200">/api/knowledge/upload</code> to bulk-import ingredients.
        </p>
      </section>

      <section className="glass-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-slate-800">Import JSON</h2>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-200">
            <UploadIcon className="h-4 w-4" />
            Choose JSON file
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => void handleFileImport(event)}
            />
          </label>
        </div>

        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="w-full h-96 rounded-2xl border border-orange-200 bg-orange-50/40 p-4 font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => void handleUpload()}
            disabled={submitting}
            className="min-h-11 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Uploading...' : 'Submit import'}
          </button>
          <span className="text-xs text-slate-500">Validate JSON structure in a test environment first</span>
        </div>
      </section>

      <section className="glass-card rounded-3xl p-6 mt-6">
        <h2 className="text-lg font-black text-slate-800">Rate limit config</h2>
        <p className="mt-1 text-sm text-slate-500">Changes take effect immediately for analyze and password-reset endpoints.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Analyze: requests per IP per minute</span>
            <input
              type="number"
              min={1}
              value={limitConfig.analyzeIpPerMinute}
              onChange={(event) => handleLimitInputChange('analyzeIpPerMinute', event.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Analyze: requests per user per day</span>
            <input
              type="number"
              min={1}
              value={limitConfig.analyzeUserPerDay}
              onChange={(event) => handleLimitInputChange('analyzeUserPerDay', event.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Forgot password: requests per IP per minute</span>
            <input
              type="number"
              min={1}
              value={limitConfig.forgotPerIpPerMinute}
              onChange={(event) => handleLimitInputChange('forgotPerIpPerMinute', event.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Per-email reset cooldown (seconds)</span>
            <input
              type="number"
              min={30}
              value={limitConfig.forgotEmailCooldownSeconds}
              onChange={(event) => handleLimitInputChange('forgotEmailCooldownSeconds', event.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={() => void handleSaveLimits()}
            disabled={savingLimits || loadingLimits}
            className="min-h-11 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {savingLimits ? 'Saving...' : loadingLimits ? 'Loading...' : 'Save rate limit config'}
          </button>
          {limitMessage && <span className="text-sm text-emerald-600">{limitMessage}</span>}
          {limitError && <span className="text-sm text-red-600">{limitError}</span>}
        </div>
      </section>

      {result && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-900 text-slate-100 p-5">
          <h3 className="font-black mb-2">Response</h3>
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{prettyResult}</pre>
        </section>
      )}
    </div>
  );
}
