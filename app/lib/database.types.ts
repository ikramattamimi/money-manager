export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_groups: {
        Row: {
          book_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          sort: number
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["account_kind"]
          name: string
          sort?: number
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["account_kind"]
          name?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_groups_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          archived: boolean
          book_id: string
          created_at: string
          due_day: number | null
          group_id: string
          id: string
          include_in_total: boolean
          name: string
          note: string
          opening_balance: number
          sort: number
          statement_day: number | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          book_id: string
          created_at?: string
          due_day?: number | null
          group_id: string
          id?: string
          include_in_total?: boolean
          name: string
          note?: string
          opening_balance?: number
          sort?: number
          statement_day?: number | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          book_id?: string
          created_at?: string
          due_day?: number | null
          group_id?: string
          id?: string
          include_in_total?: boolean
          name?: string
          note?: string
          opening_balance?: number
          sort?: number
          statement_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_group_id_book_id_fkey"
            columns: ["group_id", "book_id"]
            isOneToOne: false
            referencedRelation: "account_groups"
            referencedColumns: ["id", "book_id"]
          },
        ]
      }
      book_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          book_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["book_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          book_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["book_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          book_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["book_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_invites_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_members: {
        Row: {
          book_id: string
          created_at: string
          role: Database["public"]["Enums"]["book_role"]
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["book_role"]
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["book_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_members_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          month_start_day: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          month_start_day?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          month_start_day?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          book_id: string
          carry_over: boolean
          category_id: string | null
          created_at: string
          id: string
          period: Database["public"]["Enums"]["budget_period"]
          start_on: string
          updated_at: string
        }
        Insert: {
          amount: number
          book_id: string
          carry_over?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          start_on: string
          updated_at?: string
        }
        Update: {
          amount?: number
          book_id?: string
          carry_over?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          start_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_category_id_book_id_fkey"
            columns: ["category_id", "book_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "book_id"]
          },
        ]
      }
      categories: {
        Row: {
          archived: boolean
          book_id: string
          created_at: string
          emoji: string
          icon: string
          tone: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id: string | null
          sort: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          book_id: string
          created_at?: string
          emoji?: string
          icon?: string
          tone?: string
          id?: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id?: string | null
          sort?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          book_id?: string
          created_at?: string
          emoji?: string
          icon?: string
          tone?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          parent_id?: string | null
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_book_id_fkey"
            columns: ["parent_id", "book_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "book_id"]
          },
        ]
      }
      import_batches: {
        Row: {
          book_id: string
          created_at: string
          created_by: string | null
          filename: string
          id: string
          row_count: number
          source: Database["public"]["Enums"]["import_source"]
          status: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          book_id: string
          created_at?: string
          created_by?: string | null
          filename?: string
          id?: string
          row_count?: number
          source: Database["public"]["Enums"]["import_source"]
          status?: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          book_id?: string
          created_at?: string
          created_by?: string | null
          filename?: string
          id?: string
          row_count?: number
          source?: Database["public"]["Enums"]["import_source"]
          status?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_pending: {
        Row: {
          book_id: string
          created_at: string
          due_on: string
          id: string
          rule_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          due_on: string
          id?: string
          rule_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          due_on?: string
          id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_pending_rule_id_book_id_fkey"
            columns: ["rule_id", "book_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id", "book_id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          auto_post: boolean
          book_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          day_of_month: number | null
          description: string
          end_on: string | null
          fee: number
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          interval: number
          name: string
          next_run_on: string
          note: string
          start_on: string
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          auto_post?: boolean
          book_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          description?: string
          end_on?: string | null
          fee?: number
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          interval?: number
          name: string
          next_run_on: string
          note?: string
          start_on: string
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          auto_post?: boolean
          book_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number | null
          description?: string
          end_on?: string | null
          fee?: number
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          interval?: number
          name?: string
          next_run_on?: string
          note?: string
          start_on?: string
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_book_id_fkey"
            columns: ["account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "book_id"]
          },
          {
            foreignKeyName: "recurring_rules_account_id_book_id_fkey"
            columns: ["account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "recurring_rules_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_book_id_fkey"
            columns: ["category_id", "book_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "recurring_rules_to_account_id_book_id_fkey"
            columns: ["to_account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "book_id"]
          },
          {
            foreignKeyName: "recurring_rules_to_account_id_book_id_fkey"
            columns: ["to_account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "book_id"]
          },
        ]
      }
      templates: {
        Row: {
          account_id: string | null
          amount: number | null
          book_id: string
          category_id: string | null
          created_at: string
          description: string
          id: string
          name: string
          note: string
          sort: number
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          use_count: number
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          book_id: string
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          name: string
          note?: string
          sort?: number
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          use_count?: number
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          book_id?: string
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          note?: string
          sort?: number
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "templates_account_id_book_id_fkey"
            columns: ["account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "book_id"]
          },
          {
            foreignKeyName: "templates_account_id_book_id_fkey"
            columns: ["account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "templates_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_category_id_book_id_fkey"
            columns: ["category_id", "book_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "templates_to_account_id_book_id_fkey"
            columns: ["to_account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "book_id"]
          },
          {
            foreignKeyName: "templates_to_account_id_book_id_fkey"
            columns: ["to_account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "book_id"]
          },
        ]
      }
      transaction_offsets: {
        Row: {
          amount: number
          book_id: string
          created_at: string
          created_by: string | null
          expense_id: string
          id: string
          income_id: string
        }
        Insert: {
          amount: number
          book_id: string
          created_at?: string
          created_by?: string | null
          expense_id: string
          id?: string
          income_id: string
        }
        Update: {
          amount?: number
          book_id?: string
          created_at?: string
          created_by?: string | null
          expense_id?: string
          id?: string
          income_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_offsets_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_offsets_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          book_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          description: string
          fee: number
          id: string
          import_batch_id: string | null
          is_adjustment: boolean
          note: string
          occurred_at: string
          recurring_rule_id: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          book_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          description?: string
          fee?: number
          id?: string
          import_batch_id?: string | null
          is_adjustment?: boolean
          note?: string
          occurred_at?: string
          recurring_rule_id?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          book_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          description?: string
          fee?: number
          id?: string
          import_batch_id?: string | null
          is_adjustment?: boolean
          note?: string
          occurred_at?: string
          recurring_rule_id?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_book_id_fkey"
            columns: ["account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "book_id"]
          },
          {
            foreignKeyName: "transactions_account_id_book_id_fkey"
            columns: ["account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_book_id_fkey"
            columns: ["category_id", "book_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_batch_id_book_id_fkey"
            columns: ["import_batch_id", "book_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_book_id_fkey"
            columns: ["recurring_rule_id", "book_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id", "book_id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_book_id_fkey"
            columns: ["to_account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "account_balances"
            referencedColumns: ["account_id", "book_id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_book_id_fkey"
            columns: ["to_account_id", "book_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "book_id"]
          },
        ]
      }
    }
    Views: {
      account_balances: {
        Row: {
          account_id: string | null
          balance: number | null
          book_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
      account_ledger: {
        Args: { p_account_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          account_id: string
          amount: number
          balance_after: number
          category_id: string
          delta: number
          fee: number
          id: string
          is_adjustment: boolean
          note: string
          occurred_at: string
          to_account_id: string
          type: Database["public"]["Enums"]["transaction_type"]
        }[]
      }
      adjust_balance: {
        Args: { p_account_id: string; p_actual: number }
        Returns: {
          account_id: string
          amount: number
          book_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          description: string
          fee: number
          id: string
          import_batch_id: string | null
          is_adjustment: boolean
          note: string
          occurred_at: string
          recurring_rule_id: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_member_list: {
        Args: { p_book_id: string }
        Returns: {
          display_name: string
          email: string | null
          is_me: boolean
          joined_at: string
          role: Database["public"]["Enums"]["book_role"]
          user_id: string
        }[]
      }
      budget_status: {
        Args: { p_book_id: string; p_month: number; p_year: number }
        Returns: {
          amount: number
          budget_id: string
          carried: number
          carry_over: boolean
          category_id: string | null
          spent: number
          start_on: string
        }[]
      }
      bump_template: { Args: { p_template_id: string }; Returns: number }
      category_breakdown: {
        Args: {
          p_book_id: string
          p_from: string
          p_to: string
          p_type: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: {
          category_id: string | null
          root_id: string | null
          total: number
          tx_count: number
        }[]
      }
      ai_refund_quota: { Args: never; Returns: undefined }
      ai_take_quota: { Args: { p_limit: number }; Returns: number }
      commit_bank_import: {
        Args: { p_book_id: string; p_payload: Json }
        Returns: Json
      }
      commit_import: {
        Args: { p_book_id: string; p_payload: Json }
        Returns: Json
      }
      create_invite: {
        Args: {
          p_book_id: string
          p_email: string
          p_role?: Database["public"]["Enums"]["book_role"]
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          book_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["book_role"]
          token: string
        }
        SetofOptions: {
          from: "*"
          to: "book_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      import_existing_keys: {
        Args: { p_book_id: string; p_keys: string[] }
        Returns: string[]
      }
      invite_preview: {
        Args: { p_token: string }
        Returns: {
          book_name: string
          email_hint: string
          for_me: boolean
          invited_by_name: string
          role: Database["public"]["Enums"]["book_role"]
          status: string
        }[]
      }
      monthly_trend: {
        Args: {
          p_book_id: string
          p_category_id?: string
          p_month: number
          p_months?: number
          p_year: number
        }
        Returns: { expense: number; income: number; month: number; year: number }[]
      }
      months_overview: {
        Args: { p_book_id: string; p_year: number }
        Returns: {
          expense: number
          income: number
          month: number
          tx_count: number
        }[]
      }
      confirm_recurring: {
        Args: { p_amount?: number; p_pending_id: string }
        Returns: string
      }
      years_overview: {
        Args: { p_book_id: string }
        Returns: {
          expense: number
          income: number
          tx_count: number
          year: number
        }[]
      }
      offset_candidates: {
        Args: {
          p_book_id: string
          p_income_id?: string
          p_limit?: number
          p_query?: string
        }
        Returns: {
          account_id: string
          amount: number
          category_id: string | null
          id: string
          note: string
          occurred_at: string
          remaining: number
        }[]
      }
      period_insight: {
        Args: {
          p_book_id: string
          p_from: string
          p_prev_from: string
          p_prev_to: string
          p_to: string
        }
        Returns: {
          expense: number
          expense_days: number
          income: number
          peak_day: string | null
          peak_expense: number | null
          prev_expense: number
          prev_income: number
          rise_category_id: string | null
          rise_now: number | null
          rise_prev: number | null
        }[]
      }
      post_due_recurring: { Args: { p_book_id?: string }; Returns: number }
      revert_import: { Args: { p_batch_id: string }; Returns: number }
      search_transactions: {
        Args: {
          p_account_id?: string
          p_book_id: string
          p_category_id?: string
          p_from?: string
          p_limit?: number
          p_max?: number
          p_min?: number
          p_offset?: number
          p_query?: string
          p_to?: string
          p_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: {
          id: string
          total_count: number
          total_expense: number
          total_income: number
        }[]
      }
      set_income_offsets: {
        Args: { p_income_id: string; p_links: Json }
        Returns: number
      }
      suggest_from_note: {
        Args: { p_book_id: string; p_note: string }
        Returns: {
          account_id: string | null
          amount: number | null
          category_id: string | null
          matches: number
          type: Database["public"]["Enums"]["transaction_type"] | null
        }[]
      }
    }
    Enums: {
      account_kind:
        | "cash"
        | "bank"
        | "ewallet"
        | "card"
        | "savings"
        | "investment"
        | "receivable"
        | "loan"
        | "other"
      book_role: "owner" | "editor" | "viewer"
      budget_period: "monthly"
      category_kind: "income" | "expense"
      import_source: "realbyte_xlsx" | "bank_statement" | "photo"
      import_status: "committed" | "reverted"
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly"
      transaction_source:
        | "manual"
        | "quick_add"
        | "template"
        | "recurring"
        | "import_realbyte"
        | "import_bank"
        | "ocr"
      transaction_type: "income" | "expense" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_kind: [
        "cash",
        "bank",
        "ewallet",
        "card",
        "savings",
        "investment",
        "receivable",
        "loan",
        "other",
      ],
      book_role: ["owner", "editor", "viewer"],
      budget_period: ["monthly"],
      category_kind: ["income", "expense"],
      import_source: ["realbyte_xlsx", "bank_statement", "photo"],
      import_status: ["committed", "reverted"],
      recurring_frequency: ["daily", "weekly", "monthly", "yearly"],
      transaction_source: [
        "manual",
        "quick_add",
        "template",
        "recurring",
        "import_realbyte",
        "import_bank",
        "ocr",
      ],
      transaction_type: ["income", "expense", "transfer"],
    },
  },
} as const
