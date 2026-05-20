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
      assignments: {
        Row: {
          class_id: string
          created_at: string | null
          due_date: string | null
          id: string
          instructions: string | null
          interactive_html_url: string | null
          lesson_id: string | null
          minimum_word_count: number | null
          points: number
          published: boolean
          rubric_id: string | null
          title: string
          type: Database["public"]["Enums"]["assignment_type"]
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          interactive_html_url?: string | null
          lesson_id?: string | null
          minimum_word_count?: number | null
          points?: number
          published?: boolean
          rubric_id?: string | null
          title: string
          type: Database["public"]["Enums"]["assignment_type"]
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          interactive_html_url?: string | null
          lesson_id?: string | null
          minimum_word_count?: number | null
          points?: number
          published?: boolean
          rubric_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["assignment_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          category: string
          created_at: string
          end_date: string | null
          event_date: string
          id: string
          note: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          end_date?: string | null
          event_date: string
          id?: string
          note?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          end_date?: string | null
          event_date?: string
          id?: string
          note?: string | null
          title?: string
        }
        Relationships: []
      }
      class_schedule_templates: {
        Row: {
          class_id: string
          created_at: string | null
          di_end_time: string
          di_start_time: string
          followup_end_time: string
          followup_start_time: string
          id: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          di_end_time: string
          di_start_time: string
          followup_end_time: string
          followup_start_time: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          di_end_time?: string
          di_start_time?: string
          followup_end_time?: string
          followup_start_time?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_templates_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          period_number: number | null
          term: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          period_number?: number | null
          term: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          period_number?: number | null
          term?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_class_plans: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          di_slides_url: string | null
          di_topic: string | null
          followup_activity: string | null
          followup_async_work: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date: string
          di_slides_url?: string | null
          di_topic?: string | null
          followup_activity?: string | null
          followup_async_work?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          date?: string
          di_slides_url?: string | null
          di_topic?: string | null
          followup_activity?: string | null
          followup_async_work?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_class_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_boards: {
        Row: {
          assignment_id: string | null
          class_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_assignment: boolean
          is_locked: boolean
          is_pinned: boolean
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          class_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_assignment?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          class_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_assignment?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_boards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_boards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_posts: {
        Row: {
          attachments: Json
          board_id: string
          body: string
          created_at: string | null
          deleted_at: string | null
          deleted_reason: string | null
          flagged_at: string | null
          flagged_terms: string[] | null
          id: string
          is_pinned: boolean
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json
          board_id: string
          body: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          flagged_at?: string | null
          flagged_terms?: string[] | null
          id?: string
          is_pinned?: boolean
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json
          board_id?: string
          body?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          flagged_at?: string | null
          flagged_terms?: string[] | null
          id?: string
          is_pinned?: boolean
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_posts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "discussion_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          submission_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          submission_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_messages_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_terms: {
        Row: {
          created_at: string | null
          definition: string
          id: string
          related_terms: string[] | null
          term: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          definition: string
          id?: string
          related_terms?: string[] | null
          term: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          definition?: string
          id?: string
          related_terms?: string[] | null
          term?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          created_at: string | null
          feedback: string | null
          graded_at: string | null
          id: string
          rubric_scores: Json | null
          score: number
          submission_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          id?: string
          rubric_scores?: Json | null
          score: number
          submission_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          id?: string
          rubric_scores?: Json | null
          score?: number
          submission_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          body: string
          created_at: string | null
          highlight_range: Json | null
          id: string
          lesson_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          highlight_range?: Json | null
          id?: string
          lesson_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          highlight_range?: Json | null
          id?: string
          lesson_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          completion_required_for_next: boolean
          created_at: string | null
          html_url: string | null
          id: string
          order: number
          published: boolean
          title: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          completion_required_for_next?: boolean
          created_at?: string | null
          html_url?: string | null
          id?: string
          order?: number
          published?: boolean
          title: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          completion_required_for_next?: boolean
          created_at?: string | null
          html_url?: string | null
          id?: string
          order?: number
          published?: boolean
          title?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          type: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          type: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          emailed_at: string | null
          id: string
          payload: Json | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emailed_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emailed_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      period3_suggested_work: {
        Row: {
          created_at: string | null
          date: string
          id: string
          recommendations: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          recommendations?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          recommendations?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          added_by: string | null
          class_id: string | null
          created_at: string | null
          description: string | null
          file_path: string | null
          id: string
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string | null
          url: string | null
        }
        Insert: {
          added_by?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          tags?: string[] | null
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          added_by?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string | null
          criteria: Json
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criteria: Json
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criteria?: Json
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      school_calendar: {
        Row: {
          affects_grades_9_12: boolean
          created_at: string | null
          date: string
          day_type: Database["public"]["Enums"]["day_type"]
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          affects_grades_9_12?: boolean
          created_at?: string | null
          date: string
          day_type?: Database["public"]["Enums"]["day_type"]
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          affects_grades_9_12?: boolean
          created_at?: string | null
          date?: string
          day_type?: Database["public"]["Enums"]["day_type"]
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      slideshows: {
        Row: {
          assignment_ids: string[]
          async_note: string | null
          class_date: string
          created_at: string
          description: string | null
          html_url: string | null
          id: string
          lesson_ids: string[]
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_ids?: string[]
          async_note?: string | null
          class_date: string
          created_at?: string
          description?: string | null
          html_url?: string | null
          id?: string
          lesson_ids?: string[]
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_ids?: string[]
          async_note?: string | null
          class_date?: string
          created_at?: string
          description?: string | null
          html_url?: string | null
          id?: string
          lesson_ids?: string[]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      submission_events: {
        Row: {
          event_type: Database["public"]["Enums"]["submission_event_type"]
          id: string
          payload: Json | null
          submission_id: string
          timestamp: string | null
        }
        Insert: {
          event_type: Database["public"]["Enums"]["submission_event_type"]
          id?: string
          payload?: Json | null
          submission_id: string
          timestamp?: string | null
        }
        Update: {
          event_type?: Database["public"]["Enums"]["submission_event_type"]
          id?: string
          payload?: Json | null
          submission_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string | null
          id: string
          status: Database["public"]["Enums"]["submission_status"]
          structured_data: Json | null
          submitted_at: string | null
          updated_at: string | null
          uploaded_files: Json | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          structured_data?: Json | null
          submitted_at?: string | null
          updated_at?: string | null
          uploaded_files?: Json | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"]
          structured_data?: Json | null
          submitted_at?: string | null
          updated_at?: string | null
          uploaded_files?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          class_id: string | null
          created_at: string | null
          description: string | null
          id: string
          order: number
          published: boolean
          title: string
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order?: number
          published?: boolean
          title: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          order?: number
          published?: boolean
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email_notifications: boolean
          first_name: string
          id: string
          last_name: string
          real_email: string | null
          reduced_motion: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email_notifications?: boolean
          first_name: string
          id: string
          last_name: string
          real_email?: string | null
          reduced_motion?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email_notifications?: boolean
          first_name?: string
          id?: string
          last_name?: string
          real_email?: string | null
          reduced_motion?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      display_name: {
        Args: { u: Database["public"]["Tables"]["users"]["Row"] }
        Returns: string
      }
      is_student_in_class: { Args: { class_uuid: string }; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
    }
    Enums: {
      assignment_type:
        | "code"
        | "interactive_html"
        | "short_answer"
        | "discussion"
        | "unity_upload"
        | "check_in"
      day_type:
        | "regular"
        | "holiday"
        | "teacher_work_day"
        | "eld"
        | "async"
        | "f2f_no_class"
        | "testing"
        | "half_day"
        | "community_day"
        | "summer"
      resource_type: "link" | "file"
      submission_event_type: "paste" | "keystroke_batch" | "focus" | "blur"
      submission_status: "draft" | "submitted" | "graded"
      user_role: "teacher" | "student"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_type: [
        "code",
        "interactive_html",
        "short_answer",
        "discussion",
        "unity_upload",
        "check_in",
      ],
      day_type: [
        "regular",
        "holiday",
        "teacher_work_day",
        "eld",
        "async",
        "f2f_no_class",
        "testing",
        "half_day",
        "community_day",
        "summer",
      ],
      resource_type: ["link", "file"],
      submission_event_type: ["paste", "keystroke_batch", "focus", "blur"],
      submission_status: ["draft", "submitted", "graded"],
      user_role: ["teacher", "student"],
    },
  },
} as const
