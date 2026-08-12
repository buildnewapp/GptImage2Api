export interface HeaderLink {
  id?: string;
  name: string;
  href: string;
  target?: string;
  rel?: string;
  items?: HeaderLink[];
  groups?: HeaderLinkGroup[];
  icon?: string;
  description?: string;
}

export interface HeaderLinkGroup {
  title: string;
  items: HeaderLink[];
}

export interface FooterLink {
  title: string;
  links: Link[];
}

interface Link {
  id?: string;
  href: string;
  name: string;
  target?: string;
  rel?: string;
  useA?: boolean;
}
