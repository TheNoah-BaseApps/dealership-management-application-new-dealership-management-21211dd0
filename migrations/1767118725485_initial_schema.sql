CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS leads (
  lead_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  lead_source text,
  lead_status text DEFAULT 'New' NOT NULL,
  contact_name text NOT NULL,
  contact_phone text,
  contact_email text,
  vehicle_interested text,
  inquiry_date timestamp with time zone DEFAULT now() NOT NULL,
  follow_up_date timestamp with time zone,
  assigned_to uuid,
  estimated_value decimal(10,2),
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_email_phone ON leads (contact_email, contact_phone);

CREATE TABLE IF NOT EXISTS customers (
  customer_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  date_of_birth date,
  drivers_license text,
  preferred_contact text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);

CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  vin text NOT NULL UNIQUE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text,
  mileage integer,
  status text DEFAULT 'Available' NOT NULL,
  type text NOT NULL,
  purchase_price decimal(10,2),
  sale_price decimal(10,2),
  stock_number text,
  location text,
  condition text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles (vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles (type);

CREATE TABLE IF NOT EXISTS sales (
  sale_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  customer_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  sale_date timestamp with time zone DEFAULT now() NOT NULL,
  sale_price decimal(10,2) NOT NULL,
  financing_type text,
  salesperson_id uuid NOT NULL,
  trade_in_vehicle_id uuid,
  trade_in_value decimal(10,2),
  delivery_date timestamp with time zone,
  warranty_package text,
  sale_status text DEFAULT 'Pending' NOT NULL,
  down_payment decimal(10,2),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_vehicle_id ON sales (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson_id ON sales (salesperson_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (sale_status);

CREATE TABLE IF NOT EXISTS parts (
  part_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  part_number text NOT NULL UNIQUE,
  description text NOT NULL,
  category text,
  quantity_on_hand integer DEFAULT 0 NOT NULL,
  reorder_level integer,
  cost decimal(10,2),
  retail_price decimal(10,2),
  supplier text,
  location text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts (part_number);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts (category);

CREATE TABLE IF NOT EXISTS service_appointments (
  appointment_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  customer_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  appointment_date timestamp with time zone NOT NULL,
  service_type text,
  assigned_technician_id uuid,
  status text DEFAULT 'Scheduled' NOT NULL,
  estimated_completion timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_service_appointments_customer_id ON service_appointments (customer_id);
CREATE INDEX IF NOT EXISTS idx_service_appointments_vehicle_id ON service_appointments (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_appointments_technician_id ON service_appointments (assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_service_appointments_date ON service_appointments (appointment_date);

CREATE TABLE IF NOT EXISTS repair_orders (
  repair_order_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  appointment_id uuid,
  customer_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  open_date timestamp with time zone DEFAULT now() NOT NULL,
  close_date timestamp with time zone,
  status text DEFAULT 'Open' NOT NULL,
  labor_total decimal(10,2) DEFAULT 0,
  parts_total decimal(10,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  technician_id uuid,
  mileage integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_repair_orders_appointment_id ON repair_orders (appointment_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_customer_id ON repair_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_vehicle_id ON repair_orders (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_technician_id ON repair_orders (technician_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders (status);

CREATE TABLE IF NOT EXISTS repair_order_items (
  item_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  repair_order_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  part_id uuid,
  labor_hours decimal(5,2)
);
CREATE INDEX IF NOT EXISTS idx_repair_order_items_repair_order_id ON repair_order_items (repair_order_id);
CREATE INDEX IF NOT EXISTS idx_repair_order_items_part_id ON repair_order_items (part_id);

CREATE TABLE IF NOT EXISTS service_history (
  history_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  vehicle_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  service_date timestamp with time zone NOT NULL,
  mileage integer,
  service_type text,
  description text,
  technician_id uuid,
  cost decimal(10,2),
  repair_order_id uuid
);
CREATE INDEX IF NOT EXISTS idx_service_history_vehicle_id ON service_history (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_history_customer_id ON service_history (customer_id);
CREATE INDEX IF NOT EXISTS idx_service_history_repair_order_id ON service_history (repair_order_id);

CREATE TABLE IF NOT EXISTS communications (
  communication_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  customer_id uuid NOT NULL,
  type text NOT NULL,
  subject text,
  message text NOT NULL,
  sent_by uuid NOT NULL,
  sent_date timestamp with time zone DEFAULT now() NOT NULL,
  status text,
  response text,
  response_date timestamp with time zone
);
CREATE INDEX IF NOT EXISTS idx_communications_customer_id ON communications (customer_id);
CREATE INDEX IF NOT EXISTS idx_communications_sent_by ON communications (sent_by);
CREATE INDEX IF NOT EXISTS idx_communications_type ON communications (type);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  type text NOT NULL,
  reference_id uuid,
  customer_id uuid,
  amount decimal(10,2) NOT NULL,
  payment_method text,
  transaction_date timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'Completed' NOT NULL,
  description text,
  created_by uuid NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions (reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (transaction_date);

CREATE TABLE IF NOT EXISTS documents (
  document_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  type text NOT NULL,
  reference_id uuid,
  reference_type text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  upload_date timestamp with time zone DEFAULT now() NOT NULL,
  description text
);
CREATE INDEX IF NOT EXISTS idx_documents_reference_id ON documents (reference_id);
CREATE INDEX IF NOT EXISTS idx_documents_reference_type ON documents (reference_type);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents (type);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  ip_address text
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);