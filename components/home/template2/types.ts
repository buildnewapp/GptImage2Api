export interface HomeTemplate2ShowcaseVideo {
  category: string;
  duration: string;
  prompt: string;
  resolution: string;
  src: string;
  title: string;
}

export interface HomeTemplate2Navigation {
  brand: string;
  createVideo: string;
  credits: string;
  darkModeLabel: string;
  home: string;
  language: string;
  mobileMenuLabel: string;
  resources: string;
}

export interface HomeTemplate2Hero {
  badge: string;
  ctaLabel: string;
  creditCost: string;
  description: string;
  durationLabel: string;
  highlight: string;
  modelLabel: string;
  placeholder: string;
  resolutionLabel: string;
  title: string;
  videos: string[];
}

export interface HomeTemplate2FeatureRow {
  description: string;
  reverse?: boolean;
  title: string;
  videoSrc: string;
}

export interface HomeTemplate2ScopeItem {
  accent: string;
  description: string;
  icon: string;
  title: string;
}

export interface HomeTemplate2Scope {
  description: string;
  footerDescription: string;
  footerStat: string;
  footerTitle: string;
  logos: string[];
  logosLabel: string;
  title: string;
  items: HomeTemplate2ScopeItem[];
}

export interface HomeTemplate2UseCaseItem {
  accent: string;
  description: string;
  icon: string;
  title: string;
}

export interface HomeTemplate2UseCases {
  description: string;
  title: string;
  items: HomeTemplate2UseCaseItem[];
}

export interface HomeTemplate2ShowcaseSection {
  ctaText: string;
  description: string;
  kicker: string;
  note: string;
  title: string;
  videos: HomeTemplate2ShowcaseVideo[];
}

export interface HomeTemplate2TestimonialItem {
  accent: string;
  initials: string;
  name: string;
  quote: string;
  role: string;
}

export interface HomeTemplate2Testimonials {
  description: string;
  items: HomeTemplate2TestimonialItem[];
  title: string;
}

export interface HomeTemplate2PricingFeature {
  highlight?: boolean;
  text: string;
}

export interface HomeTemplate2CheckoutPlan {
  buttonLink?: string | null;
  creemDiscountCode?: string | null;
  creemProductId?: string | null;
  enableManualInputCoupon?: boolean;
  isHighlighted?: boolean;
  provider?: string | null;
  stripeCouponId?: string | null;
  stripePriceId?: string | null;
}

export interface HomeTemplate2PricingPlan {
  accent: string;
  approx?: string;
  billed?: string;
  checkoutPlan?: HomeTemplate2CheckoutPlan;
  credits?: string;
  cta: string;
  description?: string;
  featured?: boolean;
  features: HomeTemplate2PricingFeature[];
  highlightText?: string;
  icon: string;
  name: string;
  price: string;
  originalPrice?: string;
  priceSuffix?: string;
}

export interface HomeTemplate2CreditPack {
  checkoutPlan?: HomeTemplate2CheckoutPlan;
  cta: string;
  description?: string;
  highlightText?: string;
  price: string;
  title: string;
}

export interface HomeTemplate2ComparisonRow {
  feature: string;
  other: string;
  seedance: string;
}

export interface HomeTemplate2Pricing {
  comparisonTitle: string;
  comparisonRows: HomeTemplate2ComparisonRow[];
  creditPacks: HomeTemplate2CreditPack[];
  creditPacksDescription: string;
  creditPacksTitle: string;
  description: string;
  monthlyPlans?: HomeTemplate2PricingPlan[];
  monthlyLabel: string;
  plans: HomeTemplate2PricingPlan[];
  saveLabel: string;
  title: string;
  yearlyPlans?: HomeTemplate2PricingPlan[];
  yearlyLabel: string;
}

export interface HomeTemplate2FaqItem {
  answer: string;
  question: string;
}

export interface HomeTemplate2Faq {
  description: string;
  items: HomeTemplate2FaqItem[];
  title: string;
}

export interface HomeTemplate2CtaStat {
  label: string;
  value: string;
}

export interface HomeTemplate2Cta {
  description: string;
  kicker: string;
  primaryLabel: string;
  secondaryLabel: string;
  stats: HomeTemplate2CtaStat[];
  title: string;
}

export interface HomeTemplate2Page {
  cta: HomeTemplate2Cta;
  faq: HomeTemplate2Faq;
  featureRows: HomeTemplate2FeatureRow[];
  hero: HomeTemplate2Hero;
  navigation: HomeTemplate2Navigation;
  pricing: HomeTemplate2Pricing;
  scope: HomeTemplate2Scope;
  showcase: HomeTemplate2ShowcaseSection;
  testimonials: HomeTemplate2Testimonials;
  useCases: HomeTemplate2UseCases;
}
