import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { method } = req;
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (method === "POST" && pathParts[pathParts.length - 1] === "admin-user-management") {
      const { email, full_name, role, vehicle_type, charger_type } = await req.json();

      const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert({
          id: authData.user.id,
          email,
          full_name,
          role,
          vehicle_type,
          charger_type: charger_type || null,
        });

      if (profileError) {
        await supabaseClient.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: profileError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, user: authData.user }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (method === "DELETE") {
      const userId = pathParts[pathParts.length - 1];

      const { error: profileError } = await supabaseClient
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        return new Response(
          JSON.stringify({ error: profileError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId);

      if (authError) {
        console.warn("Warning: Could not delete auth user:", authError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});