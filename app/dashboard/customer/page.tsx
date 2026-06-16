'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { Avatar, Badge, Button, Card, Spinner, Stars } from '@/components/ui';
import { serviceLabel, taskLabel, addOnDef } from '@/lib/marketplace/constants';
import { api, fetchMe, getJSON } from '@/lib/marketplace/client';
import type { Job, JobStatus } from '@/lib/marketplace/types';

type CustomerJob = Job & { providerName: string; providerAvatar: string; reviewed: boolean };

const STATUS_META: Record<JobStatus, { label: string; color: any }> = {
  requested: { label: 'Awaiting cleaner', color: 'amber' },
  accepted: { label: 'Confirmed', color: 'green' },
  in_progress: { label: 'In progress', color: 'blue' },
  completed: { label: 'Completed', color: 'teal' },
  declined: { label: 'Declined', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
};

export default function CustomerDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<CustomerJob | null>(null);

  async function load() {
    const me = await fetchMe();
    if (!me.user) {
      router.push('/login?next=/dashboard/customer');
      return;
    }
    if (me.user.role !== 'customer') {
      router.push('/dashboard/provider');
      return;
    }
    const d = await getJSON<{ jobs: CustomerJob[] }>('/api/jobs');
    setJobs(d.jobs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(job: CustomerJob) {
    if (!confirm('Cancel this booking?')) return;
    const { ok, data } = await api(`/api/jobs/${job.id}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel' }),
    });
    if (!ok) alert(data?.error ?? 'Could not cancel');
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My bookings</h1>
          <Button href="/cleaners">Book a cleaning</Button>
        </div>

        {jobs.length === 0 ? (
          <Card className="mt-6 p-10 text-center">
            <p className="text-lg font-medium text-gray-700">No bookings yet.</p>
            <p className="mt-1 text-sm text-gray-500">Find a trusted cleaner near you and request your first clean.</p>
            <div className="mt-4">
              <Button href="/cleaners">Browse cleaners</Button>
            </div>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {jobs.map((job) => {
              const meta = STATUS_META[job.status];
              const canCancel = job.status === 'requested' || job.status === 'accepted';
              const canReview = job.status === 'completed' && !job.reviewed;
              return (
                <Card key={job.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={job.providerAvatar} name={job.providerName} size={48} />
                      <div>
                        <p className="font-semibold text-gray-900">{job.providerName}</p>
                        <p className="text-sm text-gray-500">
                          {serviceLabel(job.serviceType)} · {new Date(job.scheduledDate).toLocaleDateString()} ({job.scheduledWindow})
                        </p>
                      </div>
                    </div>
                    <Badge color={meta.color}>{meta.label}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                    <div>
                      <span className="text-gray-400">Address</span>
                      <p>{job.address}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Property</span>
                      <p>
                        {job.bedrooms} bd · {job.bathrooms} ba {job.squareFeet ? `· ${job.squareFeet} sqft` : ''}
                      </p>
                    </div>
                  </div>

                  {job.tasks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.tasks.map((t) => (
                        <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {taskLabel(t)}
                        </span>
                      ))}
                      {job.addOns.map((a) => (
                        <span key={a} className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                          + {addOnDef(a)?.label ?? a}
                        </span>
                      ))}
                    </div>
                  )}

                  {job.status === 'declined' && job.declineReason && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      Reason: {job.declineReason}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-lg font-bold text-gray-900">${job.estimatedPrice.toFixed(2)}</span>
                    <div className="flex gap-2">
                      {canCancel && (
                        <Button variant="danger" onClick={() => cancel(job)}>
                          Cancel
                        </Button>
                      )}
                      {canReview && <Button onClick={() => setReviewing(job)}>Leave a review</Button>}
                      {job.reviewed && <Badge color="green">★ Reviewed</Badge>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          job={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({ job, onClose, onDone }: { job: CustomerJob; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError('');
    const { ok, data } = await api('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ jobId: job.id, rating, comment }),
    });
    setSaving(false);
    if (!ok) {
      setError(data?.error ?? 'Could not submit review');
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6" >
        <div onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-gray-900">Review {job.providerName}</h2>
          <div className="mt-4 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="text-3xl">
                <span className={n <= rating ? 'text-amber-400' : 'text-gray-300'}>★</span>
              </button>
            ))}
          </div>
          <textarea
            className="input mt-4"
            rows={4}
            placeholder="How was your clean?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit review'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
