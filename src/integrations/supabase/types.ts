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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      acs_data: {
        Row: {
          date: string | null
          id: number
          image_url: string | null
          parent_id: number | null
          price: number | null
          product_title: string | null
          product_url: string | null
          quantity: number | null
          variant_id: number | null
        }
        Insert: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Update: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          brand: string | null
          cbm_url: string | null
          id: number
          make: string
          model: string | null
          OE_Reference: string | null
          product_photos: string[] | null
          source_partnumber: string | null
          source_url: string | null
          vendorcode: string | null
          year_range: string | null
        }
        Insert: {
          brand?: string | null
          cbm_url?: string | null
          id?: number
          make: string
          model?: string | null
          OE_Reference?: string | null
          product_photos?: string[] | null
          source_partnumber?: string | null
          source_url?: string | null
          vendorcode?: string | null
          year_range?: string | null
        }
        Update: {
          brand?: string | null
          cbm_url?: string | null
          id?: number
          make?: string
          model?: string | null
          OE_Reference?: string | null
          product_photos?: string[] | null
          source_partnumber?: string | null
          source_url?: string | null
          vendorcode?: string | null
          year_range?: string | null
        }
        Relationships: []
      }
      applications_backup: {
        Row: {
          brand: string | null
          cbm_url: string | null
          id: number
          make: string
          model: string | null
          OE_Reference: string | null
          product_photos: string[] | null
          source_partnumber: string | null
          source_url: string | null
          vendorcode: string | null
          year_range: string | null
        }
        Insert: {
          brand?: string | null
          cbm_url?: string | null
          id?: number
          make: string
          model?: string | null
          OE_Reference?: string | null
          product_photos?: string[] | null
          source_partnumber?: string | null
          source_url?: string | null
          vendorcode?: string | null
          year_range?: string | null
        }
        Update: {
          brand?: string | null
          cbm_url?: string | null
          id?: number
          make?: string
          model?: string | null
          OE_Reference?: string | null
          product_photos?: string[] | null
          source_partnumber?: string | null
          source_url?: string | null
          vendorcode?: string | null
          year_range?: string | null
        }
        Relationships: []
      }
      applications_duplicate: {
        Row: {
          brand: string | null
          cbm_url: string | null
          id: number
          make: string
          model: string | null
          OE_Reference: string | null
          product_photos: string[] | null
          source_partnumber: string | null
          source_url: string | null
          vendorcode: string | null
          year_range: string | null
        }
        Insert: {
          brand?: string | null
          cbm_url?: string | null
          id?: number
          make: string
          model?: string | null
          OE_Reference?: string | null
          product_photos?: string[] | null
          source_partnumber?: string | null
          source_url?: string | null
          vendorcode?: string | null
          year_range?: string | null
        }
        Update: {
          brand?: string | null
          cbm_url?: string | null
          id?: number
          make?: string
          model?: string | null
          OE_Reference?: string | null
          product_photos?: string[] | null
          source_partnumber?: string | null
          source_url?: string | null
          vendorcode?: string | null
          year_range?: string | null
        }
        Relationships: []
      }
      erestore_data: {
        Row: {
          date: string | null
          id: number
          image_url: string | null
          parent_id: number | null
          price: number | null
          product_title: string | null
          product_url: string | null
          quantity: number | null
          variant_id: number | null
        }
        Insert: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Update: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Relationships: []
      }
      facebookads: {
        Row: {
          ad_format: string | null
          ad_text: string | null
          archive_id: string | null
          caption: string | null
          cta_text: string | null
          end_date: string | null
          id: number
          image_url: string | null
          library_url: string | null
          link_description: string | null
          link_url: string | null
          page_name: string | null
          publisher_platforms: string[] | null
          start_date: string | null
          title: string | null
        }
        Insert: {
          ad_format?: string | null
          ad_text?: string | null
          archive_id?: string | null
          caption?: string | null
          cta_text?: string | null
          end_date?: string | null
          id?: number
          image_url?: string | null
          library_url?: string | null
          link_description?: string | null
          link_url?: string | null
          page_name?: string | null
          publisher_platforms?: string[] | null
          start_date?: string | null
          title?: string | null
        }
        Update: {
          ad_format?: string | null
          ad_text?: string | null
          archive_id?: string | null
          caption?: string | null
          cta_text?: string | null
          end_date?: string | null
          id?: number
          image_url?: string | null
          library_url?: string | null
          link_description?: string | null
          link_url?: string | null
          page_name?: string | null
          publisher_platforms?: string[] | null
          start_date?: string | null
          title?: string | null
        }
        Relationships: []
      }
      facebookads_summary: {
        Row: {
          id: number
        }
        Insert: {
          id?: number
        }
        Update: {
          id?: number
        }
        Relationships: []
      }
      fbgroup_keywords: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      fbgroup_posts: {
        Row: {
          author: string | null
          commentcount: number | null
          created_at: string
          dateposted: string | null
          firstcomment: string | null
          flagged: boolean | null
          groupurl: string | null
          id: number
          imageurl: string | null
          keyword_matches: string[] | null
          postid: string | null
          reactioncount: number | null
          text: string | null
          url: string | null
        }
        Insert: {
          author?: string | null
          commentcount?: number | null
          created_at?: string
          dateposted?: string | null
          firstcomment?: string | null
          flagged?: boolean | null
          groupurl?: string | null
          id?: number
          imageurl?: string | null
          keyword_matches?: string[] | null
          postid?: string | null
          reactioncount?: number | null
          text?: string | null
          url?: string | null
        }
        Update: {
          author?: string | null
          commentcount?: number | null
          created_at?: string
          dateposted?: string | null
          firstcomment?: string | null
          flagged?: boolean | null
          groupurl?: string | null
          id?: number
          imageurl?: string | null
          keyword_matches?: string[] | null
          postid?: string | null
          reactioncount?: number | null
          text?: string | null
          url?: string | null
        }
        Relationships: []
      }
      fbgroups: {
        Row: {
          created_at: string
          description: string | null
          id: number
          keywords: string[] | null
          name: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          keywords?: string[] | null
          name?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          keywords?: string[] | null
          name?: string | null
          url?: string | null
        }
        Relationships: []
      }
      goecm_data: {
        Row: {
          date: string | null
          id: number
          image_url: string | null
          parent_id: number | null
          price: number | null
          product_title: string | null
          product_url: string | null
          quantity: number | null
          variant_id: number | null
        }
        Insert: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Update: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Relationships: []
      }
      googleads: {
        Row: {
          adurl: string | null
          advertisername: string | null
          creativeid: string | null
          date_of_record: string | null
          daysshown: number | null
          domain: string | null
          firstshown: string | null
          format: string | null
          lastshown: string | null
          totalads: number | null
        }
        Insert: {
          adurl?: string | null
          advertisername?: string | null
          creativeid?: string | null
          date_of_record?: string | null
          daysshown?: number | null
          domain?: string | null
          firstshown?: string | null
          format?: string | null
          lastshown?: string | null
          totalads?: number | null
        }
        Update: {
          adurl?: string | null
          advertisername?: string | null
          creativeid?: string | null
          date_of_record?: string | null
          daysshown?: number | null
          domain?: string | null
          firstshown?: string | null
          format?: string | null
          lastshown?: string | null
          totalads?: number | null
        }
        Relationships: []
      }
      googleads_summary: {
        Row: {
          advertiser: string | null
          advertiserid: string | null
          averagedaysshown: number | null
          created_180: number | null
          created_30: number | null
          created_365: number | null
          created_7: number | null
          created_90: number | null
          created_overyear: number | null
          date: string | null
          imageads: number | null
          lastshowntoday: number | null
          primary_key: string
          textads: number | null
          totalads: number | null
          videoads: number | null
        }
        Insert: {
          advertiser?: string | null
          advertiserid?: string | null
          averagedaysshown?: number | null
          created_180?: number | null
          created_30?: number | null
          created_365?: number | null
          created_7?: number | null
          created_90?: number | null
          created_overyear?: number | null
          date?: string | null
          imageads?: number | null
          lastshowntoday?: number | null
          primary_key?: string
          textads?: number | null
          totalads?: number | null
          videoads?: number | null
        }
        Update: {
          advertiser?: string | null
          advertiserid?: string | null
          averagedaysshown?: number | null
          created_180?: number | null
          created_30?: number | null
          created_365?: number | null
          created_7?: number | null
          created_90?: number | null
          created_overyear?: number | null
          date?: string | null
          imageads?: number | null
          lastshowntoday?: number | null
          primary_key?: string
          textads?: number | null
          totalads?: number | null
          videoads?: number | null
        }
        Relationships: []
      }
      iss_data: {
        Row: {
          date: string | null
          id: number
          image_url: string | null
          parent_id: number | null
          price: number | null
          product_title: string | null
          product_url: string | null
          quantity: number | null
          variant_id: number | null
        }
        Insert: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Update: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Relationships: []
      }
      keyword_research: {
        Row: {
          id: number
          keyword: string | null
          monthfive: number | null
          monthfour: number | null
          monthone: number | null
          monthsix: number | null
          monththree: number | null
          monthtwo: number | null
          year_total: number | null
        }
        Insert: {
          id?: number
          keyword?: string | null
          monthfive?: number | null
          monthfour?: number | null
          monthone?: number | null
          monthsix?: number | null
          monththree?: number | null
          monthtwo?: number | null
          year_total?: number | null
        }
        Update: {
          id?: number
          keyword?: string | null
          monthfive?: number | null
          monthfour?: number | null
          monthone?: number | null
          monthsix?: number | null
          monththree?: number | null
          monthtwo?: number | null
          year_total?: number | null
        }
        Relationships: []
      }
      marketing_tags: {
        Row: {
          action_item: string | null
          competitor: string | null
          created_at: string
          display_order: number | null
          id: number
          name: string | null
          note: string | null
          product_name: string | null
          product_url: string | null
          sales_data: string | null
        }
        Insert: {
          action_item?: string | null
          competitor?: string | null
          created_at?: string
          display_order?: number | null
          id?: number
          name?: string | null
          note?: string | null
          product_name?: string | null
          product_url?: string | null
          sales_data?: string | null
        }
        Update: {
          action_item?: string | null
          competitor?: string | null
          created_at?: string
          display_order?: number | null
          id?: number
          name?: string | null
          note?: string | null
          product_name?: string | null
          product_url?: string | null
          sales_data?: string | null
        }
        Relationships: []
      }
      np_tags: {
        Row: {
          action_item: string | null
          competitor: string | null
          created_at: string
          display_order: number | null
          id: number
          name: string | null
          note: string | null
          product_name: string | null
          product_url: string | null
          sales_data: string | null
        }
        Insert: {
          action_item?: string | null
          competitor?: string | null
          created_at?: string
          display_order?: number | null
          id?: number
          name?: string | null
          note?: string | null
          product_name?: string | null
          product_url?: string | null
          sales_data?: string | null
        }
        Update: {
          action_item?: string | null
          competitor?: string | null
          created_at?: string
          display_order?: number | null
          id?: number
          name?: string | null
          note?: string | null
          product_name?: string | null
          product_url?: string | null
          sales_data?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cost: number | null
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      redditkeywords: {
        Row: {
          created_at: string
          description: string | null
          id: number
          keyword: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          keyword?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          keyword?: string | null
        }
        Relationships: []
      }
      redditposts: {
        Row: {
          author: string | null
          created_at: string
          downvotes: number | null
          id: number
          keywords: string[] | null
          num_comments: number | null
          postdate: string | null
          postid: string
          subreddit: string | null
          subreddit_subs: number | null
          text: string | null
          title: string | null
          upvotes: number | null
          url: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string
          downvotes?: number | null
          id?: number
          keywords?: string[] | null
          num_comments?: number | null
          postdate?: string | null
          postid: string
          subreddit?: string | null
          subreddit_subs?: number | null
          text?: string | null
          title?: string | null
          upvotes?: number | null
          url?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string
          downvotes?: number | null
          id?: number
          keywords?: string[] | null
          num_comments?: number | null
          postdate?: string | null
          postid?: string
          subreddit?: string | null
          subreddit_subs?: number | null
          text?: string | null
          title?: string | null
          upvotes?: number | null
          url?: string | null
        }
        Relationships: []
      }
      timeline_tags: {
        Row: {
          chart_type: string | null
          competitor_name: string | null
          date_added: string | null
          id: number
          marker_date: string
          note: string | null
          person: string | null
          product_id: number | null
        }
        Insert: {
          chart_type?: string | null
          competitor_name?: string | null
          date_added?: string | null
          id?: number
          marker_date: string
          note?: string | null
          person?: string | null
          product_id?: number | null
        }
        Update: {
          chart_type?: string | null
          competitor_name?: string | null
          date_added?: string | null
          id?: number
          marker_date?: string
          note?: string | null
          person?: string | null
          product_id?: number | null
        }
        Relationships: []
      }
      upfix_data: {
        Row: {
          date: string | null
          id: number
          image_url: string | null
          parent_id: number | null
          price: number | null
          product_title: string | null
          product_url: string | null
          quantity: number | null
          variant_id: number | null
        }
        Insert: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Update: {
          date?: string | null
          id?: number
          image_url?: string | null
          parent_id?: number | null
          price?: number | null
          product_title?: string | null
          product_url?: string | null
          quantity?: number | null
          variant_id?: number | null
        }
        Relationships: []
      }
      user_knowledge_base: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      youtube_channels: {
        Row: {
          channel_url: string | null
          date: string | null
          handle: string | null
          id: number
          logo: string | null
          name: string | null
          subscribers: number | null
          videos: number | null
          views: number | null
        }
        Insert: {
          channel_url?: string | null
          date?: string | null
          handle?: string | null
          id?: number
          logo?: string | null
          name?: string | null
          subscribers?: number | null
          videos?: number | null
          views?: number | null
        }
        Update: {
          channel_url?: string | null
          date?: string | null
          handle?: string | null
          id?: number
          logo?: string | null
          name?: string | null
          subscribers?: number | null
          videos?: number | null
          views?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      get_total_cost: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_unique_applications: {
        Args: Record<PropertyKey, never>
        Returns: {
          brand: string
          cbm_url: string
          first_image: string
          make: string
          model: string
          source_partnumber: string
          year_range: string
        }[]
      }
      get_user_cost: {
        Args: { user_id: string }
        Returns: number
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_user_cost: {
        Args: { increment_amount: number; user_id: string }
        Returns: undefined
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      manual_cleanup_googleads: {
        Args: { target_date?: string }
        Returns: string
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      set_googleads_cleanup_threshold: {
        Args: { new_threshold: number }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
