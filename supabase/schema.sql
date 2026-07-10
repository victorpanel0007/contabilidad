-- FinanzApp Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  currency text default 'COP',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Accounts
create table if not exists accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null default 'bank', -- bank | cash | digital | credit | investment
  balance decimal(15,2) default 0,
  initial_balance decimal(15,2) default 0,
  color text default '#6366f1',
  icon text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references accounts(id) on delete set null,
  type text not null, -- income | expense
  amount decimal(15,2) not null,
  description text,
  category text,
  icon text,
  date date not null default current_date,
  payment_method text,
  notes text,
  receipt_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Categories
create table if not exists categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  type text not null, -- income | expense
  name text not null,
  icon text,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Budgets
create table if not exists budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null,
  icon text,
  color text,
  amount decimal(15,2) not null,
  month text not null, -- yyyy-MM format
  alert_percent integer default 80,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goals
create table if not exists goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  icon text default '⭐',
  target_amount decimal(15,2) not null,
  current_amount decimal(15,2) default 0,
  target_date date,
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Debts
create table if not exists debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null default 'owe', -- owe | collect
  person_name text not null,
  amount decimal(15,2) not null,
  description text,
  due_date date,
  paid boolean default false,
  paid_date date,
  reminder_days integer default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Default categories (system-wide, user_id is null)
insert into categories (type, name, icon, color) values
  ('expense', 'Alimentación', '🍔', '#f97316'),
  ('expense', 'Transporte', '🚗', '#3b82f6'),
  ('expense', 'Vivienda', '🏠', '#8b5cf6'),
  ('expense', 'Salud', '🏥', '#f43f5e'),
  ('expense', 'Entretenimiento', '🎮', '#ec4899'),
  ('expense', 'Educación', '📚', '#14b8a6'),
  ('expense', 'Ropa', '👕', '#eab308'),
  ('expense', 'Servicios', '⚡', '#06b6d4'),
  ('expense', 'Tecnología', '💻', '#6366f1'),
  ('expense', 'Otros', '📦', '#64748b'),
  ('income', 'Salario', '💼', '#22c55e'),
  ('income', 'Freelance', '💻', '#10b981'),
  ('income', 'Inversiones', '📈', '#6366f1'),
  ('income', 'Negocios', '🏪', '#f97316'),
  ('income', 'Regalos', '🎁', '#ec4899'),
  ('income', 'Otros', '💰', '#64748b')
on conflict do nothing;

-- Row Level Security
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;
alter table debts enable row level security;

-- RLS Policies
create policy "Users can manage own profile" on profiles for all using (auth.uid() = id);
create policy "Users can manage own accounts" on accounts for all using (auth.uid() = user_id);
create policy "Users can manage own transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users can read system categories and their own" on categories for select using (user_id is null or auth.uid() = user_id);
create policy "Users can insert their own categories" on categories for insert with check (auth.uid() = user_id);
create policy "Users can manage own budgets" on budgets for all using (auth.uid() = user_id);
create policy "Users can manage own goals" on goals for all using (auth.uid() = user_id);
create policy "Users can manage own debts" on debts for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Indexes
create index if not exists idx_transactions_user_date on transactions(user_id, date desc);
create index if not exists idx_transactions_type on transactions(user_id, type);
create index if not exists idx_accounts_user on accounts(user_id);
create index if not exists idx_budgets_user_month on budgets(user_id, month);
create index if not exists idx_goals_user on goals(user_id);
create index if not exists idx_debts_user on debts(user_id);
