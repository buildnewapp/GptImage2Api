export type SubotizMetadata = Record<string, string>;

export type SubotizApiResponse<T> = {
  code: string;
  message: string;
  data: T;
};

export type SubotizCheckoutSessionCreateParams = {
  order_id: string;
  line_items: Array<{
    price_id: string;
    quantity: string;
  }>;
  email: string;
  payer_id: string;
  return_url: string;
  cancel_url: string;
  locale?: string;
  mode: "checkout";
  integration_method: "hosted";
  payment_mode: "onetime_payment" | "subscription";
  metadata: SubotizMetadata;
  subscription_data?: {
    metadata: SubotizMetadata;
  };
};

export type SubotizCheckoutSession = {
  session_id: string;
  session_url: string;
};

export type SubotizCheckoutSessionDetails = {
  id: string;
  order_id: string;
  trade_id?: string;
  status: string;
  metadata?: SubotizMetadata | null;
};

export type SubotizTrade = {
  trade_id: string;
  access_no: string;
  merchant_id: string;
  amount: string;
  currency: string;
  customer_id: string;
  paid_at?: string | null;
  metadata?: SubotizMetadata | null;
  order_id: string;
  payment_mode: string;
  payment_token?: string;
  payment_method?: string;
  payment_channel?: string;
  trade_status: string;
  txn_time?: string;
  created_at?: string;
  refund_status?: string;
  total_refunded_amount?: string;
  session_id?: string;
  invoice_id?: string;
};

export type SubotizInvoice = {
  id: string;
  subscription_id: string;
  customer_id: string;
  sub_merchant_id: string;
  amount: string;
  currency: string;
  status: string;
  paid_at?: string | null;
  invoice_type: string;
  created_at: string;
  updated_at: string;
  cycle_index?: string;
  cycle_start?: string | null;
  cycle_end?: string | null;
  order_id: string;
  refund_id?: string;
  trade_id: string;
  original_invoice_id?: string;
  metadata?: SubotizMetadata | null;
  subscription_data?: {
    metadata?: SubotizMetadata | null;
  } | null;
};

export type SubotizSubscription = {
  id: string;
  customer_id: string;
  sub_merchant_id: string;
  status: string;
  price_id: string;
  total_cycles?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_invoice_date?: string | null;
  created_at?: string;
  updated_at?: string;
  order_id?: string;
  cycle_index?: string;
  cancel_at?: string | null;
  cancel_reason?: string;
  source_trade_id?: string;
  metadata?: SubotizMetadata | null;
  paused_at?: string | null;
  initiate_cancel_at?: string | null;
  expected_cancel_at?: string | null;
  end_at?: string | null;
};

export type SubotizRefund = {
  access_no: string;
  merchant_id: string;
  refund_id: string;
  trade_id: string;
  currency: string;
  reason?: string;
  refund_amount: string;
  refund_status: string;
  metadata?: SubotizMetadata | null;
  failure_reason?: string | null;
  finished_at?: string | null;
};

export type SubotizWebhookEvent<T = unknown> = {
  id: string;
  type: string;
  created: string;
  data: T;
};
