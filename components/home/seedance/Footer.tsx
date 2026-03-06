

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";

const Footer = () => {
  const t = useTranslations("Navigation");
  const tFooter = useTranslations("Footer");

  return (
    <footer className="bg-white dark:bg-black py-12 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image src="/logo.png" alt="Logo" width={32} height={32} />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Seedance 2</span>
            </Link>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              {t("footerAbout")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t("product")}</h4>
            <ul className="space-y-2">
              <li><Link href="/seedance2" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("generate")}</Link></li>
              <li><Link href="/pricing" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("pricing")}</Link></li>
              <li><Link href="/showcase" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("showcase")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t("resources")}</h4>
            <ul className="space-y-2">
              <li><Link href="/blog" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("blog")}</Link></li>
              <li><Link href="/prompts" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("docs")}</Link></li>
              <li><Link href="/help" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("help")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t("legal")}</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("privacy")}</Link></li>
              <li><Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">{t("terms")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tFooter.rich("Copyright", { year: new Date().getFullYear(), name: "Seedance AI" })}
          </p>
          <div className="flex gap-4">
            {/* Social Icons Mock */}
            <div className="w-5 h-5 bg-gray-400 rounded-full opacity-50"></div>
            <div className="w-5 h-5 bg-gray-400 rounded-full opacity-50"></div>
            <div className="w-5 h-5 bg-gray-400 rounded-full opacity-50"></div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer;
