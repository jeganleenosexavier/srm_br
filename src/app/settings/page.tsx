'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role))
      .catch(() => {});
  }, []);

  const handleSeed = async () => {
    setShowConfirm(false);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: `Seed data loaded: ${data.counts.people} people, ${data.counts.skills} skills, ${data.counts.projects} projects, ${data.counts.countries} countries.`,
        });
      } else {
        setResult({ success: false, message: data.error || 'Failed to load seed data' });
      }
    } catch {
      setResult({ success: false, message: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Demo Data</h3>
        <p className="text-sm text-gray-500 mb-4">
          Load seed data to populate the system with 22 demo profiles across 5 countries,
          including skills, compliance items, reviews, and stage histories.
        </p>

        {isAdmin ? (
          <>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#2c5282] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Load Seed Data'}
            </button>

            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Confirm Reset</h4>
                  <p className="text-sm text-gray-600 mb-5">
                    This will delete all existing data and load fresh demo profiles. Continue?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSeed}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reset & Load
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2.5 rounded-lg">
            Only admins can load seed data.
          </p>
        )}

        {result && (
          <div
            className={`mt-4 px-4 py-3 rounded-lg text-sm ${
              result.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
