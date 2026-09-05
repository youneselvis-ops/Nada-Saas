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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          expires_at: string
          id: string
          product_name: string
          purchased_at: string
          quantity: number
          receipt_item_id: string | null
          resolved_at: string | null
          status: string
          storage: string
          unit: string
          user_id: string
          value_amount: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_at: string
          id?: string
          product_name: string
          purchased_at: string
          quantity?: number
          receipt_item_id?: string | null
          resolved_at?: string | null
          status?: string
          storage?: string
          unit?: string
          user_id: string
          value_amount?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          product_name?: string
          purchased_at?: string
          quantity?: number
          receipt_item_id?: string | null
          resolved_at?: string | null
          status?: string
          storage?: string
          unit?: string
          user_id?: string
          value_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_receipt_item_id_fkey"
            columns: ["receipt_item_id"]
            isOneToOne: false
            referencedRelation: "receipt_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          id: string
          kind: string
          payload: Json | null
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kind: string
          payload?: Json | null
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: string
          payload?: Json | null
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_observations: {
        Row: {
          created_at: string
          id: string
          normalized_name: string
          observed_at: string
          store_name: string | null
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_name: string
          observed_at: string
          store_name?: string | null
          unit: string
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_name?: string
          observed_at?: string
          store_name?: string | null
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          household_size: number
          id: string
          locale: string
          onboarded_at: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          household_size?: number
          id: string
          locale?: string
          onboarded_at?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          household_size?: number
          id?: string
          locale?: string
          onboarded_at?: string | null
        }
        Relationships: []
      }
      receipt_items: {
        Row: {
          category: string | null
          confidence: number | null
          id: string
          is_food: boolean
          normalized_name: string | null
          quantity: number
          raw_label: string
          receipt_id: string
          total_price: number | null
          unit: string
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          id?: string
          is_food?: boolean
          normalized_name?: string | null
          quantity?: number
          raw_label: string
          receipt_id: string
          total_price?: number | null
          unit?: string
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          confidence?: number | null
          id?: string
          is_food?: boolean
          normalized_name?: string | null
          quantity?: number
          raw_label?: string
          receipt_id?: string
          total_price?: number | null
          unit?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          currency: string
          error_message: string | null
          extraction_confidence: number | null
          extraction_raw: Json | null
          id: string
          image_path: string
          purchased_at: string | null
          status: string
          store_name: string | null
          total_amount: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          error_message?: string | null
          extraction_confidence?: number | null
          extraction_raw?: Json | null
          id?: string
          image_path: string
          purchased_at?: string | null
          status?: string
          store_name?: string | null
          total_amount?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          error_message?: string | null
          extraction_confidence?: number | null
          extraction_raw?: Json | null
          id?: string
          image_path?: string
          purchased_at?: string | null
          status?: string
          store_name?: string | null
          total_amount?: number | null
          user_id?: string
        }
        Relationships: []
      }
      shelf_life_catalog: {
        Row: {
          aliases: string[]
          category: string
          days_freezer: number | null
          days_fridge: number | null
          days_pantry: number | null
          default_storage: string
          normalized_name: string
        }
        Insert: {
          aliases?: string[]
          category: string
          days_freezer?: number | null
          days_fridge?: number | null
          days_pantry?: number | null
          default_storage: string
          normalized_name: string
        }
        Update: {
          aliases?: string[]
          category?: string
          days_freezer?: number | null
          days_fridge?: number | null
          days_pantry?: number | null
          default_storage?: string
          normalized_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
