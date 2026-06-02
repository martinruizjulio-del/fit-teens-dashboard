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
      alumnos: {
        Row: {
          apellidos: string
          biacromial_15_cm: number | null
          biacromial_cm: number | null
          codigo_acceso: string
          created_at: string
          envergadura_cm: number | null
          extraescolar: boolean
          fecha_nacimiento: string
          grupo_id: string
          horas_extraescolar: number | null
          id: string
          id_aula: number
          imc: number | null
          is_demo: boolean
          longitud_pierna_cm: number | null
          nombre: string
          peso_kg: number | null
          sexo: Database["public"]["Enums"]["sexo_enum"]
          talla_m: number | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          biacromial_15_cm?: number | null
          biacromial_cm?: number | null
          codigo_acceso?: string
          created_at?: string
          envergadura_cm?: number | null
          extraescolar?: boolean
          fecha_nacimiento: string
          grupo_id: string
          horas_extraescolar?: number | null
          id?: string
          id_aula: number
          imc?: number | null
          is_demo?: boolean
          longitud_pierna_cm?: number | null
          nombre: string
          peso_kg?: number | null
          sexo: Database["public"]["Enums"]["sexo_enum"]
          talla_m?: number | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          biacromial_15_cm?: number | null
          biacromial_cm?: number | null
          codigo_acceso?: string
          created_at?: string
          envergadura_cm?: number | null
          extraescolar?: boolean
          fecha_nacimiento?: string
          grupo_id?: string
          horas_extraescolar?: number | null
          id?: string
          id_aula?: number
          imc?: number | null
          is_demo?: boolean
          longitud_pierna_cm?: number | null
          nombre?: string
          peso_kg?: number | null
          sexo?: Database["public"]["Enums"]["sexo_enum"]
          talla_m?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      baremos: {
        Row: {
          bateria: string
          created_at: string
          edad_max: number
          edad_min: number
          higher_better: boolean
          id: string
          nota: number
          prueba: string
          sexo: Database["public"]["Enums"]["sexo_enum"]
          updated_at: string
          valor_max: number | null
          valor_min: number | null
        }
        Insert: {
          bateria: string
          created_at?: string
          edad_max: number
          edad_min: number
          higher_better?: boolean
          id?: string
          nota: number
          prueba: string
          sexo: Database["public"]["Enums"]["sexo_enum"]
          updated_at?: string
          valor_max?: number | null
          valor_min?: number | null
        }
        Update: {
          bateria?: string
          created_at?: string
          edad_max?: number
          edad_min?: number
          higher_better?: boolean
          id?: string
          nota?: number
          prueba?: string
          sexo?: Database["public"]["Enums"]["sexo_enum"]
          updated_at?: string
          valor_max?: number | null
          valor_min?: number | null
        }
        Relationships: []
      }
      centros: {
        Row: {
          anonimo: boolean
          ciudad: string | null
          codigo_anonimo: string | null
          codigo_postal: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          email: string | null
          id: string
          is_demo: boolean
          mostrar_publico: boolean
          nombre: string
          provincia: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          anonimo?: boolean
          ciudad?: string | null
          codigo_anonimo?: string | null
          codigo_postal?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean
          mostrar_publico?: boolean
          nombre: string
          provincia: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          anonimo?: boolean
          ciudad?: string | null
          codigo_anonimo?: string | null
          codigo_postal?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean
          mostrar_publico?: boolean
          nombre?: string
          provincia?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      config_publica: {
        Row: {
          autores: string
          id: string
          idioma_default: string
          manual_uso_md: string
          mostrar_antropometria: boolean
          mostrar_cfs: boolean
          mostrar_eurofit: boolean
          mostrar_por_curso: boolean
          mostrar_por_sexo: boolean
          politica_privacidad_md: string
          updated_at: string
          video_manual_url: string | null
        }
        Insert: {
          autores?: string
          id?: string
          idioma_default?: string
          manual_uso_md?: string
          mostrar_antropometria?: boolean
          mostrar_cfs?: boolean
          mostrar_eurofit?: boolean
          mostrar_por_curso?: boolean
          mostrar_por_sexo?: boolean
          politica_privacidad_md?: string
          updated_at?: string
          video_manual_url?: string | null
        }
        Update: {
          autores?: string
          id?: string
          idioma_default?: string
          manual_uso_md?: string
          mostrar_antropometria?: boolean
          mostrar_cfs?: boolean
          mostrar_eurofit?: boolean
          mostrar_por_curso?: boolean
          mostrar_por_sexo?: boolean
          politica_privacidad_md?: string
          updated_at?: string
          video_manual_url?: string | null
        }
        Relationships: []
      }
      consentimientos: {
        Row: {
          aceptado: boolean
          created_at: string
          id: string
          ip: string | null
          tipo: string
          user_id: string
          version: string
        }
        Insert: {
          aceptado?: boolean
          created_at?: string
          id?: string
          ip?: string | null
          tipo: string
          user_id: string
          version?: string
        }
        Update: {
          aceptado?: boolean
          created_at?: string
          id?: string
          ip?: string | null
          tipo?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      grupos: {
        Row: {
          anio_escolar: string
          bateria_personalizada: Json | null
          centro_id: string
          created_at: string
          curso: Database["public"]["Enums"]["curso_enum"]
          id: string
          is_demo: boolean
          letra: string
          profesor_id: string
          updated_at: string
        }
        Insert: {
          anio_escolar: string
          bateria_personalizada?: Json | null
          centro_id: string
          created_at?: string
          curso: Database["public"]["Enums"]["curso_enum"]
          id?: string
          is_demo?: boolean
          letra: string
          profesor_id: string
          updated_at?: string
        }
        Update: {
          anio_escolar?: string
          bateria_personalizada?: Json | null
          centro_id?: string
          created_at?: string
          curso?: Database["public"]["Enums"]["curso_enum"]
          id?: string
          is_demo?: boolean
          letra?: string
          profesor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimientos: {
        Row: {
          baremo_descripcion_md: string | null
          bateria: string
          created_at: string
          id: string
          idioma: string
          procedimiento_md: string
          prueba: string
          referencia_apa: string
          updated_at: string
        }
        Insert: {
          baremo_descripcion_md?: string | null
          bateria: string
          created_at?: string
          id?: string
          idioma?: string
          procedimiento_md: string
          prueba: string
          referencia_apa: string
          updated_at?: string
        }
        Update: {
          baremo_descripcion_md?: string | null
          bateria?: string
          created_at?: string
          id?: string
          idioma?: string
          procedimiento_md?: string
          prueba?: string
          referencia_apa?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pruebas_cfs: {
        Row: {
          alumno_id: string
          biering_sorensen_seg: number | null
          cmj_cm: number | null
          created_at: string
          fecha: string
          id: string
          indice_elastico: number | null
          is_demo: boolean
          lanz_med_der_m: number | null
          lanz_med_izq_m: number | null
          omni_biering: number | null
          omni_lanz: number | null
          omni_rockport: number | null
          omni_saltos: number | null
          omni_sprint: number | null
          omni_thomas: number | null
          rockport_fc: number | null
          rockport_min: number | null
          rockport_seg: number | null
          rockport_vo2: number | null
          sj_cm: number | null
          sprint_30_seg: number | null
          thomas: number | null
          updated_at: string
        }
        Insert: {
          alumno_id: string
          biering_sorensen_seg?: number | null
          cmj_cm?: number | null
          created_at?: string
          fecha?: string
          id?: string
          indice_elastico?: number | null
          is_demo?: boolean
          lanz_med_der_m?: number | null
          lanz_med_izq_m?: number | null
          omni_biering?: number | null
          omni_lanz?: number | null
          omni_rockport?: number | null
          omni_saltos?: number | null
          omni_sprint?: number | null
          omni_thomas?: number | null
          rockport_fc?: number | null
          rockport_min?: number | null
          rockport_seg?: number | null
          rockport_vo2?: number | null
          sj_cm?: number | null
          sprint_30_seg?: number | null
          thomas?: number | null
          updated_at?: string
        }
        Update: {
          alumno_id?: string
          biering_sorensen_seg?: number | null
          cmj_cm?: number | null
          created_at?: string
          fecha?: string
          id?: string
          indice_elastico?: number | null
          is_demo?: boolean
          lanz_med_der_m?: number | null
          lanz_med_izq_m?: number | null
          omni_biering?: number | null
          omni_lanz?: number | null
          omni_rockport?: number | null
          omni_saltos?: number | null
          omni_sprint?: number | null
          omni_thomas?: number | null
          rockport_fc?: number | null
          rockport_min?: number | null
          rockport_seg?: number | null
          rockport_vo2?: number | null
          sj_cm?: number | null
          sprint_30_seg?: number | null
          thomas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pruebas_cfs_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: true
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
        ]
      }
      pruebas_eurofit: {
        Row: {
          abdominales_60: number | null
          alumno_id: string
          cooper_m: number | null
          created_at: string
          fecha: string
          id: string
          is_demo: boolean
          lanz_hombros_m: number | null
          omni_abdominales: number | null
          omni_cooper: number | null
          omni_lanz: number | null
          omni_salto: number | null
          omni_sprint: number | null
          omni_wells: number | null
          salto_vertical_cm: number | null
          sprint_50_seg: number | null
          updated_at: string
          wells_cm: number | null
        }
        Insert: {
          abdominales_60?: number | null
          alumno_id: string
          cooper_m?: number | null
          created_at?: string
          fecha?: string
          id?: string
          is_demo?: boolean
          lanz_hombros_m?: number | null
          omni_abdominales?: number | null
          omni_cooper?: number | null
          omni_lanz?: number | null
          omni_salto?: number | null
          omni_sprint?: number | null
          omni_wells?: number | null
          salto_vertical_cm?: number | null
          sprint_50_seg?: number | null
          updated_at?: string
          wells_cm?: number | null
        }
        Update: {
          abdominales_60?: number | null
          alumno_id?: string
          cooper_m?: number | null
          created_at?: string
          fecha?: string
          id?: string
          is_demo?: boolean
          lanz_hombros_m?: number | null
          omni_abdominales?: number | null
          omni_cooper?: number | null
          omni_lanz?: number | null
          omni_salto?: number | null
          omni_sprint?: number | null
          omni_wells?: number | null
          salto_vertical_cm?: number | null
          sprint_50_seg?: number | null
          updated_at?: string
          wells_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pruebas_eurofit_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: true
            referencedRelation: "alumnos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_implantacion: {
        Row: {
          centro_nombre: string
          ciudad: string | null
          created_at: string
          email_solicitante: string
          estado: string
          id: string
          mensaje: string | null
          nombre_solicitante: string
          notas_admin: string | null
          provincia: string | null
          updated_at: string
        }
        Insert: {
          centro_nombre: string
          ciudad?: string | null
          created_at?: string
          email_solicitante: string
          estado?: string
          id?: string
          mensaje?: string | null
          nombre_solicitante: string
          notas_admin?: string | null
          provincia?: string | null
          updated_at?: string
        }
        Update: {
          centro_nombre?: string
          ciudad?: string | null
          created_at?: string
          email_solicitante?: string
          estado?: string
          id?: string
          mensaje?: string | null
          nombre_solicitante?: string
          notas_admin?: string | null
          provincia?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_borrar_demo: { Args: never; Returns: string }
      admin_seed_demo: { Args: never; Returns: string }
      borrar_demo: { Args: never; Returns: string }
      calcular_nota: {
        Args: {
          _bateria: string
          _edad: number
          _prueba: string
          _sexo: Database["public"]["Enums"]["sexo_enum"]
          _valor: number
        }
        Returns: number
      }
      get_alumno_by_codigo: { Args: { _codigo: string }; Returns: Json }
      get_stats_publicas: { Args: never; Returns: Json }
      get_stats_publicas_filtradas: {
        Args: { _curso?: string; _sexo?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      seed_demo_alumnos: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "teacher"
      curso_enum: "1ESO" | "2ESO" | "3ESO" | "4ESO"
      sexo_enum: "M" | "F"
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
      app_role: ["admin", "teacher"],
      curso_enum: ["1ESO", "2ESO", "3ESO", "4ESO"],
      sexo_enum: ["M", "F"],
    },
  },
} as const
