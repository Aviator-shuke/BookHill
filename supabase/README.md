# langLSRW Supabase setup

The web app already contains the Google sign-in and first-stage sync client. A real login becomes active after connecting a Supabase project.

## 1. Create the data table

Open the Supabase SQL Editor and run [`schema.sql`](schema.sql). The script creates one JSON sync row per authenticated user and enables Row Level Security so users can only access their own row.

## 2. Enable Google sign-in

1. Create a Web OAuth client in Google Auth Platform.
2. Add the local origin `http://localhost:8848` while developing.
3. Add the Supabase callback shown on **Authentication > Providers > Google**. It normally has this form:

   `https://<project-ref>.supabase.co/auth/v1/callback`

4. Paste the Google Client ID and Client Secret into the Supabase Google provider and enable it.

Only the Supabase dashboard receives the Google Client Secret. Never place it in this repository or in browser storage.

## 3. Configure redirect URLs

In **Authentication > URL Configuration**:

- Set the production Site URL when the site is deployed.
- Add `http://localhost:8848/` to Redirect URLs for local development.
- Add the production HTTPS URL after deployment.

## 4. Connect langLSRW

Copy the project URL and publishable key from the Supabase project settings. Use either method:

- Enter both values in **langLSRW > Settings > Cloud account** for local testing.
- Put the public values in `src/cloud-config.js` for a shared deployment.

The publishable key is designed to be public. Access control comes from the RLS policies in `schema.sql`. Never use a secret or `service_role` key in the browser.

## Current sync scope

The first sync payload contains:

- theme, fonts, shortcuts, speech settings, and grammar colors;
- the signed-in user's practice history;
- the current custom sentence library and position.

The built-in common library is not uploaded. AI API credentials are never uploaded. The current conflict policy is cloud-first on sign-in and last-write-wins afterward; a later normalized schema can split histories, vocabulary, materials, and review records into dedicated tables.
