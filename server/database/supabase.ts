import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Missing Supabase configuration. Using in-memory database.");
}

// Create Supabase client with service role key for server-side operations
export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  },
);

// Database connection helper
export class SupabaseDatabase {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = supabase;
  }

  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from("areas")
        .select("count")
        .limit(1);

      return !error;
    } catch (error) {
      console.error("Supabase connection test failed:", error);
      return false;
    }
  }

  // Get Supabase client instance
  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const isConnected = await this.testConnection();
      return {
        status: isConnected ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Global instance
export const supabaseDb = new SupabaseDatabase();

// Database initialization
export async function initializeDatabase(): Promise<void> {
  try {
    console.log("Initializing Supabase database connection...");

    const isConnected = await supabaseDb.testConnection();
    if (isConnected) {
      console.log("✅ Supabase database connected successfully");
    } else {
      console.error("❌ Failed to connect to Supabase database");
      throw new Error("Database connection failed");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

// Note: Avoid re-exporting types here to prevent TS syntax at runtime when imported by Vite config
