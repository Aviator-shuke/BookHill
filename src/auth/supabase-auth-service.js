(() => {
  const CONFIG_STORAGE_KEY = "langLSRWCloudConfig";

  class SupabaseAuthService {
    constructor() {
      this.client = null;
      this.authSubscription = null;
      this.config = this.loadConfig();
    }

    loadConfig() {
      let stored = {};
      try {
        stored = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "{}");
      } catch {
        stored = {};
      }
      const bundled = window.langLSRWCloudConfig || {};
      const bundledConfig = {
        supabaseUrl: String(bundled.supabaseUrl || "").trim().replace(/\/$/, ""),
        supabaseAnonKey: String(bundled.supabaseAnonKey || "").trim()
      };
      if (bundledConfig.supabaseUrl && bundledConfig.supabaseAnonKey) return bundledConfig;
      return {
        supabaseUrl: String(stored.supabaseUrl || "").trim().replace(/\/$/, ""),
        supabaseAnonKey: String(stored.supabaseAnonKey || "").trim()
      };
    }

    isConfigured() {
      try {
        const url = new URL(this.config.supabaseUrl);
        return ["http:", "https:"].includes(url.protocol)
          && !url.username
          && !url.password
          && this.config.supabaseAnonKey.length > 20;
      } catch {
        return false;
      }
    }

    configure(config, persist = true) {
      this.config = {
        supabaseUrl: String(config?.supabaseUrl || "").trim().replace(/\/$/, ""),
        supabaseAnonKey: String(config?.supabaseAnonKey || "").trim()
      };
      if (persist) localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      this.disconnect();
      return this.isConfigured();
    }

    connect() {
      if (!this.isConfigured()) return null;
      if (this.client) return this.client;
      if (!window.supabase?.createClient) throw new Error("Supabase SDK 未加载");
      this.client = window.supabase.createClient(this.config.supabaseUrl, this.config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce"
        }
      });
      return this.client;
    }

    disconnect() {
      if (this.authSubscription) this.authSubscription.unsubscribe();
      this.authSubscription = null;
      this.client = null;
    }

    async getUser() {
      const client = this.connect();
      if (!client) return null;
      const { data, error } = await client.auth.getUser();
      if (error && !/session/i.test(error.message || "")) throw error;
      return data?.user || null;
    }

    onAuthStateChange(listener) {
      const client = this.connect();
      if (!client) return () => {};
      if (this.authSubscription) this.authSubscription.unsubscribe();
      const { data } = client.auth.onAuthStateChange((event, session) => listener(event, session));
      this.authSubscription = data.subscription;
      return () => {
        if (this.authSubscription === data.subscription) this.authSubscription = null;
        data.subscription.unsubscribe();
      };
    }

    async signInWithGoogle() {
      const client = this.connect();
      if (!client) throw new Error("请先配置 Supabase");
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });
      if (error) throw error;
    }

    async signOut() {
      const client = this.connect();
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }

    async loadState(userId) {
      const client = this.connect();
      const { data, error } = await client
        .from("user_sync_state")
        .select("payload,updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }

    async saveState(userId, payload) {
      const client = this.connect();
      const updatedAt = new Date().toISOString();
      const { error } = await client
        .from("user_sync_state")
        .upsert({ user_id: userId, payload, updated_at: updatedAt }, { onConflict: "user_id" });
      if (error) throw error;
      return updatedAt;
    }
  }

  window.langLSRWCloudAuth = new SupabaseAuthService();
})();
