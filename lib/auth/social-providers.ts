type AuthEnvironment = Record<string, string | undefined>;

type SocialProviderConfig = {
  clientId: string;
  clientSecret: string;
};

type SocialProviders = {
  github?: SocialProviderConfig;
  google?: SocialProviderConfig;
};

export function resolveSocialProviders(env: AuthEnvironment): SocialProviders {
  const providers: SocialProviders = {};

  if (env.NEXT_PUBLIC_GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  if (env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  return providers;
}
