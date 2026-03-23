import type { Metadata } from "next";
import { ProviderProfileClient } from "./provider-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Provider Profile | Jobsy`,
    description: `View the profile, services, portfolio, and reviews of this service provider on Jobsy.`,
    openGraph: {
      title: "Provider Profile | Jobsy",
      url: `https://jobsyja.com/provider/${id}`,
    },
  };
}

export default async function ProviderPage({ params }: Props) {
  const { id } = await params;
  return <ProviderProfileClient providerId={id} />;
}
