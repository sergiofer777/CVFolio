export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: "free" | "premium" | "studio";
          custom_domain: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "premium" | "studio";
          custom_domain?: string | null;
        };
        Update: {
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "premium" | "studio";
          custom_domain?: string | null;
        };
      };
      billing_usage: {
        Row: {
          user_id: string;
          period_key: string;
          generation_count: number;
          chat_iteration_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          period_key: string;
          generation_count?: number;
          chat_iteration_count?: number;
        };
        Update: {
          generation_count?: number;
          chat_iteration_count?: number;
          updated_at?: string;
        };
      };
      domain_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_domain: string;
          status: "pending" | "processing" | "completed" | "failed";
          provider: string | null;
          price_cents: number | null;
          currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          requested_domain: string;
          status?: "pending" | "processing" | "completed" | "failed";
          provider?: string | null;
          price_cents?: number | null;
          currency?: string;
          notes?: string | null;
        };
        Update: {
          requested_domain?: string;
          status?: "pending" | "processing" | "completed" | "failed";
          provider?: string | null;
          price_cents?: number | null;
          currency?: string;
          notes?: string | null;
          updated_at?: string;
        };
      };
      billing_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: string;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: string;
          current_period_end?: string | null;
        };
        Update: {
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          status?: string;
          current_period_end?: string | null;
          updated_at?: string;
        };
      };
      cv_uploads: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_type: "pdf" | "jpg" | "png" | "jpeg";
          file_size: number;
          status: "pending" | "processing" | "done" | "error";
          created_at: string;
        };
        Insert: {
          user_id: string;
          file_name: string;
          file_path: string;
          file_type: "pdf" | "jpg" | "png" | "jpeg";
          file_size: number;
          status?: "pending" | "processing" | "done" | "error";
        };
        Update: {
          status?: "pending" | "processing" | "done" | "error";
        };
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          upload_id: string | null;
          cv_data: Json;
          theme: "minimal" | "modern" | "bold";
          is_published: boolean;
          is_public: boolean;
          meta_title: string | null;
          meta_description: string | null;
          version: number;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          user_id: string;
          upload_id?: string | null;
          cv_data: Json;
          theme?: "minimal" | "modern" | "bold";
          is_published?: boolean;
          is_public?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
        };
        Update: {
          cv_data?: Json;
          theme?: "minimal" | "modern" | "bold";
          is_published?: boolean;
          is_public?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          published_at?: string | null;
        };
      };
    };
  };
}
