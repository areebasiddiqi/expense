export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          domain: string | null
          is_active: boolean
          microsoft_tenant_id: string | null
          is_microsoft_connected: boolean
          microsoft_sync_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          is_active?: boolean
          microsoft_tenant_id?: string | null
          is_microsoft_connected?: boolean
          microsoft_sync_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          is_active?: boolean
          microsoft_tenant_id?: string | null
          is_microsoft_connected?: boolean
          microsoft_sync_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'staff' | 'admin'
          vehicle_type: 'standard' | 'electric_home' | 'electric_commercial'
          organization_id: string | null
          microsoft_user_id: string | null
          sync_source: 'local' | 'microsoft' | 'both'
          last_synced_at: string | null
          azure_upn: string | null
          is_synced_user: boolean
          department: string | null
          job_title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'staff' | 'admin'
          vehicle_type?: 'standard' | 'electric_home' | 'electric_commercial'
          organization_id?: string | null
          microsoft_user_id?: string | null
          sync_source?: 'local' | 'microsoft' | 'both'
          last_synced_at?: string | null
          azure_upn?: string | null
          is_synced_user?: boolean
          department?: string | null
          job_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'staff' | 'admin'
          vehicle_type?: 'standard' | 'electric_home' | 'electric_commercial'
          organization_id?: string | null
          microsoft_user_id?: string | null
          sync_source?: 'local' | 'microsoft' | 'both'
          last_synced_at?: string | null
          azure_upn?: string | null
          is_synced_user?: boolean
          department?: string | null
          job_title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          xero_account_code: string | null
          description: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          xero_account_code?: string | null
          description?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          xero_account_code?: string | null
          description?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      mileage_rates: {
        Row: {
          id: string
          vehicle_type: 'standard' | 'electric_home' | 'electric_commercial'
          rate_per_mile: number
          effective_from: string
          effective_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_type: 'standard' | 'electric_home' | 'electric_commercial'
          rate_per_mile: number
          effective_from?: string
          effective_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_type?: 'standard' | 'electric_home' | 'electric_commercial'
          rate_per_mile?: number
          effective_from?: string
          effective_to?: string | null
          created_at?: string
        }
      }
      approvers: {
        Row: {
          id: string
          user_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          is_active?: boolean
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string
          amount: number
          expense_date: string
          receipt_url: string | null
          notes: string
          status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          submitted_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          review_notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string
          amount: number
          expense_date: string
          receipt_url?: string | null
          notes?: string
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string
          amount?: number
          expense_date?: string
          receipt_url?: string | null
          notes?: string
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
          submitted_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          review_notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      mileage_expenses: {
        Row: {
          id: string
          expense_id: string
          start_location: string
          end_location: string
          distance_miles: number
          vehicle_type: 'standard' | 'electric_home' | 'electric_commercial'
          rate_applied: number
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          start_location: string
          end_location: string
          distance_miles: number
          vehicle_type: 'standard' | 'electric_home' | 'electric_commercial'
          rate_applied: number
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          start_location?: string
          end_location?: string
          distance_miles?: number
          vehicle_type?: 'standard' | 'electric_home' | 'electric_commercial'
          rate_applied?: number
          created_at?: string
        }
      }
      xero_settings: {
        Row: {
          id: string
          client_id: string
          client_secret: string
          tenant_id: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          is_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string
          client_secret?: string
          tenant_id?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          client_secret?: string
          tenant_id?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      microsoft_tenant_config: {
        Row: {
          id: string
          organization_id: string
          tenant_id: string
          client_id: string
          client_secret: string
          refresh_token: string | null
          access_token: string | null
          token_expires_at: string | null
          last_sync_at: string | null
          sync_status: 'active' | 'failed' | 'disabled'
          sync_frequency_minutes: number
          group_filter: Json | null
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          tenant_id: string
          client_id: string
          client_secret: string
          refresh_token?: string | null
          access_token?: string | null
          token_expires_at?: string | null
          last_sync_at?: string | null
          sync_status?: 'active' | 'failed' | 'disabled'
          sync_frequency_minutes?: number
          group_filter?: Json | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          tenant_id?: string
          client_id?: string
          client_secret?: string
          refresh_token?: string | null
          access_token?: string | null
          token_expires_at?: string | null
          last_sync_at?: string | null
          sync_status?: 'active' | 'failed' | 'disabled'
          sync_frequency_minutes?: number
          group_filter?: Json | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_sync_log: {
        Row: {
          id: string
          organization_id: string
          sync_type: 'full' | 'incremental' | 'manual'
          users_created: number
          users_updated: number
          users_deactivated: number
          errors: Json | null
          started_at: string
          completed_at: string | null
          status: 'running' | 'success' | 'failed' | 'partial'
          details: Json | null
        }
        Insert: {
          id?: string
          organization_id: string
          sync_type: 'full' | 'incremental' | 'manual'
          users_created?: number
          users_updated?: number
          users_deactivated?: number
          errors?: Json | null
          started_at?: string
          completed_at?: string | null
          status: 'running' | 'success' | 'failed' | 'partial'
          details?: Json | null
        }
        Update: {
          id?: string
          organization_id?: string
          sync_type?: 'full' | 'incremental' | 'manual'
          users_created?: number
          users_updated?: number
          users_deactivated?: number
          errors?: Json | null
          started_at?: string
          completed_at?: string | null
          status?: 'running' | 'success' | 'failed' | 'partial'
          details?: Json | null
        }
      }
      azure_group_mappings: {
        Row: {
          id: string
          organization_id: string
          azure_group_id: string
          azure_group_name: string
          application_role: 'staff' | 'admin' | 'approver'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          azure_group_id: string
          azure_group_name: string
          application_role: 'staff' | 'admin' | 'approver'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          azure_group_id?: string
          azure_group_name?: string
          application_role?: 'staff' | 'admin' | 'approver'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
