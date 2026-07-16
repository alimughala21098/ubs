// Supabase Edge Function: manage-employee
//
// Lets an admin create, re-role, or remove teammate accounts directly
// from Settings -> Team in the app, with no self-signup and no email
// confirmation step required. This has to run server-side because
// creating auth users and reading auth.users requires the Supabase
// service role key, which must never be shipped to the browser.
//
// Deploy with:
//   supabase functions deploy manage-employee
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by Supabase for every edge function — no
// manual secrets setup needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ ok: false, error: 'Missing Authorization header.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify the caller from their own JWT (anon-key client, RLS still applies to them).
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const {
      data: { user },
      error: userErr
    } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: 'Not authenticated.' }, 401);

    // Service-role client for admin-only reads/writes (bypasses RLS).
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileErr || callerProfile?.role !== 'admin') {
      return json({ ok: false, error: 'Only admins can manage teammate accounts.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'create') {
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const full_name = (body.full_name || '').trim();
      const position = (body.position || '').trim();
      const role = body.role;

      if (!email || !password || !full_name || !role || !position) {
        return json({ ok: false, error: 'Full name, email, password, position, and role are all required.' }, 400);
      }
      if (!['admin', 'bidder'].includes(role)) {
        return json({ ok: false, error: 'Role must be "admin" or "bidder".' }, 400);
      }
      if (password.length < 6) {
        return json({ ok: false, error: 'Password must be at least 6 characters.' }, 400);
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // instant login, no confirmation email needed
        user_metadata: { full_name, role, position }
      });
      if (error) return json({ ok: false, error: error.message }, 400);

      return json({ ok: true, user: { id: data.user?.id, email, full_name, role, position } });
    }

    if (action === 'update_role') {
      const { user_id, role } = body;
      if (!user_id || !['admin', 'bidder'].includes(role)) {
        return json({ ok: false, error: 'A valid user_id and role are required.' }, 400);
      }
      if (user_id === user.id) {
        return json({ ok: false, error: "You can't change your own role." }, 400);
      }
      const { error } = await adminClient.from('profiles').update({ role }).eq('id', user_id);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'update_position') {
      const { user_id, position, role } = body;
      if (!user_id || !position || !['admin', 'bidder'].includes(role)) {
        return json({ ok: false, error: 'A valid user_id, position, and role are required.' }, 400);
      }
      if (user_id === user.id) {
        return json({ ok: false, error: "You can't change your own position." }, 400);
      }
      const { error } = await adminClient.from('profiles').update({ position, role }).eq('id', user_id);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'reset_password') {
      const { user_id, password } = body;
      if (!user_id || !password) return json({ ok: false, error: 'user_id and a new password are required.' }, 400);
      if (password.length < 6) return json({ ok: false, error: 'Password must be at least 6 characters.' }, 400);
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'delete') {
      const { user_id } = body;
      if (!user_id) return json({ ok: false, error: 'user_id is required.' }, 400);
      if (user_id === user.id) {
        return json({ ok: false, error: "You can't remove your own account." }, 400);
      }
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) return json({ ok: false, error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Unexpected error.' }, 500);
  }
});
