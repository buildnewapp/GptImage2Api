import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

export default function Seedance15FAQ() {
  const t = useTranslations("Seedance15.FAQ");
  const faqs = (t.raw("items") as { question: string; answer: string }[]) || [];

  return (
    <section className="relative overflow-hidden py-16 text-slate-900 dark:text-white lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="animate-in fade-in slide-in-from-bottom-6 text-3xl font-bold text-slate-900 [text-shadow:0_0_20px_rgba(34,211,238,0.3)] duration-700 dark:text-white md:text-4xl">
            {t("title")}
          </h2>
          <p className="animate-in fade-in slide-in-from-bottom-8 mt-4 text-slate-600 duration-700 dark:text-slate-300">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`seedance15-faq-${index}`}
                className="animate-in fade-in slide-in-from-bottom-10 rounded-xl border border-cyan-300/40 bg-slate-900/82 px-4 backdrop-blur-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_0_18px_rgba(34,211,238,0.14)] duration-700 hover:border-cyan-300/75 hover:shadow-[0_0_36px_rgba(34,211,238,0.45)]"
                style={{ animationDelay: `${index * 100 + 120}ms` }}
              >
                <AccordionTrigger className="text-left text-base font-medium text-white hover:no-underline hover:text-cyan-300">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-slate-300">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
