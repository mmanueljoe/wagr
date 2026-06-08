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
      advance_requests: {
        Row: {
          created_at: string
          disbursed_at: string | null
          employee_id: string
          employer_id: string
          failure_reason: string | null
          fee_amount: number
          id: string
          moolre_external_ref: string
          moolre_transaction_id: string | null
          net_disbursed: number
          repaid_at: string | null
          requested_amount: number
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disbursed_at?: string | null
          employee_id: string
          employer_id: string
          failure_reason?: string | null
          fee_amount: number
          id?: string
          moolre_external_ref: string
          moolre_transaction_id?: string | null
          net_disbursed: number
          repaid_at?: string | null
          requested_amount: number
          requested_at?: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disbursed_at?: string | null
          employee_id?: string
          employer_id?: string
          failure_reason?: string | null
          fee_amount?: number
          id?: string
          moolre_external_ref?: string
          moolre_transaction_id?: string | null
          net_disbursed?: number
          repaid_at?: string | null
          requested_amount?: number
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          employee_id: string | null
          employer_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          employee_id?: string | null
          employer_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          employee_id?: string | null
          employer_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          credit_flag: boolean
          credit_flag_at: string | null
          credit_flag_reason: string | null
          employer_id: string
          full_name: string
          id: string
          is_active: boolean
          momo_number: string
          monthly_salary: number
          network: string
          start_date: string
          updated_at: string
          ussd_pin_hash: string | null
        }
        Insert: {
          created_at?: string
          credit_flag?: boolean
          credit_flag_at?: string | null
          credit_flag_reason?: string | null
          employer_id: string
          full_name: string
          id?: string
          is_active?: boolean
          momo_number: string
          monthly_salary: number
          network: string
          start_date: string
          updated_at?: string
          ussd_pin_hash?: string | null
        }
        Update: {
          created_at?: string
          credit_flag?: boolean
          credit_flag_at?: string | null
          credit_flag_reason?: string | null
          employer_id?: string
          full_name?: string
          id?: string
          is_active?: boolean
          momo_number?: string
          monthly_salary?: number
          network?: string
          start_date?: string
          updated_at?: string
          ussd_pin_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          company_name: string
          created_at: string
          email: string
          float_balance: number
          funding_model: string
          id: string
          industry: string
          pay_date: number
          phone: string
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          float_balance?: number
          funding_model: string
          id: string
          industry: string
          pay_date: number
          phone: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          float_balance?: number
          funding_model?: string
          id?: string
          industry?: string
          pay_date?: number
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      repayments: {
        Row: {
          advance_request_ids: string[]
          collected_at: string | null
          created_at: string
          employer_id: string
          failure_reason: string | null
          id: string
          initiated_at: string
          moolre_external_ref: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          advance_request_ids: string[]
          collected_at?: string | null
          created_at?: string
          employer_id: string
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          moolre_external_ref: string
          status: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          advance_request_ids?: string[]
          collected_at?: string | null
          created_at?: string
          employer_id?: string
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          moolre_external_ref?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repayments_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
