import Footer from "@/components/footer/Footer";
// import Header from "@/components/header/Header";
import Header from "@/components/home/template2/Header";

export default function BasicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col items-center pt-20">{children}</main>
      <Footer />
    </>
  );
}
