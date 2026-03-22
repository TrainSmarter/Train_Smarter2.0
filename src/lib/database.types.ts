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
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "athlete_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      category_dimensions: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: Json | null
          exercise_type: string | null
          id: string
          is_deleted: boolean
          name: Json
          scope: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: Json | null
          exercise_type?: string | null
          id?: string
          is_deleted?: boolean
          name: Json
          scope?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: Json | null
          exercise_type?: string | null
          id?: string
          is_deleted?: boolean
          name?: Json
          scope?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      category_nodes: {
        Row: {
          ai_hint: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          depth: number
          description: Json | null
          dimension_id: string
          icon: string | null
          id: string
          is_deleted: boolean
          metadata: Json | null
          name: Json
          parent_id: string | null
          path: string
          scope: string
          slug: string
          sort_order: number
          trainer_visible: boolean
          updated_at: string
        }
        Insert: {
          ai_hint?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          depth?: number
          description?: Json | null
          dimension_id: string
          icon?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json | null
          name: Json
          parent_id?: string | null
          path?: string
          scope?: string
          slug: string
          sort_order?: number
          trainer_visible?: boolean
          updated_at?: string
        }
        Update: {
          ai_hint?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          depth?: number
          description?: Json | null
          dimension_id?: string
          icon?: string | null
          id?: string
          is_deleted?: boolean
          metadata?: Json | null
          name?: Json
          parent_id?: string | null
          path?: string
          scope?: string
          slug?: string
          sort_order?: number
          trainer_visible?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_nodes_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "category_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string | null
          file_path: string | null
          id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_path?: string | null
          id?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_path?: string | null
          id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_category_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          exercise_id: string
          id: string
          node_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          node_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_category_assignments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_category_assignments_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "category_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_taxonomy: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean
          name: Json
          scope: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name: Json
          scope?: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          name?: Json
          scope?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_taxonomy_assignments: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          is_primary: boolean
          taxonomy_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          is_primary?: boolean
          taxonomy_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          is_primary?: boolean
          taxonomy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_taxonomy_assignments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_taxonomy_assignments_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "exercise_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          cloned_from: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: Json | null
          exercise_type: string
          id: string
          is_deleted: boolean
          name: Json
          scope: string
          updated_at: string
        }
        Insert: {
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: Json | null
          exercise_type: string
          id?: string
          is_deleted?: boolean
          name: Json
          scope?: string
          updated_at?: string
        }
        Update: {
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: Json | null
          exercise_type?: string
          id?: string
          is_deleted?: boolean
          name?: Json
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          is_required: boolean
          max_value: number | null
          min_value: number | null
          name: Json
          scale_labels: Json | null
          scope: string
          slug: string | null
          sort_order: number
          target_athlete_id: string | null
          type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_required?: boolean
          max_value?: number | null
          min_value?: number | null
          name: Json
          scale_labels?: Json | null
          scope: string
          slug?: string | null
          sort_order?: number
          target_athlete_id?: string | null
          type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_required?: boolean
          max_value?: number | null
          min_value?: number | null
          name?: Json
          scale_labels?: Json | null
          scope?: string
          slug?: string | null
          sort_order?: number
          target_athlete_id?: string | null
          type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "feedback_categories_target_athlete_id_fkey"
            columns: ["target_athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_categories_target_athlete_id_fkey"
            columns: ["target_athlete_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      feedback_category_overrides: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_category_overrides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feedback_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_category_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_category_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      feedback_checkin_values: {
        Row: {
          athlete_id: string
          category_id: string
          checkin_id: string
          created_at: string
          id: string
          numeric_value: number | null
          text_value: string | null
        }
        Insert: {
          athlete_id: string
          category_id: string
          checkin_id: string
          created_at?: string
          id?: string
          numeric_value?: number | null
          text_value?: string | null
        }
        Update: {
          athlete_id?: string
          category_id?: string
          checkin_id?: string
          created_at?: string
          id?: string
          numeric_value?: number | null
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_checkin_values_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feedback_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_checkin_values_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "feedback_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_checkin_values_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_checkin_history"
            referencedColumns: ["checkin_id"]
          },
        ]
      }
      feedback_checkins: {
        Row: {
          athlete_id: string
          created_at: string
          date: string
          id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          date: string
          id?: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      pending_deletions: {
        Row: {
          created_at: string
          delete_after: string
          id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delete_after?: string
          id?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delete_after?: string
          id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
          locale: string
          onboarding_completed: boolean
          onboarding_step: number
          role: string | null
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
          locale?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          role?: string | null
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
          locale?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          role?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      taxonomy_migration_map: {
        Row: {
          created_at: string
          new_node_id: string
          old_taxonomy_id: string
        }
        Insert: {
          created_at?: string
          new_node_id: string
          old_taxonomy_id: string
        }
        Update: {
          created_at?: string
          new_node_id?: string
          old_taxonomy_id?: string
        }
        Relationships: []
      }
      team_athletes: {
        Row: {
          assigned_at: string
          assigned_by: string
          athlete_id: string
          id: string
          team_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          athlete_id: string
          id?: string
          team_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          athlete_id?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_athletes_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_athletes_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "team_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: true
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "team_athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          personal_message: string | null
          status: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          personal_message?: string | null
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          personal_message?: string | null
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      teams: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
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
          connection_type: string
          created_at: string
          disconnected_at: string | null
          feedback_backfill_days: number
          feedback_backfill_mode: string
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
          connection_type?: string
          created_at?: string
          disconnected_at?: string | null
          feedback_backfill_days?: number
          feedback_backfill_mode?: string
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
          connection_type?: string
          created_at?: string
          disconnected_at?: string | null
          feedback_backfill_days?: number
          feedback_backfill_mode?: string
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
            foreignKeyName: "trainer_athlete_connections_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "trainer_athlete_connections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_athlete_connections_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      trainer_category_defaults: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          is_required: boolean
          trainer_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          trainer_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_category_defaults_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "feedback_categories"
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
          {
            foreignKeyName: "trainer_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          granted: boolean
          granted_at: string
          id: string
          ip_address: string | null
          policy_version: string
          user_id: string
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          granted: boolean
          granted_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          user_id: string
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_athlete_checkin_history: {
        Row: {
          athlete_id: string | null
          checkin_id: string | null
          created_at: string | null
          date: string | null
          updated_at: string | null
          values: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "v_athlete_monitoring_summary"
            referencedColumns: ["athlete_id"]
          },
        ]
      }
      v_athlete_monitoring_summary: {
        Row: {
          athlete_id: string | null
          avatar_url: string | null
          avg_scale_value: number | null
          compliance_rate: number | null
          email: string | null
          first_name: string | null
          last_checkin_date: string | null
          last_name: string | null
          latest_weight: number | null
          streak: number | null
          weight_trend: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_athlete_consent: {
        Args: { p_athlete_id: string; p_consent_type: string }
        Returns: boolean
      }
      check_athletes_consent: {
        Args: { p_athlete_ids: string[]; p_consent_type: string }
        Returns: {
          athlete_id: string
          has_consent: boolean
        }[]
      }
      check_fk_cascade_config: {
        Args: never
        Returns: {
          constraint_name: string
          delete_rule: string
          table_name: string
        }[]
      }
      check_user_consents_rls: {
        Args: never
        Returns: {
          cmd: string
          policyname: string
        }[]
      }
      cleanup_orphaned_data: { Args: never; Returns: Json }
      cleanup_pending_deletions: { Args: never; Returns: undefined }
      compute_category_path: { Args: { p_node_id: string }; Returns: string }
      copy_trainer_defaults_to_athlete: {
        Args: { p_athlete_id: string; p_trainer_id: string }
        Returns: undefined
      }
      get_category_ancestors: {
        Args: { p_node_id: string }
        Returns: {
          ai_hint: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          depth: number
          description: Json | null
          dimension_id: string
          icon: string | null
          id: string
          is_deleted: boolean
          metadata: Json | null
          name: Json
          parent_id: string | null
          path: string
          scope: string
          slug: string
          sort_order: number
          trainer_visible: boolean
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "category_nodes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_category_subtree: {
        Args: { p_node_id: string }
        Returns: {
          ai_hint: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          depth: number
          description: Json | null
          dimension_id: string
          icon: string | null
          id: string
          is_deleted: boolean
          metadata: Json | null
          name: Json
          parent_id: string | null
          path: string
          scope: string
          slug: string
          sort_order: number
          trainer_visible: boolean
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "category_nodes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: { Args: { required_role: string }; Returns: boolean }
      is_connected_athlete: { Args: { p_athlete_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      safe_is_team_member_from_path: {
        Args: { file_path: string }
        Returns: boolean
      }
      set_athlete_category_required: {
        Args: {
          p_athlete_id: string
          p_category_id: string
          p_is_required: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      connection_status: "pending" | "active" | "rejected" | "disconnected"
      consent_type: "terms_privacy" | "body_wellness_data" | "nutrition_data"
      team_invitation_status: "pending" | "accepted" | "declined"
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
      team_invitation_status: ["pending", "accepted", "declined"],
    },
  },
} as const
