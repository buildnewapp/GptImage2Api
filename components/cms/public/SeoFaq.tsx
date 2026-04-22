import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SeoFaqProps {
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export function SeoFaq({ items }: SeoFaqProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <p className="text-sm text-muted-foreground">
          Short answers for the questions users usually ask before trying this workflow.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full rounded-xl border px-6">
        {items.map((item, index) => (
          <AccordionItem key={`${item.question}-${index}`} value={`faq-${index}`}>
            <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
            <AccordionContent className="text-sm leading-7 text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
