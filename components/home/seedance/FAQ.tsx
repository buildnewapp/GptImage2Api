
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

const FAQ = () => {
  const t = useTranslations("Landing.FAQ");
  const faqs = (t.raw("items") as any[]) || [];

  return (
    <section className="bg-black py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            <span className="text-white">{t("titlePrefix")}</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">{t("titleSuffix")}</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-gray-800 rounded-xl px-4 data-[state=open]:bg-gray-900/50 transition-colors">
                <AccordionTrigger className="text-white text-left hover:no-underline hover:text-blue-400 transition-colors py-4 text-lg font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 text-base leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
