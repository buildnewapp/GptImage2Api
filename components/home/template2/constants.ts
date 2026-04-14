const titleBaseClass =
  "[font-family:var(--font-instrument-serif),serif] font-normal text-balance";

export const template2ThemeVarsClass =
  'bg-background text-foreground antialiased [color-scheme:light] [font-family:var(--font-space-grotesk),sans-serif] [font-feature-settings:"liga"_1,"kern"_1] [text-rendering:optimizeLegibility] [--background:216_32%_95%] [--foreground:223_28%_14%] [--card:0_0%_100%] [--card-foreground:223_28%_14%] [--popover:0_0%_100%] [--popover-foreground:223_28%_14%] [--primary:214_86%_56%] [--primary-foreground:214_40%_98%] [--secondary:221_35%_20%] [--secondary-foreground:214_40%_98%] [--muted:216_28%_89%] [--muted-foreground:219_18%_36%] [--accent:195_72%_46%] [--accent-foreground:214_40%_98%] [--destructive:2_72%_56%] [--destructive-foreground:214_40%_98%] [--border:216_22%_86%] [--input:216_24%_91%] [--ring:214_86%_56%] [--radius:1.35rem] dark:[color-scheme:dark] dark:[--background:223_33%_9%] dark:[--foreground:214_34%_96%] dark:[--card:223_26%_18%] dark:[--card-foreground:214_34%_96%] dark:[--popover:223_26%_18%] dark:[--popover-foreground:214_34%_96%] dark:[--primary:213_92%_64%] dark:[--primary-foreground:223_33%_10%] dark:[--secondary:217_56%_25%] dark:[--secondary-foreground:214_34%_96%] dark:[--muted:221_20%_22%] dark:[--muted-foreground:214_18%_78%] dark:[--accent:194_76%_55%] dark:[--accent-foreground:223_33%_10%] dark:[--destructive:0_70%_58%] dark:[--destructive-foreground:214_34%_96%] dark:[--border:220_16%_28%] dark:[--input:220_18%_25%] dark:[--ring:213_92%_64%]';

export const pageShellClass = `w-full ${template2ThemeVarsClass} bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.11),transparent_22%),radial-gradient(circle_at_84%_12%,hsl(var(--accent)/0.08),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,color-mix(in_srgb,hsl(var(--background))_88%,hsl(var(--secondary))_12%)_100%)] dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_24%),radial-gradient(circle_at_84%_12%,hsl(var(--accent)/0.14),transparent_24%),linear-gradient(180deg,hsl(var(--background))_0%,color-mix(in_srgb,hsl(var(--background))_82%,black_18%)_100%)]`;

export const brandWordmarkClass = `${titleBaseClass} text-[clamp(1.38rem,1.18rem+0.62vw,1.56rem)] leading-[1.08] tracking-[-0.01em] whitespace-nowrap text-white`;
export const featureTitleClass = `${titleBaseClass} text-[clamp(2rem,3.6vw,3.15rem)] leading-[1.06] tracking-[-0.014em]`;
export const sectionTitleClass = `${titleBaseClass} text-[clamp(2.65rem,5.2vw,4.2rem)] leading-[1.08] tracking-[-0.014em]`;
export const subsectionTitleClass = `${titleBaseClass} text-[clamp(2rem,3.4vw,3rem)] leading-[1.08] tracking-[-0.013em]`;
export const cardHeadingClass = `${titleBaseClass} text-[clamp(1.55rem,2vw,2rem)] leading-[1.08] tracking-[-0.012em]`;
export const faqQuestionTitleClass = `${titleBaseClass} text-[clamp(1.02rem,1.35vw,1.18rem)] leading-[1.16] tracking-[-0.008em]`;
export const displayTitleClass = `${titleBaseClass} text-[clamp(3rem,6vw,5.8rem)] leading-[0.99] tracking-[-0.02em]`;
export const sectionKickerClass =
  "inline-flex items-center gap-[0.65rem] rounded-full border border-border/78 bg-[color-mix(in_srgb,hsl(var(--card))_86%,hsl(var(--background))_14%)] px-4 py-[0.55rem] text-[0.72rem] font-bold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-[18px]";
export const moduleCardClass =
  "border border-slate-200/70 bg-white text-card-foreground shadow-[0_28px_72px_-48px_rgba(148,163,184,0.36)] backdrop-blur-md dark:border-white/10 dark:bg-[hsl(223_26%_18%)] dark:shadow-[0_28px_72px_-44px_rgba(2,8,23,0.62)] group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_28px_58px_-42px_rgba(148,163,184,0.28)] dark:hover:shadow-[0_28px_68px_-42px_rgba(2,8,23,0.72)]";
export const studioPanelClass = moduleCardClass;
export const scopeIconBadgeClass =
  "relative inline-flex items-center justify-center overflow-hidden h-14 w-14 rounded-[1.4rem] border border-slate-200/80 bg-slate-100/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_30px_-24px_rgba(148,163,184,0.34)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_28px_-24px_rgba(2,8,23,0.8)]";
export const pricingToggleShellClass =
  "inline-flex items-center rounded-full border border-slate-200/80 bg-white/70 p-1.5 shadow-[0_18px_38px_-26px_rgba(148,163,184,0.4)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_18px_38px_-28px_rgba(2,8,23,0.7)]";
export const pricingToggleIdleClass =
  "cursor-pointer rounded-full px-8 py-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-300 dark:hover:text-white";
export const pricingToggleActiveClass =
  "cursor-pointer rounded-full bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] px-8 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(15,23,42,0.45)] transition-all dark:bg-[linear-gradient(135deg,#274f90_0%,#3b82f6_100%)]";
export const pricingPopularBadgeClass =
  "rounded-full bg-[linear-gradient(135deg,#2f7df4_0%,#3b82f6_100%)] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(59,130,246,0.65)] dark:text-slate-950";
export const pricingStartedButtonClass =
  "inline-flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full h-12 px-7 text-sm font-semibold text-slate-900 ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:text-base bg-[linear-gradient(180deg,#dbe4f2_0%,#cfd9ea_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_30px_-24px_rgba(148,163,184,0.5)] hover:brightness-[0.99] dark:bg-[linear-gradient(180deg,#313a4d_0%,#2a3345_100%)] dark:text-white dark:shadow-[0_18px_32px_-24px_rgba(2,8,23,0.72)]";
export const pricingMaxButtonClass =
  "inline-flex w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full h-12 px-7 text-sm font-semibold text-white ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:text-base bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] shadow-[0_18px_32px_-24px_rgba(15,23,42,0.55)] hover:-translate-y-0.5 hover:brightness-110 dark:bg-[linear-gradient(135deg,#223a69_0%,#274b87_100%)]";
export const heroMeshClass =
  "bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.24),transparent_28%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.14),transparent_26%),linear-gradient(145deg,hsl(var(--secondary))_0%,color-mix(in_srgb,hsl(var(--secondary))_78%,black_22%)_100%)]";
