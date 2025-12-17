"use client";

import { supabase } from "@/lib/supabase/browser";

/**
 * For a FREELANCER:
 *  - Gets logged in freelancer
 *  - Looks up job to find its client
 *  - Finds existing conversation or creates new one
 *  - Returns conversation id
 */
export async function openOrCreateConversationForFreelancer(
  jobPostId: number
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated.");
  }

  // 1) get freelancer row
  const { data: freelancerRow, error: freelancerError } = await supabase
    .from("freelancers")
    .select("freelancer_id")
    .eq("auth_user_id", user.id)
    .single();

  if (freelancerError || !freelancerRow) {
    throw new Error("Freelancer profile not found.");
  }

  const freelancerId = freelancerRow.freelancer_id as number;

  // 2) get job -> client_id
  const { data: jobRow, error: jobError } = await supabase
    .from("job_posts")
    .select("client_id")
    .eq("job_post_id", jobPostId)
    .single();

  if (jobError || !jobRow) {
    throw new Error("Job post not found.");
  }

  const clientId = jobRow.client_id as number;

  // 3) check for existing conversation
  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .eq("job_post_id", jobPostId)
    .eq("client_id", clientId)
    .eq("freelancer_id", freelancerId)
    .maybeSingle();

  if (existingError) {
    console.error(existingError);
  }

  if (existing && existing.id) {
    return existing.id as string;
  }

  // 4) create new conversation
  const { data: inserted, error: insertError } = await supabase
    .from("conversations")
    .insert({
      job_post_id: jobPostId,
      client_id: clientId,
      freelancer_id: freelancerId,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error(insertError);
    throw new Error("Could not create conversation.");
  }

  return inserted.id as string;
}
