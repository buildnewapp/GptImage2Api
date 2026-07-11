// import Footer from "@/components/footer/Footer";
// import Header from "@/components/header/Header";
import Header from "@/components/home/video/Header";
import Footer from "@/components/home/video/Footer";
import MobileTabBar from "@/components/home/video/MobileTabBar";

export default async function BasicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col items-center pt-20">{children}</main>
      <Footer locale={locale} />
      <MobileTabBar />
    </>
  );
}
