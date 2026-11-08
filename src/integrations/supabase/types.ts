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
      canvas_objects: {
        Row: {
          author: string
          author_id: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          room_id: string
          user_id: string | null
        }
        Insert: {
          author: string
          author_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload: Json
          room_id: string
          user_id?: string | null
        }
        Update: {
          author?: string
          author_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_objects_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      close_votes: {
        Row: {
          agree: boolean
          created_at: string
          id: string
          room_id: string
          round: string
          user_id: string | null
          voter_id: string
          voter_name: string
        }
        Insert: {
          agree: boolean
          created_at?: string
          id?: string
          room_id: string
          round: string
          user_id?: string | null
          voter_id: string
          voter_name: string
        }
        Update: {
          agree?: boolean
          created_at?: string
          id?: string
          room_id?: string
          round?: string
          user_id?: string | null
          voter_id?: string
          voter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          room_id: string
          user_id: string | null
        }
        Insert: {
          author: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          room_id: string
          user_id?: string | null
        }
        Update: {
          author?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_knocks: {
        Row: {
          created_at: string
          id: string
          room_id: string
          status: string
          updated_at: string
          user_id: string | null
          visitor_color: string
          visitor_id: string
          visitor_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_color: string
          visitor_id: string
          visitor_name: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          visitor_color?: string
          visitor_id?: string
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_knocks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          admitted: boolean
          color: string
          created_at: string
          display_name: string
          id: string
          last_seen_at: string
          muted: boolean
          room_id: string
          updated_at: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          admitted?: boolean
          color: string
          created_at?: string
          display_name: string
          id?: string
          last_seen_at?: string
          muted?: boolean
          room_id: string
          updated_at?: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          admitted?: boolean
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          last_seen_at?: string
          muted?: boolean
          room_id?: string
          updated_at?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          board_theme: string
          close_round: string | null
          created_at: string
          expires_at: string
          grid_mode: string
          id: string
          is_closed: boolean
          is_locked: boolean
          shred_execute_at: string | null
          shred_round: string | null
        }
        Insert: {
          board_theme?: string
          close_round?: string | null
          created_at?: string
          expires_at?: string
          grid_mode?: string
          id: string
          is_closed?: boolean
          is_locked?: boolean
          shred_execute_at?: string | null
          shred_round?: string | null
        }
        Update: {
          board_theme?: string
          close_round?: string | null
          created_at?: string
          expires_at?: string
          grid_mode?: string
          id?: string
          is_closed?: boolean
          is_locked?: boolean
          shred_execute_at?: string | null
          shred_round?: string | null
        }
        Relationships: []
      }
      shred_votes: {
        Row: {
          agree: boolean
          created_at: string
          id: string
          room_id: string
          round: string
          user_id: string | null
          voter_id: string
          voter_name: string
        }
        Insert: {
          agree: boolean
          created_at?: string
          id?: string
          room_id: string
          round: string
          user_id?: string | null
          voter_id: string
          voter_name: string
        }
        Update: {
          agree?: boolean
          created_at?: string
          id?: string
          room_id?: string
          round?: string
          user_id?: string | null
          voter_id?: string
          voter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shred_votes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      answer_room_knock: {
        Args: { _admit: boolean; _room_id: string; _user_id: string }
        Returns: undefined
      }
      cancel_room_shred: {
        Args: { _room_id: string; _round: string }
        Returns: undefined
      }
      cleanup_expired_napkins: { Args: never; Returns: undefined }
      close_napkin: {
        Args: { _room_id: string; _round: string }
        Returns: boolean
      }
      create_napkin: {
        Args: { _color: string; _name: string; _room_id: string }
        Returns: {
          board_theme: string
          close_round: string | null
          created_at: string
          expires_at: string
          grid_mode: string
          id: string
          is_closed: boolean
          is_locked: boolean
          shred_execute_at: string | null
          shred_round: string | null
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enter_napkin: {
        Args: { _color: string; _name: string; _room_id: string }
        Returns: {
          admitted: boolean
          board_theme: string
          close_round: string
          expires_at: string
          id: string
          is_closed: boolean
          is_locked: boolean
          shred_round: string
        }[]
      }
      execute_room_shred: {
        Args: { _room_id: string; _round: string }
        Returns: boolean
      }
      heartbeat_member: { Args: { _room_id: string }; Returns: undefined }
      is_admitted: { Args: { _room_id: string }; Returns: boolean }
      schedule_room_shred: {
        Args: { _room_id: string; _round: string }
        Returns: string
      }
      set_member_muted: {
        Args: { _muted: boolean; _room_id: string; _user_id: string }
        Returns: undefined
      }
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
