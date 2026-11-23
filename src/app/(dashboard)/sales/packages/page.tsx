import { getPackagesAction } from '@/actions/package.actions';
import { getPromotionalOffersAction } from '@/actions/offer.actions';
import { PackagesClient } from '@/app/(dashboard)/packages/packages-client';

export const dynamic = 'force-dynamic';

export default async function SalesPackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; categoryId?: string }>;
}) {
  const resolvedParams = await searchParams;

  const [packagesRes, offersRes] = await Promise.all([
    getPackagesAction({
      search: resolvedParams?.search,
      categoryId: resolvedParams?.categoryId,
    }),
    getPromotionalOffersAction(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PackagesClient
        initialPackages={packagesRes?.packages || []}
        initialOffers={offersRes?.data || []}
        totalPackages={packagesRes?.total || 0}
      />
    </div>
  );
}
