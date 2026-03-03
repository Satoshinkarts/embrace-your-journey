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
      booking_events: {
        Row: {
          actor_id: string
          actor_role: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          ride_id: string
        }
        Insert: {
          actor_id: string
          actor_role?: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          ride_id: string
        }
        Update: {
          actor_id?: string
          actor_role?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_role: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_role: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string | null
          rider_id: string | null
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          rider_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          rider_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          image_metadata: Json | null
          image_url: string | null
          message_type: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          channel_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_metadata?: Json | null
          image_url?: string | null
          message_type?: string
          sender_id: string
          sender_role?: string
        }
        Update: {
          channel_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_metadata?: Json | null
          image_url?: string | null
          message_type?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_directives: {
        Row: {
          acknowledged_at: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          id: string
          instructions: string | null
          operator_id: string
          rider_id: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          id?: string
          instructions?: string | null
          operator_id: string
          rider_id: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          id?: string
          instructions?: string | null
          operator_id?: string
          rider_id?: string
          status?: string
        }
        Relationships: []
      }
      dm_channels: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          content: string | null
          created_at: string
          dm_channel_id: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          dm_channel_id: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          dm_channel_id?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_dm_channel_id_fkey"
            columns: ["dm_channel_id"]
            isOneToOne: false
            referencedRelation: "dm_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      network_members: {
        Row: {
          approved_at: string | null
          id: string
          joined_at: string
          network_id: string
          role: string
          status: string
          suspended_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          id?: string
          joined_at?: string
          network_id: string
          role?: string
          status?: string
          suspended_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          id?: string
          joined_at?: string
          network_id?: string
          role?: string
          status?: string
          suspended_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_members_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
      network_zones: {
        Row: {
          assigned_at: string
          id: string
          network_id: string
          zone_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          network_id: string
          zone_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          network_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_zones_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      networks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          license_doc_url: string | null
          logo_url: string | null
          max_seats: number
          name: string
          owner_id: string
          status: string
          subscription_fee: number
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          license_doc_url?: string | null
          logo_url?: string | null
          max_seats?: number
          name: string
          owner_id: string
          status?: string
          subscription_fee?: number
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          license_doc_url?: string | null
          logo_url?: string | null
          max_seats?: number
          name?: string
          owner_id?: string
          status?: string
          subscription_fee?: number
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operator_zones: {
        Row: {
          assigned_at: string
          id: string
          operator_id: string
          zone_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          operator_id: string
          zone_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          operator_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          is_banned: boolean
          phone: string | null
          status_text: string | null
          status_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          status_text?: string | null
          status_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          phone?: string | null
          status_text?: string | null
          status_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_id: string
          rater_id: string
          rating: number
          ride_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id: string
          rater_id: string
          rating: number
          ride_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id?: string
          rater_id?: string
          rating?: number
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_locations: {
        Row: {
          heading: number | null
          id: string
          is_online: boolean
          last_seen_at: string
          lat: number
          lng: number
          rider_id: string
          speed: number | null
          updated_at: string
        }
        Insert: {
          heading?: number | null
          id?: string
          is_online?: boolean
          last_seen_at?: string
          lat: number
          lng: number
          rider_id: string
          speed?: number | null
          updated_at?: string
        }
        Update: {
          heading?: number | null
          id?: string
          is_online?: boolean
          last_seen_at?: string
          lat?: number
          lng?: number
          rider_id?: string
          speed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rides: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          dispatcher_id: string | null
          distance_km: number | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          fare: number | null
          id: string
          network_id: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          rider_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          dispatcher_id?: string | null
          distance_km?: number | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          fare?: number | null
          id?: string
          network_id?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          dispatcher_id?: string | null
          distance_km?: number | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          fare?: number | null
          id?: string
          network_id?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          rider_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shoutouts: {
        Row: {
          assigned_to: string
          category: string
          created_at: string
          created_by: string
          id: string
          message: string | null
          title: string
        }
        Insert: {
          assigned_to: string
          category?: string
          created_at?: string
          created_by: string
          id?: string
          message?: string | null
          title: string
        }
        Update: {
          assigned_to?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          message?: string | null
          title?: string
        }
        Relationships: []
      }
      strikes: {
        Row: {
          created_at: string
          id: string
          issued_by: string
          network_id: string | null
          reason: string
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issued_by: string
          network_id?: string | null
          reason: string
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issued_by?: string
          network_id?: string | null
          reason?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strikes_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_verified: boolean | null
          make: string | null
          model: string | null
          plate_number: string
          rider_id: string
          vehicle_type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          make?: string | null
          model?: string | null
          plate_number: string
          rider_id: string
          vehicle_type?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          make?: string | null
          model?: string | null
          plate_number?: string
          rider_id?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          boundary: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          premium_fee: number
          slug: string
          updated_at: string
        }
        Insert: {
          boundary?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          premium_fee?: number
          slug: string
          updated_at?: string
        }
        Update: {
          boundary?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          premium_fee?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_ride: {
        Args: { _ride_id: string; _rider_id: string }
        Returns: boolean
      }
      admin_wallet_adjust: {
        Args: {
          _amount: number
          _category: string
          _description?: string
          _target_user_id: string
          _type: string
        }
        Returns: boolean
      }
      get_all_rider_rankings: { Args: never; Returns: Json }
      get_or_create_rider_channel: {
        Args: { _rider_id: string }
        Returns: string
      }
      get_rider_ranking: { Args: { _rider_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "rider" | "dispatcher" | "operator" | "admin"
      ride_status:
        | "requested"
        | "accepted"
        | "en_route"
        | "picked_up"
        | "completed"
        | "cancelled"
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
      app_role: ["customer", "rider", "dispatcher", "operator", "admin"],
      ride_status: [
        "requested",
        "accepted",
        "en_route",
        "picked_up",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
