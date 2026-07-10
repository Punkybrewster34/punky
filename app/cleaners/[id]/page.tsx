'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { Avatar, Badge, Button, Card, Spinner, Stars, VerifiedBadge } from '@/components/ui';
import { serviceLabel } from '@/lib/marketplace/constants';
import { getJSON } from '@/lib/marketplace/client';
import type { PublicProvider } from '@/lib/marketplace/db';
import type { Review } from '@/lib/marketplace/types';

export default function CleanerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    getJSON<{ provider: PublicProvider; reviews: Review[]; error?: string }>(`/api/providers/${id}`)
      .then((d) => {
        if (d.error || !d.provider) {
          setNotFound(true);
        } else {
          setProvider(d.provider);
          setReviews(d.reviews ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <Spinner />
      </div>
    );
  }

  if (notFound || !provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <Card className="mx-auto mt-16 max-w-md p-10 text-center">
          <p className="text-lg font-medium text-gray-700">This cleaner isn't available.</p>
          <div className="mt-4">
            <Button href="/cleaners">Back to search</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a href="/cleaners" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to cleaners
        </a>

        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Gallery */}
            {provider.photos.length > 0 && (
              <Card className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={provider.photos[activePhoto]} alt="" className="h-72 w-full object-cover" />
                {provider.photos.length > 1 && (
                  <div className="flex gap-2 p-3">
                    {provider.photos.map((ph, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={ph}
                        alt=""
                        onClick={() => setActivePhoto(i)}
                        className={`h-16 w-20 cursor-pointer rounded-lg object-cover ${i === activePhoto ? 'ring-2 ring-teal-500' : 'opacity-70'}`}
                      />
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Header */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <Avatar src={provider.avatarUrl} name={provider.name} size={72} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
                    {provider.isTeam && <Badge color="blue">Team of {provider.teamSize}</Badge>}
                  </div>
                  <p className="text-gray-600">{provider.headline}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Stars rating={provider.rating} />
                    <span className="text-sm text-gray-600">
                      {provider.rating > 0 ? `${provider.rating} · ${provider.reviewCount} reviews` : 'No reviews yet'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <VerifiedBadge />
                {provider.insured && <Badge color="teal">Insured</Badge>}
                {provider.suppliesIncluded && <Badge color="gray">Brings supplies</Badge>}
                <Badge color="gray">{provider.yearsExperience} yrs experience</Badge>
                {provider.distanceMiles != null && <Badge color="gray">{provider.distanceMiles} mi away</Badge>}
              </div>
              <p className="mt-5 whitespace-pre-line text-gray-700">{provider.bio}</p>
            </Card>

            {/* Services */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Services offered</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {provider.services.map((s) => (
                  <Badge key={s} color="teal">
                    {serviceLabel(s)}
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Reviews */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Reviews {provider.reviewCount > 0 && <span className="text-gray-400">({provider.reviewCount})</span>}
              </h2>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No reviews yet — be the first to book and review.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {reviews.map((r) => (
                    <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <Stars rating={r.rating} />
                      <p className="mt-1 text-gray-700">{r.comment}</p>
                      <p className="mt-1 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="sticky top-20 p-6">
              <div className="text-3xl font-bold text-gray-900">
                ${provider.hourlyRate}
                <span className="text-base font-normal text-gray-500">/hr</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {provider.acceptingJobs ? 'Available for new jobs' : 'Not accepting jobs right now'}
              </p>
              <div className="mt-4">
                <Button href={`/book/${provider.id}`} full disabled={!provider.acceptingJobs}>
                  {provider.acceptingJobs ? 'Book this cleaner' : 'Currently unavailable'}
                </Button>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">✓ Background-checked &amp; verified</li>
                <li className="flex items-center gap-2">✓ You only pay once they accept</li>
                <li className="flex items-center gap-2">✓ Free to request, no obligation</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
