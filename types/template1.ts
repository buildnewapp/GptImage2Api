
export type ButtonType = "button" | "link";

export type ButtonVariant =
    | "secondary"
    | "link"
    | "default"
    | "destructive"
    | "outline"
    | "ghost"
    | null
    | undefined;

export type ButtonSize = "sm" | "md" | "lg";

export interface Button {
    title?: string;
    icon?: string;
    url?: string;
    target?: string;
    type?: ButtonType;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
}

export interface Image {
    src?: string;
    alt?: string;
    className?: string;
}

export interface Brand {
    title?: string;
    description?: string;
    logo?: Image;
    url?: string;
    target?: string;
}

export interface NavItem {
    name?: string;
    title?: string;
    description?: string;
    icon?: string;
    image?: Image;
    url?: string;
    target?: string;
    is_active?: boolean;
    is_expand?: boolean;
    className?: string;
    children?: NavItem[];
    onClick?: () => void;
}

export interface Nav {
    name?: string;
    title?: string;
    icon?: string;
    image?: Image;
    className?: string;
    items?: NavItem[];
}

export interface Crumb {
    items?: NavItem[];
}

export interface Toolbar {
    items?: Button[];
}

export interface Tip {
    title?: string;
    description?: string;
    icon?: string;
    type?: "info" | "warning" | "error";
}

export interface SocialItem {
    title: string;
    icon?: string;
    url?: string;
    target?: string;
}

export interface Social {
    items?: SocialItem[];
}

export interface AgreementItem {
    title?: string;
    url?: string;
    target?: string;
}

export interface Agreement {
    items?: AgreementItem[];
}

export interface Account {
    items?: NavItem[];
}

export interface Library {
    title?: string;
    items?: LibraryItem[];
    more?: NavItem;
}

export interface LibraryItem extends NavItem {
    actions?: NavItem[];
}

export interface DataCard {
    title?: string;
    label?: string;
    value?: string;
    description?: string;
    tip?: string;
    icon?: string;
}
export interface Announcement {
    title?: string;
    description?: string;
    label?: string;
    url?: string;
    target?: string;
}

export interface Hero {
    name?: string;
    disabled?: boolean;
    announcement?: Announcement;
    title?: string;
    highlight_text?: string;
    description?: string;
    buttons?: Button[];
    image?: Image;
    tip?: string;
    notice?: string;
    show_happy_users?: boolean;
    show_badge?: boolean;
}

export interface SectionItem {
    title?: string;
    description?: string;
    label?: string;
    icon?: string;
    image?: Image;
    buttons?: Button[];
    url?: string;
    target?: string;
    children?: SectionItem[];
}

export interface Section {
    disabled?: boolean;
    name?: string;
    title?: string;
    description?: string;
    label?: string;
    icon?: string;
    image?: Image;
    buttons?: Button[];
    items?: SectionItem[];
}

export interface LandingPage {
    hero?: Hero;
    branding?: Section;
    introduce?: Section;
    benefit?: Section;
    usage?: Section;
    feature?: Section;
    showcase?: Section;
    stats?: Section;
    testimonial?: Section;
    faq?: Section;
    cta?: Section;
}

