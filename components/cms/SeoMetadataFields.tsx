"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type SeoEditorPostType } from "@/lib/seo/content-schema";
import { UseFormReturn } from "react-hook-form";

interface SeoMetadataFieldsProps {
  form: UseFormReturn<any>;
  postType: SeoEditorPostType;
  isSubmitting: boolean;
}

export function SeoMetadataFields({
  form,
  postType,
  isSubmitting,
}: SeoMetadataFieldsProps) {
  return (
    <div className="space-y-6 rounded-lg border p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">SEO Content Fields</h2>
        <p className="text-sm text-muted-foreground">
          Keep these fields curated. Each line becomes one structured item.
        </p>
      </div>

      {postType === "template" ? (
        <>
          <FormField
            control={form.control}
            name="seoPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Write the prompt users can copy or adapt"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoVariablesText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prompt Variables</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder={"One per line. Use `key | label | description`."}
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Example: `product_name | Product name | Mentioned in the opener`
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoExampleInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Example Input</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="A sample value set for the prompt"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoExampleOutput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Example Output</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Show what a good result looks like"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoTipsText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tips</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="One tip per line"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ) : (
        <>
          <FormField
            control={form.control}
            name="seoHeroSubtitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hero Subtitle</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Summarize the page promise"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoTargetAudience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Audience</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Solo founders, marketers, creators..."
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoProblemSummary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Problem Summary</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Describe the pain point this use case solves"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoBenefitsText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Benefits</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder={"One per line. Use `Title | Description` when needed."}
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Example: `Faster output | Start from a proven page structure`
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seoStepsText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workflow Steps</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder={"One per line. Use `Title | Description` when needed."}
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <FormField
        control={form.control}
        name="seoFaqsText"
        render={({ field }) => (
          <FormItem>
            <FormLabel>FAQ</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder={"One per line. Use `Question | Answer`."}
                {...field}
                value={field.value ?? ""}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="seoCtaLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CTA Label</FormLabel>
              <FormControl>
                <Input
                  placeholder="Try it free"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seoCtaHref"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CTA Href</FormLabel>
              <FormControl>
                <Input
                  placeholder="/pricing"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
