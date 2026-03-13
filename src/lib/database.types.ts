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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      athlete_profiles: {
        Row: {
          created_at: string
          height_cm: number | null
          id: string
          sport_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          height_cm?: number | null
          id: string
          sport_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          height_cm?: number | null
          id?: string
          sport_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          onboarding_completed: boolean
          onboarding_step: number
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id: string
          last_name?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trainer_athlete_connections: {
        Row: {
          athlete_email: string
          athlete_id: string | null
          can_see_analysis: boolean
          can_see_body_data: boolean
          can_see_calendar: boolean
          can_see_nutrition: boolean
          connected_at: string | null
          created_at: string
          disconnected_at: string | null
          id: string
          invitation_expires_at: string
          invitation_message: string | null
          invited_at: string
          rejected_at: string | null
          status: Database["public"]["Enums"]["connection_status"]
          trainer_id: string
          updated_at: string
        }
        Insert: {
          athlete_email: string
          athlete_id?: string | null
          can_see_analysis?: boolean
          can_see_body_data?: boolean
          can_see_calendar?: boolean
          can_see_nutrition?: boolean
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          invitation_expires_at?: string
          invitation_message?: string | null
          invited_at?: string
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          trainer_id: string
          updated_at?: string
        }
        Update: {
          athlete_email?: string
          athlete_id?: string | null
          can_see_analysis?: boolean
          can_see_body_data?: boolean
          can_see_calendar?: boolean
          can_see_nutrition?: boolean
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          invitation_expires_at?: string
          invitation_message?: string | null
          invited_at?: string
          rejected_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_athlete_connections_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_athlete_connections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          created_at: string
          id: string
          max_athletes: number
          organization_name: string | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          max_athletes?: number
          organization_name?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_athletes?: number
          organization_name?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          granted: boolean
          granted_at: string
          id: string
          policy_version: string
          user_id: string
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          granted: boolean
          granted_at?: string
          id?: string
          policy_version?: string
          user_id: string
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          granted?: boolean
          granted_at?: string
          id?: string
          policy_version?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { required_role: string }; Returns: boolean }
    }
    Enums: {
      connection_status: "pending" | "active" | "rejected" | "disconnected"
      consent_type: "terms_privacy" | "body_wellness_data" | "nutrition_data"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      connection_status: ["pending", "active", "rejected", "disconnected"],
      consent_type: ["terms_privacy", "body_wellness_data", "nutrition_data"],
    },
  },
} as const
