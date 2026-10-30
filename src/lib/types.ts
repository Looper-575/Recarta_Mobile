/** Shapes returned by the store's /api/v1 (docs/api_v1.md in the Laravel repo). */

export type Settings = {
  store: {
    name: string;
    tagline: string | null;
    primary_color: string;
    logo: string | null;
    footer_logo: string | null;
    favicon: string | null;
    app_icon: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    website: string;
  };
  bank_transfer_details: string | null;
  corporate_customers: boolean;
  payment_methods: { code: string; name: string }[];
  free_delivery_from: number | null;
  app: { min_version: string | null; hide_digital_on_ios: boolean };
};

export type ProductItem = {
  id: number;
  title: string;
  unit: string | null;
  price: number;
  original_price: number;
  discount: number;
  images: string[];
};

export type Product = {
  id: number;
  title: string;
  slug: string;
  category_id: number;
  category_slug?: string | null;
  brand_id: number | null;
  thumbnail: string | null;
  sellable: boolean;
  status_label: string;
  is_digital: boolean;
  manage_inventory: boolean;
  items: ProductItem[];
  url: string | null;
  /** Lists only: each item's stock status, by item id. */
  stock?: Record<number, StockStatus>;
  /** Lists only: the campaign's best discount ("Save up to 12%"), or null. */
  save_up_to?: number | null;
};

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unavailable';

export type StockInfo = {
  status: StockStatus;
  label: string;
  quantity: number | null;
};

export type ProductDetail = Omit<Product, 'stock'> & {
  description: string | null;
  brand: Brand | null;
  stock: Record<string, StockInfo>;
  campaign: {
    title: string;
    tiers: { min_qty: number; max_qty: number | null; discount_percentage: number }[];
  } | null;
  notify_requested: number[];
};

export type Category = {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  banner: string | null;
  children?: Category[];
};

export type Brand = { id: number; title: string; slug: string; image: string | null };

export type Home = {
  slides: { image: string | null; link: string | null }[];
  banners: Record<string, { title: string | null; image: string | null; link: string | null }[]>;
  promo_cards: { media: string | null; media_type: string | null; link: string | null }[];
  parent_categories: Category[];
  featured_categories: Category[];
  featured_products: Product[];
  brands: Brand[];
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total?: number } & Record<string, unknown>;
};

export type CartLine = {
  item_id: number;
  product_id: number;
  product_title: string | null;
  item_title: string | null;
  image: string | null;
  quantity: number;
  price: number;
  effective_price: number;
  discount_percentage: number;
  line_total: number;
  is_digital: boolean;
  available: boolean;
  problem: string | null;
};

export type Cart = {
  cart_token: string | null;
  items: CartLine[];
  count: number;
  subtotal: number;
  bulk_discount: number;
  campaigns: {
    campaign_title: string;
    current_qty: number;
    next_tier_qty: number;
    needed: number;
    next_discount: number;
    fully_applied: boolean;
  }[];
  free_delivery_from: number | null;
  can_checkout: boolean;
};

export type Customer = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  is_corporate: boolean;
  corporate_status: string | null;
  free_shipping: boolean;
  wallet_balance: number;
  has_password_login: boolean;
};

export type LoginResponse = { token: string; customer: Customer };

export type Region = { id: number; name: string };
export type City = { id: number; name: string; region_id: number };
export type Area = { id: number; title: string; city_id: number };
export type PickupLocation = { id: number; title: string; address: string | null; map_url: string | null; city_id: number };
export type PickupSlot = { value: string; label: string };

export type CheckoutBody = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  fulfilment?: 'delivery' | 'pickup';
  city_id?: number | null;
  area_id?: number | null;
  address?: string;
  instructions?: string;
  pickup_location_id?: number | null;
  pickup_slot?: string | null;
  delivery_type?: string;
  payment_method?: string;
  discount_code?: string | null;
  pay_from_wallet?: boolean;
  save_address?: boolean;
};

export type Quote = {
  cart_total: number;
  bulk_discount: number;
  fulfilment: 'delivery' | 'pickup' | 'digital';
  delivery: {
    covered: boolean | null;
    method: string | null;
    courier: string | null;
    charge: number;
    base_charge: number;
    free_threshold: number | null;
  };
  discount: { code: string; amount: number; reward_type: string } | null;
  discount_error: string | null;
  payment_method_error: string | null;
  payment_charge: number;
  payment_charge_label: string | null;
  wallet_balance: number;
  wallet_used: number;
  total: number;
  problems: string[];
};

export type PlacedOrder = {
  order_id: number;
  order_number: string;
  total: number;
  payment_method: string;
  payment_url: string | null;
};

export type OrderSummary = {
  id: number;
  order_number: string;
  status_id: number;
  status: string;
  status_color: string | null;
  payment_method: string;
  payment_status: 'paid' | 'unpaid';
  items_count: number;
  total: number;
  created_at: string | null;
};

export type OrderDetail = OrderSummary & {
  customer: { first_name: string; last_name: string; email: string; phone: string };
  delivery: {
    type: string | null;
    date: string | null;
    time: string | null;
    area: string | null;
    city: string | null;
    address: string | null;
    instructions: string | null;
  };
  items: {
    order_detail_id: number;
    product_id: number;
    item_id: number;
    title: string | null;
    item_title: string | null;
    thumbnail: string | null;
    quantity: number;
    returned_quantity: number;
    price: number;
    total: number;
  }[];
  totals: {
    cart_total: number;
    bulk_discount: number;
    delivery_charges: number;
    discount_code: string | null;
    discount_amount: number;
    reward_type: string | null;
    payment_charge: number;
    payment_charge_label: string;
    wallet_amount: number;
    additional_discount: number;
    total: number;
  };
  can_cancel: boolean;
  can_change_payment_method: boolean;
  can_return: boolean;
  pay_url: string | null;
  invoice_url: string;
  timeline: { status: string; notes: string | null; created_at: string | null }[];
};

export type Address = {
  id: number;
  title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  area_id: number;
  area: string | null;
  city_id: number | null;
  region_id: number | null;
  address: string;
  instructions: string | null;
  is_default: boolean;
};
