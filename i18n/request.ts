import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const common = (await import(`./messages/${locale}/common.json`)).default;

  return {
    locale,
    messages: {
      // common
      ...common,

      Landing: (await import(`./messages/${locale}/Landing.json`)).default,
      Seedance15: (await import(`./messages/${locale}/Seedance15.json`)).default,
      Pricing: (await import(`./messages/${locale}/Pricing.json`)).default,
      NotFound: (await import(`./messages/${locale}/NotFound.json`)).default,
      Glossary: (await import(`./messages/${locale}/Glossary.json`)).default,
      Prompts: (await import(`./messages/${locale}/Prompts.json`)).default,
      Showcase: (await import(`./messages/${locale}/Showcase.json`)).default,
      SeoContent: (await import(`./messages/${locale}/SeoContent.json`)).default,
      HomeTemplate1: (await import(`./messages/${locale}/HomeTemplate1.json`)).default,
      VideoTemplate: (await import(`./messages/${locale}/VideoTemplate.json`)).default,
      ImageTemplate: (await import(`./messages/${locale}/ImageTemplate.json`)).default,
      ApiDoc: (await import(`./messages/${locale}/ApiDoc.json`)).default,

      // Dashboard - User
      Settings: (
        await import(`./messages/${locale}/Dashboard/User/Settings.json`)
      ).default,
      CreditHistory: (
        await import(`./messages/${locale}/Dashboard/User/CreditHistory.json`)
      ).default,
      ApiKeys: (
        await import(`./messages/${locale}/Dashboard/User/ApiKeys.json`)
      ).default,
      DashboardUserReferrals: (
        await import(`./messages/${locale}/Dashboard/User/Referrals.json`)
      ).default,
      DashboardUserTasks: (
        await import(`./messages/${locale}/Dashboard/User/Tasks.json`)
      ).default,
      VideoGeneration: (
        await import(`./messages/${locale}/Dashboard/User/VideoGeneration.json`)
      ).default,

      // Dashboard - Admin
      Overview: (
        await import(`./messages/${locale}/Dashboard/Admin/Overview.json`)
      ).default,
      Users: (await import(`./messages/${locale}/Dashboard/Admin/Users.json`))
        .default,
      AdminApiKeys: (
        await import(`./messages/${locale}/Dashboard/Admin/ApiKeys.json`)
      ).default,
      DashboardBlogs: (
        await import(`./messages/${locale}/Dashboard/Admin/Blogs.json`)
      ).default,
      DashboardGlossary: (
        await import(`./messages/${locale}/Dashboard/Admin/Glossary.json`)
      ).default,
      Orders: (await import(`./messages/${locale}/Dashboard/Admin/Orders.json`))
        .default,
      AdminReferrals: (
        await import(`./messages/${locale}/Dashboard/Admin/Referrals.json`)
      ).default,
      R2Files: (
        await import(`./messages/${locale}/Dashboard/Admin/R2Files.json`)
      ).default,
      Prices: (await import(`./messages/${locale}/Dashboard/Admin/Prices.json`))
        .default,
      SystemEmails: (
        await import(`./messages/${locale}/Dashboard/Admin/SystemEmails.json`)
      ).default,
      AdminVideoGenerations: (
        await import(`./messages/${locale}/Dashboard/Admin/VideoGenerations.json`)
      ).default,
    },
  };
});
