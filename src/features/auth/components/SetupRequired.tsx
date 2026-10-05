import { BriefcaseBusiness } from 'lucide-react'

export default function SetupRequired() {
  return <div className="auth-screen"><section className="auth-card setup-card"><a className="brand" href="#top"><span className="brand-mark"><BriefcaseBusiness size={18} /></span><span>rolecall<span className="brand-period">.</span></span></a><div className="eyebrow">DATABASE SETUP</div><h1>Connect your Supabase project</h1><p>Rolecall now stores application data in a shared, protected database. Add your project URL and publishable key to a local <code>.env.local</code> file to continue.</p><ol><li>Create a Supabase project.</li><li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in the project URL and publishable key.</li><li>Apply the migration in <code>supabase/migrations</code>, then restart the app.</li></ol><p className="helper-text">The publishable key is meant for browser use. Never put a service-role or secret key in this file.</p></section></div>
}
