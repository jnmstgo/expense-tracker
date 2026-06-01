import GoogleSignIn from '@/components/Auth/GoogleSignIn';

export default function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo / title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl
                          bg-gradient-to-br from-indigo-500 to-purple-600
                          shadow-2xl shadow-indigo-500/40 mb-6 text-4xl">
            💳
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Expense AI
          </h1>
          <p className="text-white/50 mt-2 text-sm leading-relaxed">
            AI-powered expense tracking with<br />Google Sheets sync
          </p>
        </div>

        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl
                        p-8 shadow-2xl shadow-black/40">
          <h2 className="text-lg font-semibold text-white text-center mb-6">
            Sign in to get started
          </h2>

          <GoogleSignIn />

          <p className="text-xs text-white/30 text-center mt-6 leading-relaxed">
            By signing in you authorise this app to store your expenses<br />
            in a Google Sheet in your own Drive account.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {['AI Receipt Scan', 'Google Sheets', 'Offline Support', 'Geolocation'].map(f => (
            <span
              key={f}
              className="text-xs text-white/40 border border-white/10 px-3 py-1 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
