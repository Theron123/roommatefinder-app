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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contract_participants: {
        Row: {
          contract_id: string
          user_id: string
        }
        Insert: {
          contract_id: string
          user_id: string
        }
        Update: {
          contract_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_participants_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          clauses: Json | null
          created_at: string | null
          effective_date: string | null
          id: string
          initiator_id: string | null
          listing_id: string | null
          pdf_url: string | null
          selected_custom_clauses: string[] | null
          status: string
          template_version: string | null
          termination_date: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          clauses?: Json | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          initiator_id?: string | null
          listing_id?: string | null
          pdf_url?: string | null
          selected_custom_clauses?: string[] | null
          status?: string
          template_version?: string | null
          termination_date?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          clauses?: Json | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          initiator_id?: string | null
          listing_id?: string | null
          pdf_url?: string | null
          selected_custom_clauses?: string[] | null
          status?: string
          template_version?: string | null
          termination_date?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_property_verified: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          price: number | null
          status: string | null
          title: string | null
          user_id: string | null
          utilities_included: boolean | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_property_verified?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          price?: number | null
          status?: string | null
          title?: string | null
          user_id?: string | null
          utilities_included?: boolean | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_property_verified?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          price?: number | null
          status?: string | null
          title?: string | null
          user_id?: string | null
          utilities_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings_staging: {
        Row: {
          address: string | null
          created_listing_id: string | null
          currency: string | null
          description: string | null
          external_id: string
          id: string
          images: string[] | null
          imported_at: string
          latitude: number | null
          longitude: number | null
          price: number | null
          raw_payload: Json | null
          reject_reason: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          title: string | null
          utilities_included: boolean | null
        }
        Insert: {
          address?: string | null
          created_listing_id?: string | null
          currency?: string | null
          description?: string | null
          external_id: string
          id?: string
          images?: string[] | null
          imported_at?: string
          latitude?: number | null
          longitude?: number | null
          price?: number | null
          raw_payload?: Json | null
          reject_reason?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          title?: string | null
          utilities_included?: boolean | null
        }
        Update: {
          address?: string | null
          created_listing_id?: string | null
          currency?: string | null
          description?: string | null
          external_id?: string
          id?: string
          images?: string[] | null
          imported_at?: string
          latitude?: number | null
          longitude?: number | null
          price?: number | null
          raw_payload?: Json | null
          reject_reason?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          title?: string | null
          utilities_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_staging_created_listing_id_fkey"
            columns: ["created_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_staging_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          user1: string | null
          user2: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          user1?: string | null
          user2?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          user1?: string | null
          user2?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          match_id: string | null
          media_type: string | null
          media_url: string | null
          receiver_id: string | null
          reply_to_id: string | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          media_type?: string | null
          media_url?: string | null
          receiver_id?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          media_type?: string | null
          media_url?: string | null
          receiver_id?: string | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          availability_status: string | null
          bio: string | null
          biometric_enabled: boolean | null
          created_at: string | null
          dealbreakers: string | null
          id: string
          is_background_verified: boolean | null
          is_email_verified: boolean | null
          is_identity_verified: boolean | null
          is_income_verified: boolean | null
          is_public: boolean | null
          is_references_verified: boolean | null
          is_social_verified: boolean | null
          is_university_verified: boolean | null
          is_workplace_verified: boolean | null
          latitude: number | null
          latOffset: number | null
          lifestyle: Json | null
          likes: string | null
          lngOffset: number | null
          longitude: number | null
          name: string
          photos: string[] | null
          photoUrl: string | null
          preferences: string | null
          push_token: string | null
          read_receipts_enabled: boolean | null
          risk_level: string | null
          role: string | null
          share_badges_enabled: boolean | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          availability_status?: string | null
          bio?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          dealbreakers?: string | null
          id: string
          is_background_verified?: boolean | null
          is_email_verified?: boolean | null
          is_identity_verified?: boolean | null
          is_income_verified?: boolean | null
          is_public?: boolean | null
          is_references_verified?: boolean | null
          is_social_verified?: boolean | null
          is_university_verified?: boolean | null
          is_workplace_verified?: boolean | null
          latitude?: number | null
          latOffset?: number | null
          lifestyle?: Json | null
          likes?: string | null
          lngOffset?: number | null
          longitude?: number | null
          name: string
          photos?: string[] | null
          photoUrl?: string | null
          preferences?: string | null
          push_token?: string | null
          read_receipts_enabled?: boolean | null
          risk_level?: string | null
          role?: string | null
          share_badges_enabled?: boolean | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          availability_status?: string | null
          bio?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          dealbreakers?: string | null
          id?: string
          is_background_verified?: boolean | null
          is_email_verified?: boolean | null
          is_identity_verified?: boolean | null
          is_income_verified?: boolean | null
          is_public?: boolean | null
          is_references_verified?: boolean | null
          is_social_verified?: boolean | null
          is_university_verified?: boolean | null
          is_workplace_verified?: boolean | null
          latitude?: number | null
          latOffset?: number | null
          lifestyle?: Json | null
          likes?: string | null
          lngOffset?: number | null
          longitude?: number | null
          name?: string
          photos?: string[] | null
          photoUrl?: string | null
          preferences?: string | null
          push_token?: string | null
          read_receipts_enabled?: boolean | null
          risk_level?: string | null
          role?: string | null
          share_badges_enabled?: boolean | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string | null
          id: string
          liked: boolean
          swiped: string
          swiper: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          liked: boolean
          swiped: string
          swiper: string
        }
        Update: {
          created_at?: string | null
          id?: string
          liked?: boolean
          swiped?: string
          swiper?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reported_id: string | null
          reporter_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reported_id?: string | null
          reporter_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reported_id?: string | null
          reporter_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verifications: {
        Row: {
          created_at: string | null
          document_url: string | null
          id: string
          metadata: Json | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_url?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: { Args: never; Returns: undefined }
      is_admin: { Args: { user_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
