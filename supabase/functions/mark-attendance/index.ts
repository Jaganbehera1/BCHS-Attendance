import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AttendanceRequest {
  fingerprint_id: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { fingerprint_id }: AttendanceRequest = await req.json();

    if (!fingerprint_id && fingerprint_id !== 0) {
      return new Response(
        JSON.stringify({ error: "fingerprint_id is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("fingerprint_id", fingerprint_id)
      .eq("is_active", true)
      .maybeSingle();

    if (studentError || !student) {
      return new Response(
        JSON.stringify({
          error: "Student not found or inactive. Please ensure the student is enrolled.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const { data: existingAttendance, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", student.id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    let attendanceType = "check_in";
    let responseData;

    if (!existingAttendance) {
      const { data: newAttendance, error: insertError } = await supabase
        .from("attendance")
        .insert([
          {
            student_id: student.id,
            date: today,
            check_in: now,
            class_grade: student.class_grade || '6',
            section: student.section || 'A',
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      responseData = newAttendance;
      attendanceType = "check_in";
    } else {
      const { data: updatedAttendance, error: updateError } = await supabase
        .from("attendance")
        .update({
          check_out: now,
          updated_at: now,
        })
        .eq("id", existingAttendance.id)
        .select()
        .single();

      if (updateError) throw updateError;

      responseData = updatedAttendance;
      attendanceType = "check_out";
    }

    const time = new Date(now).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return new Response(
      JSON.stringify({
        success: true,
        student_name: student.name,
        student_id: student.student_id,
        time: time,
        date: today,
        type: attendanceType,
        message: `${attendanceType === "check_in" ? "Check-in" : "Check-out"} successful for ${student.name}`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing attendance:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process attendance",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
