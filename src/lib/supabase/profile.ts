import type { SupabaseClient, User } from "@supabase/supabase-js";

function resolveFullName(user: User): string {
  const fromMetadata = user.user_metadata?.full_name;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) return fromMetadata.trim();
  const emailPrefix = user.email?.split("@")[0]?.trim();
  if (emailPrefix) return emailPrefix;
  return "Giáo viên";
}

function resolveTeacherCode(user: User): string {
  return user.id.replaceAll("-", "").slice(0, 6).toUpperCase();
}

/** Ensures auth.users has a matching profiles row (required before creating classes). */
export async function ensureTeacherProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ error: string | null }> {
  const fullName = resolveFullName(user);

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) return { error: selectError.message };

  const { error } = existing?.id
    ? await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id)
    : await supabase.from("profiles").insert({
        full_name: fullName,
        id: user.id,
        teacher_code: resolveTeacherCode(user),
      });

  return { error: error?.message ?? null };
}
