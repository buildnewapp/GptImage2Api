import { Locale } from "@/i18n/routing";
import { parseClientAuthParams } from "@/lib/auth/client-auth-request";
import { constructMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ClientAuthSigninPage from "./ClientAuthSigninPage";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{
  client_id?: string;
  redirect_uri?: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ClientAuth" });

  return constructMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: "/client-auth/signin",
    noIndex: true,
  });
}

export default async function Page(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;

  let clientId: string | null = null;
  let redirectUri: string | null = null;
  let initialError: string | null = null;

  try {
    const parsed = parseClientAuthParams(
      new URLSearchParams({
        client_id: searchParams.client_id ?? "",
        ...(searchParams.redirect_uri
          ? { redirect_uri: searchParams.redirect_uri }
          : {}),
      }),
    );
    clientId = parsed.clientId;
    redirectUri = parsed.redirectUri;
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "Invalid client auth request";
  }

  return (
    <ClientAuthSigninPage
      clientId={clientId}
      redirectUri={redirectUri}
      initialError={initialError}
    />
  );
}
