export interface PayPalLink {
  href: string;
  method?: string;
  rel: string;
}

export interface PayPalAmount {
  currency_code: string;
  value: string;
}

export interface PayPalCapture {
  id: string;
  status?: string;
  amount?: PayPalAmount;
  create_time?: string;
  update_time?: string;
}

export interface PayPalPurchaseUnit {
  amount?: PayPalAmount;
  custom_id?: string;
  description?: string;
  invoice_id?: string;
  payments?: {
    captures?: PayPalCapture[];
  };
}

export interface PayPalOrder {
  id: string;
  intent?: string;
  links?: PayPalLink[];
  purchase_units?: PayPalPurchaseUnit[];
  status: string;
}

export interface PayPalSubscriber {
  email_address?: string;
  payer_id?: string;
}

export interface PayPalSubscription {
  billing_info?: {
    last_payment?: {
      amount?: PayPalAmount;
      status?: string;
      time?: string;
    };
    next_billing_time?: string;
  };
  create_time?: string;
  custom_id?: string;
  id: string;
  links?: PayPalLink[];
  plan_id?: string;
  start_time?: string;
  status: string;
  subscriber?: PayPalSubscriber;
}

export interface PayPalProduct {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  create_time?: string;
}

export interface PayPalBillingPlan {
  id: string;
  product_id?: string;
  name?: string;
  description?: string;
  status?: string;
  create_time?: string;
}

export interface PayPalWebhookEvent<T = any> {
  event_type: string;
  id?: string;
  resource: T;
}

export interface PayPalWebhookVerificationPayload {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_event: unknown;
  webhook_id: string;
}

export interface PayPalCustomIdPayload {
  planId: string;
  userId: string;
}
