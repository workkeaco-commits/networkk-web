import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/supabase/server";

export async function POST(req: Request) {
    try {
        const { client_ids } = await req.json();

        if (!Array.isArray(client_ids) || client_ids.length === 0) {
            return NextResponse.json({ clients: [] });
        }

        // Use admin client to bypass RLS
        const { data: clients, error } = await supabaseAdmin
            .from("clients")
            .select("client_id, first_name, last_name, company_name")
            .in("client_id", client_ids);

        if (error) {
            console.error("Error fetching client names:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ clients: clients || [] });
    } catch (err: any) {
        console.error("Server error fetching client names:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
