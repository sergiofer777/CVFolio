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
          plan: "free" | "premium";
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
          plan?: "free" | "premium";
          custom_domain?: string | null;
        };
        Update: {
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "premium";
          custom_domain?: string | null;
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
