import { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import Button from '@/components/UI/Button';
import { shareSpreadsheet } from '@/services/googleSheets';
import { useExpenseStore } from '@/store/expenseStore';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const { toggleLocalMode, showNotification } = useUiStore();
  const { user, updateName, updateSpreadsheetId } = useAuthStore();

  const [nameInput, setNameInput] = useState(user?.name || '');
  const [familyInput, setFamilyInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [familyName, setFamilyName] = useState(() => {
    return localStorage.getItem('expense_tracker_family_name') || '';
  });

  const expenses = useExpenseStore(s => s.expenses);

  const familyMembers = useMemo(() => {
    if (!familyName) return [];
    const names = new Set<string>();
    if (user?.name) names.add(user.name);
    expenses.forEach(e => {
      if (e.userName) names.add(e.userName);
    });
    return Array.from(names);
  }, [expenses, user?.name, familyName]);

  const inviteLink = user?.spreadsheetId && familyName
    ? `${window.location.origin}/?joinSpreadsheetId=${user.spreadsheetId}&familyName=${encodeURIComponent(familyName)}`
    : '';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    updateName(nameInput.trim());
    showNotification(
      isLocalMode ? 'Perfil actualizado con éxito.' : 'Profile updated successfully.',
      'success'
    );
  };

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyInput.trim()) return;
    const name = familyInput.trim();
    localStorage.setItem('expense_tracker_family_name', name);
    setFamilyName(name);
    if (!useUiStore.getState().isFamilyMode) {
      useUiStore.getState().toggleFamilyMode();
    }
    showNotification(
      isLocalMode ? '¡Familia creada! Copia el enlace abajo para invitar.' : 'Family created! Copy the link below to invite others.',
      'success'
    );
  };

  const handleLeaveFamily = () => {
    if (confirm(isLocalMode ? '¿Estás seguro de salir de la familia? Esto restablecerá tu hoja de cálculo a una personal.' : 'Are you sure you want to leave the family? This will reset your spreadsheet to a personal one.')) {
      localStorage.removeItem('expense_tracker_family_name');
      setFamilyName('');
      updateSpreadsheetId(''); // Will force creation of a new sheet on reload
      showNotification(
        isLocalMode ? 'Has salido de la familia. Se creará una hoja nueva.' : 'Left the family. A new sheet will be created.',
        'info'
      );
      onClose();
    }
  };

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    showNotification(
      isLocalMode ? '¡Enlace copiado al portapapeles! 📋' : 'Link copied to clipboard! 📋',
      'success'
    );
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    if (!user?.spreadsheetId) return;

    setIsSharing(true);
    try {
      await shareSpreadsheet(user.accessToken, user.spreadsheetId, emailInput.trim());
      showNotification(
        isLocalMode 
          ? `¡Permisos de editor otorgados a ${emailInput.trim()}! Compartile el enlace de invitación.` 
          : `Editor permissions granted to ${emailInput.trim()}! Share the invitation link with them.`,
        'success'
      );
      setEmailInput('');
    } catch (err) {
      console.error(err);
      showNotification(
        isLocalMode 
          ? 'Error al compartir. Asegurate de que el email sea una cuenta de Google.' 
          : 'Failed to share. Make sure the email is a valid Google account.',
        'error'
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#14122d]/90 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>{isLocalMode ? 'Configuración' : 'Settings'}</span>
          </h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: User Profile */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {isLocalMode ? 'Perfil de Usuario' : 'User Profile'}
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/60">
                  {isLocalMode ? 'Nombre en los gastos' : 'Name in expenses'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder={isLocalMode ? 'Tu nombre...' : 'Your name...'}
                  />
                  <Button type="submit" variant="primary" size="sm">
                    {isLocalMode ? 'Guardar' : 'Save'}
                  </Button>
                </div>
              </div>
            </form>
          </section>

          {/* Section 2: Regional & Language */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {isLocalMode ? 'Preferencia de Región y Monedas' : 'Region & Currencies'}
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">
                {isLocalMode ? 'Selección de región activa' : 'Active Region Mode'}
              </label>
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 text-sm max-w-sm">
                <button
                  type="button"
                  onClick={() => { if (!isLocalMode) toggleLocalMode(); }}
                  className={`flex-1 text-center py-2.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer
                    ${isLocalMode 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold' 
                      : 'text-white/40 hover:text-white/60'
                    }`}
                >
                  🇦🇷 Modo Local ($ARS)
                </button>
                <button
                  type="button"
                  onClick={() => { if (isLocalMode) toggleLocalMode(); }}
                  className={`flex-1 text-center py-2.5 rounded-lg font-semibold transition-all duration-200 cursor-pointer
                    ${!isLocalMode 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold' 
                      : 'text-white/40 hover:text-white/60'
                    }`}
                >
                  🌎 Internac. (Multi-divisa)
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Family sharing */}
          <section className="space-y-4 pt-2 border-t border-white/10">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {isLocalMode ? 'Grupo Familiar (Compartir Hojas)' : 'Family Group (Share Sheets)'}
            </h3>

            {!familyName ? (
              <form onSubmit={handleCreateFamily} className="space-y-3">
                <p className="text-xs text-white/50 leading-relaxed">
                  {isLocalMode 
                    ? '¿Querés compartir tus gastos con tu pareja, familia o roomies? Creá un grupo familiar para generar un enlace de invitación.' 
                    : 'Want to share your expenses with family or roommates? Create a family group to generate an invitation link.'}
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-white/60">
                    {isLocalMode ? 'Apellido o Nombre de la Familia' : 'Family Last Name / Group Name'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={familyInput}
                      onChange={e => setFamilyInput(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                      placeholder={isLocalMode ? 'Ej: Gomez' : 'E.g., Gomez'}
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {isLocalMode ? 'Crear Grupo' : 'Create Group'}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
                  <div>
                    <p className="text-xs text-white/40">{isLocalMode ? 'Familia Activa' : 'Active Family'}</p>
                    <p className="text-sm font-bold text-indigo-300">👥 Familia {familyName}</p>
                    {familyMembers.length > 0 && (
                      <p className="text-[11px] text-white/60 mt-1">
                        {isLocalMode ? 'Integrantes: ' : 'Members: '}
                        {familyMembers.join(', ')}
                      </p>
                    )}
                  </div>
                  <Button variant="danger" size="sm" onClick={handleLeaveFamily}>
                    {isLocalMode ? 'Salir del Grupo' : 'Leave Group'}
                  </Button>
                </div>

                {/* Add member by email form */}
                <form onSubmit={handleAddMember} className="space-y-2 border-t border-white/5 pt-3">
                  <label className="text-xs font-semibold text-white/70">
                    {isLocalMode ? 'Dar acceso a otro integrante (por email)' : 'Grant access to another member (by email)'}
                  </label>
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    {isLocalMode 
                      ? 'Esto le otorgará automáticamente permisos de edición en tu hoja de Google Drive para evitar errores de acceso (403).' 
                      : 'This will automatically grant them write permissions on your Google Drive spreadsheet to prevent authorization errors (403).'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="ejemplo@gmail.com"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    />
                    <Button type="submit" variant="secondary" size="sm" loading={isSharing}>
                      {isLocalMode ? 'Otorgar Acceso' : 'Grant Access'}
                    </Button>
                  </div>
                </form>

                <div className="space-y-1.5 border-t border-white/5 pt-3">
                  <label className="text-xs font-medium text-white/60">
                    {isLocalMode ? 'Enlace de Invitación' : 'Invitation Link'}
                  </label>
                  <p className="text-xs text-white/40 leading-relaxed mb-2">
                    {isLocalMode 
                      ? 'Compartí este enlace con otros miembros para que ingresen y guarden gastos en tu misma planilla de Google Sheets.' 
                      : 'Share this link with other members to let them view and add expenses to the same Google Sheet.'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      onClick={e => (e.target as HTMLInputElement).select()}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/70 text-xs focus:outline-none"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleCopyLink}>
                      {isLocalMode ? 'Copiar' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {isLocalMode ? 'Cerrar' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
