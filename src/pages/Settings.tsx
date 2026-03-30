import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  User,
  Mail,
  Lock,
  Globe,
  Clock,
  Moon,
  Sun,
  Check,
  Link2,
  Unlink,
  ChevronDown,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { describeFunctionsInvokeError } from "@/lib/edge-function-errors";
import { supabase } from "@/lib/supabase";
import { getMetaOAuthRedirectUri } from "@/lib/meta-oauth";
import { getSnapchatOAuthRedirectUri } from "@/lib/snapchat-oauth";

/* ─── Platform Data ─── */
const platforms = [
  { id: "google", name: "Google Ads", color: "#4285f4", connected: true, account: "ads@company.com" },
  { id: "meta", name: "Meta Ads", color: "#1877f2", connected: false, account: "" },
  { id: "tiktok", name: "TikTok Ads", color: "#fe2c55", connected: false, account: "" },
  { id: "snap", name: "Snapchat Ads", color: "#FFFC00", connected: false, account: "" },
  { id: "x", name: "X Ads", color: "#71717a", connected: true, account: "@company" },
];

const currencies = ["USD ($)", "EUR (€)", "GBP (£)", "JPY (¥)", "CAD (C$)", "AUD (A$)"];
const timezones = [
  "America/New_York (EST)",
  "America/Chicago (CST)",
  "America/Denver (MST)",
  "America/Los_Angeles (PST)",
  "Europe/London (GMT)",
  "Europe/Berlin (CET)",
  "Asia/Tokyo (JST)",
  "Australia/Sydney (AEST)",
];

/* ─── Helpers ─── */
function PlatformLogo({ color, name }: { color: string; name: string }) {
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: color + "20", color }}>
      {name.charAt(0)}
    </div>
  );
}

function Dropdown({ value, onChange, options, icon: Icon }: { value: string; onChange: (v: string) => void; options: string[]; icon: React.ElementType }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-accent/30 border border-border text-sm text-foreground hover:bg-accent/50 transition-colors"
      >
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="flex-1 text-left">{value}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-xl py-1 max-h-48 overflow-y-auto"
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                value === opt ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ─── Stagger ─── */
const stagger = {
  container: { transition: { staggerChildren: 0.06 } },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

/* ─── Page ─── */
const Settings = () => {
  const { setTheme, resolvedTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections, setConnections] = useState(platforms);
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@company.com");
  const [currency, setCurrency] = useState("USD ($)");
  const [timezone, setTimezone] = useState("America/New_York (EST)");
  const [metaConnecting, setMetaConnecting] = useState(false);
  const [snapConnecting, setSnapConnecting] = useState(false);
  const darkMode = resolvedTheme === "dark";

  const metaRedirectUri = getMetaOAuthRedirectUri();
  const snapRedirectUri = getSnapchatOAuthRedirectUri();

  useEffect(() => {
    if (searchParams.get("meta_connected") === "1") {
      toast.success("Meta Ads connected", { description: "Your account token was saved." });
      setConnections((prev) => prev.map((p) => (p.id === "meta" ? { ...p, connected: true, account: "Connected" } : p)));
      searchParams.delete("meta_connected");
      setSearchParams(searchParams, { replace: true });
    }
    const err = searchParams.get("meta_error");
    if (err) {
      toast.error("Meta connection failed", { description: decodeURIComponent(err) });
      searchParams.delete("meta_error");
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get("snapchat_connected") === "1") {
      toast.success("Snapchat Ads connected", { description: "Your account token was saved." });
      setConnections((prev) => prev.map((p) => (p.id === "snap" ? { ...p, connected: true, account: "Connected" } : p)));
      searchParams.delete("snapchat_connected");
      setSearchParams(searchParams, { replace: true });
    }
    const snapErr = searchParams.get("snapchat_error");
    if (snapErr) {
      toast.error("Snapchat connection failed", { description: decodeURIComponent(snapErr) });
      searchParams.delete("snapchat_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const connectMetaAds = async () => {
    setMetaConnecting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        toast.error("Sign in required", {
          description: "Log in with Supabase Auth first, then connect Meta Ads.",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("meta-auth", {
        method: "POST",
        body: {},
      });

      if (error) {
        const description = await describeFunctionsInvokeError(error);
        toast.error("Could not start Meta OAuth", { description });
        return;
      }

      const url = (data as { url?: string })?.url;
      if (!url) {
        toast.error("Invalid response from meta-auth", { description: "Missing OAuth URL." });
        return;
      }

      window.location.assign(url);
    } finally {
      setMetaConnecting(false);
    }
  };

  const connectSnapchatAds = async () => {
    setSnapConnecting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        toast.error("Sign in required", {
          description: "Log in with Supabase Auth first, then connect Snapchat Ads.",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("snapchat-auth", {
        method: "POST",
        body: {},
      });

      if (error) {
        const description = await describeFunctionsInvokeError(error);
        toast.error("Could not start Snapchat OAuth", { description });
        return;
      }

      const url = (data as { url?: string })?.url;
      if (!url) {
        toast.error("Invalid response from snapchat-auth", { description: "Missing OAuth URL." });
        return;
      }

      window.location.assign(url);
    } finally {
      setSnapConnecting(false);
    }
  };

  const toggleConnection = (id: string) => {
    setConnections((prev) => prev.map((p) => p.id === id ? { ...p, connected: !p.connected } : p));
  };

  const onIntegrationClick = (id: string, connected: boolean) => {
    if (id === "meta" && !connected) {
      void connectMetaAds();
      return;
    }
    if (id === "snap" && !connected) {
      void connectSnapchatAds();
      return;
    }
    toggleConnection(id);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-8">
        {/* ── Ad Platform Integrations ── */}
        <section>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Ad Platform Integrations
          </motion.h2>
          <motion.div variants={stagger.container} initial="initial" animate="animate" className="space-y-3">
            {connections.map((p) => (
              <motion.div key={p.id} variants={stagger.item} className="glass-card-hover p-4 flex items-center gap-4">
                <PlatformLogo color={p.color} name={p.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  {p.id === "meta" && !p.connected && (
                    <p className="text-[10px] text-muted-foreground/90 mt-1 break-all font-mono leading-snug">
                      OAuth redirect_uri: {metaRedirectUri}
                    </p>
                  )}
                  {p.id === "snap" && !p.connected && (
                    <p className="text-[10px] text-muted-foreground/90 mt-1 break-all font-mono leading-snug">
                      OAuth redirect_uri: {snapRedirectUri}
                    </p>
                  )}
                  {p.connected ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3 text-primary" /> Connected{p.account ? ` · ${p.account}` : ""}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not connected</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={(p.id === "meta" && metaConnecting) || (p.id === "snap" && snapConnecting)}
                  onClick={() => onIntegrationClick(p.id, p.connected)}
                  className={`text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
                    p.connected
                      ? "bg-danger/10 text-danger hover:bg-danger/20"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {(p.id === "meta" && metaConnecting) || (p.id === "snap" && snapConnecting) ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Redirecting…
                    </>
                  ) : p.connected ? (
                    <>
                      <Unlink className="w-3 h-3" /> Disconnect
                    </>
                  ) : p.id === "meta" ? (
                    <>
                      <Link2 className="w-3 h-3" /> Connect Meta Ads
                    </>
                  ) : p.id === "snap" ? (
                    <>
                      <Link2 className="w-3 h-3" /> Connect Snapchat Ads
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3 h-3" /> Connect
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── Account Settings ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Account Settings
          </h2>
          <div className="glass-card p-5 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-accent/30 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
            {/* Email */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-accent/30 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
            {/* Password */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value="••••••••••"
                  readOnly
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-accent/30 border border-border text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
              <button className="text-xs text-primary hover:text-primary/80 mt-1.5 transition-colors">Change password</button>
            </div>

            <button className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 mt-2">
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </motion.section>

        {/* ── Preferences ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Preferences
          </h2>
          <div className="glass-card p-5 space-y-5">
            {/* Currency */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Currency</label>
              <Dropdown value={currency} onChange={setCurrency} options={currencies} icon={Globe} />
            </div>
            {/* Timezone */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Timezone</label>
              <Dropdown value={timezone} onChange={setTimezone} options={timezones} icon={Clock} />
            </div>
            {/* Dark Mode */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-[11px] text-muted-foreground">Use dark theme across the dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTheme(darkMode ? "light" : "dark")}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  darkMode ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-foreground transition-transform duration-200 ${
                    darkMode ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
