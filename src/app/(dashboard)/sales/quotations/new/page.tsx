import { redirect } from 'next/navigation';

export default async function QuotationNewPage(props: { searchParams?: Promise<{ leadId?: string }> }) {
  const searchParams = await props.searchParams;
  if (searchParams?.leadId) {
    redirect(`/quotations/create/${searchParams.leadId}`);
  }
  redirect('/sales/quotations/create');
}
