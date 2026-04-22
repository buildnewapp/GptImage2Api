export interface VideoTemplateShowcaseItem {
  category: string;
  duration?: string;
  prompt?: string;
  resolution?: string;
  src: string;
  title: string;
}

export interface VideoTemplateNavigation {
  brand: string;
  createVideo: string;
  credits: string;
  darkModeLabel: string;
  home: string;
  language: string;
  mobileMenuLabel: string;
  resources: string;
}

export interface VideoTemplateHero {
  badge: string;
  ctaLabel: string;
  creditCost: string;
  description: string;
  durationLabel: string;
  highlight: string;
  images?: string[];
  modelLabel: string;
  placeholder: string;
  resolutionLabel: string;
  title: string;
  videos: string[];
}

export interface VideoTemplateFeatureRow {
  description: string;
  imageSrc?: string;
  reverse?: boolean;
  title: string;
  videoSrc?: string;
}

export interface VideoTemplateScopeItem {
  accent: string;
  description: string;
  icon: string;
  title: string;
}

export interface VideoTemplateScope {
  description: string;
  footerDescription: string;
  footerStat: string;
  footerTitle: string;
  logos: string[];
  logosLabel: string;
  title: string;
  items: VideoTemplateScopeItem[];
}

export interface VideoTemplateUseCaseItem {
  accent: string;
  description: string;
  icon: string;
  title: string;
}

export interface VideoTemplateUseCases {
  description: string;
  title: string;
  items: VideoTemplateUseCaseItem[];
}

export interface VideoTemplateShowcaseSection {
  ctaText: string;
  description: string;
  items: VideoTemplateShowcaseItem[];
  kicker: string;
  note: string;
  title: string;
}

export interface VideoTemplateTestimonialItem {
  accent: string;
  initials: string;
  name: string;
  quote: string;
  role: string;
}

export interface VideoTemplateTestimonials {
  description: string;
  items: VideoTemplateTestimonialItem[];
  title: string;
}

export interface VideoTemplatePricingFeature {
  highlight?: boolean;
  text: string;
}

export interface VideoTemplateCheckoutPlan {
  buttonLink?: string | null;
  creemDiscountCode?: string | null;
  creemProductId?: string | null;
  enableManualInputCoupon?: boolean;
  isHighlighted?: boolean;
  planId?: string | null;
  provider?: string | null;
  stripeCouponId?: string | null;
  stripePriceId?: string | null;
}

export interface VideoTemplatePricingPlan {
  accent: string;
  approx?: string;
  billed?: string;
  checkoutPlan?: VideoTemplateCheckoutPlan;
  credits?: string;
  cta: string;
  description?: string;
  featured?: boolean;
  features: VideoTemplatePricingFeature[];
  highlightText?: string;
  icon: string;
  name: string;
  price: string;
  originalPrice?: string;
  priceSuffix?: string;
}

export interface VideoTemplateCreditPack {
  checkoutPlan?: VideoTemplateCheckoutPlan;
  cta: string;
  description?: string;
  highlightText?: string;
  price: string;
  title: string;
}

export interface VideoTemplateComparisonRow {
  feature: string;
  other: string;
  seedance: string;
}

export interface VideoTemplatePricing {
  comparisonTitle: string;
  comparisonRows: VideoTemplateComparisonRow[];
  creditPacks: VideoTemplateCreditPack[];
  creditPacksDescription: string;
  cryptoPaymentLinkLabel?: string;
  cryptoPaymentText?: string;
  creditPacksTitle: string;
  description: string;
  monthlyPlans?: VideoTemplatePricingPlan[];
  monthlyLabel: string;
  plans: VideoTemplatePricingPlan[];
  saveLabel: string;
  title: string;
  yearlyPlans?: VideoTemplatePricingPlan[];
  yearlyLabel: string;
}

export interface VideoTemplateFaqItem {
  answer: string;
  question: string;
}

export interface VideoTemplateFaq {
  description: string;
  items: VideoTemplateFaqItem[];
  title: string;
}

export interface VideoTemplateCtaStat {
  label: string;
  value: string;
}

export interface VideoTemplateCta {
  description: string;
  kicker: string;
  primaryLabel: string;
  secondaryLabel: string;
  stats: VideoTemplateCtaStat[];
  title: string;
}

export interface VideoTemplatePage {
  cta: VideoTemplateCta;
  faq: VideoTemplateFaq;
  featureRows: VideoTemplateFeatureRow[];
  hero: VideoTemplateHero;
  navigation: VideoTemplateNavigation;
  pricing: VideoTemplatePricing;
  scope: VideoTemplateScope;
  showcase: VideoTemplateShowcaseSection;
  testimonials: VideoTemplateTestimonials;
  useCases: VideoTemplateUseCases;
}
