import { Plus } from "lucide-react";

import {
  faqQuestionTitleClass,
  moduleCardClass,
  sectionTitleClass,
} from "@/components/home/template2/constants";
import type { HomeTemplate2Faq } from "@/components/home/template2/types";

interface FAQProps {
  section: HomeTemplate2Faq;
}

export default function FAQ({ section }: FAQProps) {
  return (
    <section className="py-24">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-16 text-center">
          <h2 data-aos="fade-up" className={`${sectionTitleClass} mx-auto mb-4 max-w-5xl`}>
            {section.title}
          </h2>
          <p data-aos="fade-up" className="text-xl text-muted-foreground">{section.description}</p>
        </div>
        <div className="space-y-4">
          {section.items.map((faq) => (
            <details
              key={faq.question}
              data-aos="fade-up"
              className={`${moduleCardClass} rounded-[calc(var(--radius)+0.45rem)]`}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 focus:outline-none">
                <h3 className={`${faqQuestionTitleClass} pr-2`}>{faq.question}</h3>
                <div className="flex-shrink-0 pt-0.5">
                  <Plus className="h-5 w-5 text-primary transition-transform duration-200 group-open:rotate-45" />
                </div>
              </summary>
              <div className="px-6 pb-6">
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
