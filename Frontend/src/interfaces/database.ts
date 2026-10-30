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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      books: {
        Row: {
          created_at: string
          current_page: number
          id: string
          subject: Database["public"]["Enums"]["subject"]
          title: string
          total_pages: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_page?: number
          id?: string
          subject: Database["public"]["Enums"]["subject"]
          title: string
          total_pages: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_page?: number
          id?: string
          subject?: Database["public"]["Enums"]["subject"]
          title?: string
          total_pages?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
          subject: Database["public"]["Enums"]["subject"] | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
          subject?: Database["public"]["Enums"]["subject"] | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
          subject?: Database["public"]["Enums"]["subject"] | null
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          book_id: string
          created_at: string
          end_page: number
          id: string
          start_page: number
          status: Database["public"]["Enums"]["task_status"]
          task_date: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          end_page: number
          id?: string
          start_page: number
          status?: Database["public"]["Enums"]["task_status"]
          task_date: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          end_page?: number
          id?: string
          start_page?: number
          status?: Database["public"]["Enums"]["task_status"]
          task_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["goal_kind"]
          subject: Database["public"]["Enums"]["subject"] | null
          target_score: number | null
          title: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["goal_kind"]
          subject?: Database["public"]["Enums"]["subject"] | null
          target_score?: number | null
          title: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["goal_kind"]
          subject?: Database["public"]["Enums"]["subject"] | null
          target_score?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      mock_exam_scores: {
        Row: {
          mock_exam_id: string
          score: number
          subject: Database["public"]["Enums"]["subject"]
          user_id: string
        }
        Insert: {
          mock_exam_id: string
          score: number
          subject: Database["public"]["Enums"]["subject"]
          user_id: string
        }
        Update: {
          mock_exam_id?: string
          score?: number
          subject?: Database["public"]["Enums"]["subject"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_exam_scores_mock_exam_id_fkey"
            columns: ["mock_exam_id"]
            isOneToOne: false
            referencedRelation: "mock_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_exams: {
        Row: {
          created_at: string
          id: string
          name: string
          taken_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          taken_on: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          taken_on?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          exam_date: string | null
          id: string
          notify_channel: Database["public"]["Enums"]["notify_channel"]
          notify_time: string
          target_total_score: number | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          exam_date?: string | null
          id: string
          notify_channel?: Database["public"]["Enums"]["notify_channel"]
          notify_time?: string
          target_total_score?: number | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          exam_date?: string | null
          id?: string
          notify_channel?: Database["public"]["Enums"]["notify_channel"]
          notify_time?: string
          target_total_score?: number | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          book_id: string | null
          created_at: string
          end_page: number | null
          id: string
          questions_solved: number | null
          questions_wrong: number | null
          source_message_id: string | null
          start_page: number | null
          study_date: string
          subject: Database["public"]["Enums"]["subject"]
          user_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          end_page?: number | null
          id?: string
          questions_solved?: number | null
          questions_wrong?: number | null
          source_message_id?: string | null
          start_page?: number | null
          study_date?: string
          subject: Database["public"]["Enums"]["subject"]
          user_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          end_page?: number | null
          id?: string
          questions_solved?: number | null
          questions_wrong?: number | null
          source_message_id?: string | null
          start_page?: number | null
          study_date?: string
          subject?: Database["public"]["Enums"]["subject"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_logs_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chat_role: "user" | "assistant"
      goal_kind: "final" | "short_term"
      notify_channel: "pwa" | "kakao"
      subject: "korean" | "english" | "public_health" | "health_admin"
      task_status: "pending" | "done" | "partial" | "skipped"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      chat_role: ["user", "assistant"],
      goal_kind: ["final", "short_term"],
      notify_channel: ["pwa", "kakao"],
      subject: ["korean", "english", "public_health", "health_admin"],
      task_status: ["pending", "done", "partial", "skipped"],
    },
  },
} as const
