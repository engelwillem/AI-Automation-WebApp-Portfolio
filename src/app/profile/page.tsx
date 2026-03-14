
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import {
    ShieldCheck,
    LogOut,
    Camera,
    ChevronRight,
    CheckCircle2,
    Trash2,
    Grid,
    Sparkles,
    Loader2,
    AlertTriangle,
    Key,
    Lock,
    QrCode,
    RefreshCw,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileAppLayout from '@/layouts/MobileAppLayout';
import DarkCard from '@/components/core/DarkCard';
import AccordionCard from '@/components/core/AccordionCard';
import PrimaryCTA from '@/components/core/PrimaryCTA';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { clearAppAccessToken, getAppAccessToken } from '@/services/app-auth-token';

type OpsGatewayData = {
    status: 'Healthy' | 'Needs Attention' | 'High Risk' | string;
    riskScore: number;
    topAction: string;
    statusHref?: string;
};

type ApiProfilePayload = {
    data?: {
        user?: {
            id?: string;
            name?: string;
            email?: string;
            is_admin?: boolean;
            email_verified_at?: string | null;
            avatar_url?: string | null;
        };
        opsGateway?: OpsGatewayData;
        twoFactor?: {
            enabled?: boolean;
            recoveryCodesRemaining?: number;
        };
    };
};

export default function ProfilePage() {
    const router = useRouter();
    const { user: authUser } = useUser();
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [submittingAvatar, setSubmittingAvatar] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Profile States
    const [user, setUser] = useState({
        name: authUser?.displayName || 'Guest User',
        email: authUser?.email || 'guest@example.com',
        avatarUrl: authUser?.photoURL || null,
        is_admin: false,
        email_verified_at: authUser?.emailVerified ? 'verified' : null,
    });

    const [opsGateway, setOpsGateway] = useState<OpsGatewayData | null>(null);
    const [journeyBadge, setJourneyBadge] = useState(0);
    const [profileData, setProfileData] = useState({
        name: user.name,
        email: user.email,
    });

    // Password States
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

    // 2FA States
    const [twoFactor, setTwoFactor] = useState({
        enabled: false,
        recoveryCodesRemaining: 0
    });
    const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'password' | 'setup' | 'disable'>('idle');
    const [twoFactorPassword, setTwoFactorPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
        secret: string;
        qrCodeDataUri: string;
        recoveryCodes: string[];
    } | null>(null);
    const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);
    const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
    const [twoFactorBusy, setTwoFactorBusy] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const token = getAppAccessToken();
        if (!token) {
            setLoading(false);
            return;
        }

        let isActive = true;
        const loadProfile = async () => {
            try {
                const response = await fetch('/api/profile', {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    cache: 'no-store',
                });
                if (!response.ok) return;

                const payload = (await response.json()) as ApiProfilePayload;
                const apiUser = payload?.data?.user;
                if (!isActive || !apiUser) return;

                const nextUser = {
                    name: apiUser.name || 'Guest User',
                    email: apiUser.email || 'guest@example.com',
                    avatarUrl: apiUser.avatar_url || authUser?.photoURL || null,
                    is_admin: Boolean(apiUser.is_admin),
                    email_verified_at: apiUser.email_verified_at || null,
                };

                setUser(nextUser);
                if (payload?.data && 'opsGateway' in payload.data) {
                    setOpsGateway(payload.data.opsGateway || null);
                }
                setProfileData({
                    name: nextUser.name,
                    email: nextUser.email,
                });
                setTwoFactor({
                    enabled: Boolean(payload?.data?.twoFactor?.enabled),
                    recoveryCodesRemaining: payload?.data?.twoFactor?.recoveryCodesRemaining || 0
                });
            } catch {
                // ignore
            } finally {
                if (isActive) setLoading(false);
            }
        };

        loadProfile();
        return () => { isActive = false; };
    }, [authUser?.photoURL]);

    useEffect(() => {
        let isActive = true;
        const fetchSummary = async () => {
            try {
                const res = await fetch('/api/versehub/id/actions/summary?limit=1', {
                    headers: { 
                        Accept: 'application/json',
                        Authorization: `Bearer ${getAppAccessToken()}`
                    },
                });
                if (!res.ok) return;
                const json = await res.json();
                const counts = json?.counts || {};
                const total = Number(counts.favorites || 0) + Number(counts.bookmarks || 0) + Number(counts.notes || 0);
                if (isActive) setJourneyBadge(total);
            } catch { /* ignore */ }
        };
        fetchSummary();
        return () => { isActive = false; };
    }, []);

    const logout = () => {
        clearAppAccessToken();
        router.push('/');
    };

    const handleAvatarUpload = async (file: File) => {
        const token = getAppAccessToken();
        if (!token) return;

        setSubmittingAvatar(true);
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('_method', 'PATCH');

        try {
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
            if (response.ok) {
                const payload = await response.json();
                if (payload?.data?.avatar_url) {
                    setUser(prev => ({ ...prev, avatarUrl: payload.data.avatar_url }));
                    showToast('Foto profil diperbarui');
                }
            }
        } catch {
            showToast('Gagal mengupload foto', 'error');
        } finally {
            setSubmittingAvatar(false);
        }
    };

    const handleProfileSave = async (event: React.FormEvent) => {
        event.preventDefault();
        const token = getAppAccessToken();
        if (!token) return;

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(profileData),
            });
            if (!response.ok) throw new Error();

            const payload = await response.json();
            showToast('Profil berhasil disimpan');
            setUser(prev => ({ ...prev, ...payload.data }));
        } catch {
            showToast('Gagal menyimpan profil', 'error');
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getAppAccessToken();
        if (!token) return;

        setPasswordErrors({});
        try {
            const response = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    current_password: passwordData.current,
                    password: passwordData.new,
                    password_confirmation: passwordData.confirm,
                }),
            });

            if (response.ok) {
                setPasswordData({ current: '', new: '', confirm: '' });
                showToast('Kata sandi berhasil diubah');
            } else {
                const payload = await response.json();
                setPasswordErrors(payload.errors || { general: 'Gagal mengubah kata sandi' });
            }
        } catch {
            showToast('Gagal menghubungi server', 'error');
        }
    };

    const handleTwoFactorSetup = async () => {
        const token = getAppAccessToken();
        if (!token || !twoFactorPassword) return;

        setTwoFactorBusy(true);
        setTwoFactorError(null);
        try {
            const response = await fetch('/api/profile/two-factor/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ current_password: twoFactorPassword }),
            });

            if (response.ok) {
                const payload = await response.json();
                setTwoFactorSetupData(payload);
                setTwoFactorStep('setup');
            } else {
                const error = await response.json();
                setTwoFactorError(error.message || 'Password tidak valid');
            }
        } catch {
            setTwoFactorError('Terjadi gangguan sistem');
        } finally {
            setTwoFactorBusy(false);
        }
    };

    const handleTwoFactorConfirm = async () => {
        const token = getAppAccessToken();
        if (!token || !twoFactorCode) return;

        setTwoFactorBusy(true);
        setTwoFactorError(null);
        try {
            const response = await fetch('/api/profile/two-factor/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    current_password: twoFactorPassword,
                    code: twoFactorCode 
                }),
            });

            if (response.ok) {
                setTwoFactor({ enabled: true, recoveryCodesRemaining: 8 });
                setTwoFactorStep('idle');
                setTwoFactorSetupData(null);
                setTwoFactorPassword('');
                setTwoFactorCode('');
                showToast('2FA Berhasil diaktifkan');
            } else {
                setTwoFactorError('Kode OTP tidak valid');
            }
        } catch {
            setTwoFactorError('Terjadi gangguan sistem');
        } finally {
            setTwoFactorBusy(false);
        }
    };

    const handleTwoFactorDisable = async () => {
        const token = getAppAccessToken();
        if (!token || !twoFactorCode) return;

        setTwoFactorBusy(true);
        try {
            const response = await fetch('/api/profile/two-factor', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    current_password: twoFactorPassword,
                    code: twoFactorCode 
                }),
            });

            if (response.ok) {
                setTwoFactor({ enabled: false, recoveryCodesRemaining: 0 });
                setTwoFactorStep('idle');
                setTwoFactorPassword('');
                setTwoFactorCode('');
                showToast('2FA Dinonaktifkan');
            } else {
                setTwoFactorError('Kode tidak valid');
            }
        } catch {
            setTwoFactorError('Gagal menonaktifkan 2FA');
        } finally {
            setTwoFactorBusy(false);
        }
    };

    const handleRegenerateCodes = async () => {
        const token = getAppAccessToken();
        if (!token || !twoFactorPassword || !twoFactorCode) return;

        setTwoFactorBusy(true);
        try {
            const response = await fetch('/api/profile/two-factor/recovery-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                    current_password: twoFactorPassword,
                    code: twoFactorCode 
                }),
            });

            if (response.ok) {
                const payload = await response.json();
                setNewRecoveryCodes(payload.recoveryCodes);
                setTwoFactorCode('');
                showToast('Recovery codes baru dibuat');
            }
        } catch { /* ignore */ } finally {
            setTwoFactorBusy(false);
        }
    };

    const handleDeleteAccount = async () => {
        const token = getAppAccessToken();
        const password = window.prompt('Konfirmasi hapus akun permanen. Masukkan password:');
        if (!password || !token) return;

        try {
            const response = await fetch('/api/profile', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ password }),
            });
            if (response.ok) logout();
        } catch { /* ignore */ }
    };

    const firstName = user.name.split(' ')[0];

    return (
        <MobileAppLayout
            title="Profile"
            activeNavId="profile"
            backHref="/today"
            rightAction={
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="h-12 w-12 flex items-center justify-center rounded-full bg-surface shadow-soft hover:bg-surface-elevated transition-all ring-1 ring-black/[0.03]">
                            <Grid className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-56 p-2 bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border-none ring-1 ring-black/5">
                        <button
                            onClick={logout}
                            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-rose-500"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="text-sm font-bold">Log out</span>
                        </button>
                    </PopoverContent>
                </Popover>
            }
        >
            <div className="mx-auto max-w-[640px] px-4 py-4 space-y-6">
                <DarkCard className="relative overflow-hidden group/profile-card">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/5 blur-3xl" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="relative">
                            <div className="absolute -inset-2 rounded-full bg-brand/20 opacity-20 blur-xl animate-pulse" />
                            <div className="relative h-28 w-28 rounded-[2rem] bg-slate-900 flex items-center justify-center overflow-hidden ring-4 ring-white/10 shadow-2xl">
                                {submittingAvatar && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
                                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                                    </div>
                                )}
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-brand tracking-tighter">
                                        {user.name.slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-brand text-brand-foreground flex items-center justify-center shadow-lg transform transition-all hover:scale-110 active:scale-90"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                        </div>

                        <div className="mt-8 space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter text-white leading-tight">{user.name}</h2>
                            <p className="text-brand font-bold tracking-wide text-sm">{user.email}</p>
                        </div>

                        <div className="mt-6">
                            <div className={cn(
                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
                                user.email_verified_at ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            )}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>{user.email_verified_at ? 'Verified Account' : 'Guest Session'}</span>
                            </div>
                        </div>
                    </div>
                </DarkCard>

                <div className="space-y-4">
                    {user.is_admin && opsGateway && (
                        <AccordionCard title="Gateway Operasional" className="ring-2 ring-brand/20 bg-brand/[0.02]">
                            <div className="space-y-4 pt-2">
                                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                        <div>
                                            <p className="text-sm font-black text-white/90">Welcome back, {firstName}.</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Control Center Access</p>
                                        </div>
                                        <div className={cn(
                                            "px-4 py-2 rounded-2xl text-[10px] font-black border uppercase tracking-widest text-center shadow-lg",
                                            opsGateway.status === 'High Risk' ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                        )}>
                                            Status: {opsGateway.status}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-black/20 border border-white/5 mb-6">
                                        <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-2 px-1">Aksi Prioritas</p>
                                        <p className="text-sm text-white/70 leading-relaxed font-medium">{opsGateway.topAction}</p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Button onClick={() => router.push('/settings/ops-visibility')} className="w-full h-12 bg-white text-slate-950 font-black text-[11px] uppercase tracking-widest rounded-2xl">Open Ops Triage</Button>
                                        <Button variant="outline" onClick={() => router.push('/settings/kpi-dashboard')} className="w-full h-12 border-white/10 bg-white/5 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl">KPI Dashboard</Button>
                                    </div>
                                </div>
                            </div>
                        </AccordionCard>
                    )}

                    <AccordionCard title="Your Spiritual Journey">
                        <button onClick={() => router.push('/versehub/id/my-spiritual-journey')} className="flex items-center justify-between w-full p-6 rounded-[28px] bg-white/[0.02] hover:bg-white/[0.04] transition-all border border-white/10 group shadow-lg">
                            <div className="text-left space-y-1">
                                <p className="text-lg font-black text-white tracking-tight">Growth Monitoring</p>
                                <p className="text-xs text-amber-500/70 font-bold uppercase tracking-widest">Riwayat hafalan & catatan batin</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {journeyBadge > 0 && <span className="h-6 min-w-[24px] px-2 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-black">{journeyBadge}</span>}
                                <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-brand group-hover:text-slate-950 transition-all">
                                    <ChevronRight className="h-5 w-5" />
                                </div>
                            </div>
                        </button>
                    </AccordionCard>

                    <AccordionCard title="Informasi Personal">
                        <form className="space-y-6 pt-2" onSubmit={handleProfileSave}>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.25em] ml-2">Nama Lengkap</label>
                                <Input value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="h-13 bg-white/[0.03] border-white/10 rounded-2xl text-[16px] font-bold px-5" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.25em] ml-2">Alamat Email</label>
                                <Input value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="h-13 bg-white/[0.03] border-white/10 rounded-2xl text-[16px] font-bold px-5" />
                            </div>
                            <div className="pt-2">
                                <PrimaryCTA label="Simpan Perubahan" size="md" />
                            </div>
                        </form>
                    </AccordionCard>

                    <AccordionCard title="Keamanan & Password">
                        <form className="space-y-6 pt-2" onSubmit={handlePasswordUpdate}>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.25em] ml-2">Password Saat Ini</label>
                                <Input type="password" value={passwordData.current} onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })} className="h-13 bg-white/[0.03] border-white/10 rounded-2xl px-5 font-bold" />
                                {passwordErrors.current_password && <p className="text-rose-400 text-[10px] font-bold uppercase ml-2">{passwordErrors.current_password}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.25em] ml-2">Password Baru</label>
                                    <Input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} className="h-13 bg-white/[0.03] border-white/10 rounded-2xl px-5 font-bold" />
                                    {passwordErrors.password && <p className="text-rose-400 text-[10px] font-bold uppercase ml-2">{passwordErrors.password}</p>}
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.25em] ml-2">Konfirmasi</label>
                                    <Input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="h-13 bg-white/[0.03] border-white/10 rounded-2xl px-5 font-bold" />
                                </div>
                            </div>
                            <Button type="submit" className="w-full bg-white/10 hover:bg-white/15 h-13 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]">
                                Perbarui Kata Sandi
                            </Button>
                        </form>
                    </AccordionCard>

                    <AccordionCard title="Two-Factor Authentication">
                        <div className="space-y-6 pt-2">
                            <div className="p-5 rounded-[28px] bg-white/[0.02] border border-white/10 shadow-lg backdrop-blur-md flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", twoFactor.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-brand/10 text-brand")}>
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-white tracking-tight">2FA Status</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                            {twoFactor.enabled ? `${twoFactor.recoveryCodesRemaining} Codes Left` : 'Proteksi Tambahan'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setTwoFactorError(null);
                                        setTwoFactorStep(twoFactor.enabled ? 'disable' : 'password');
                                    }}
                                    className={cn(
                                        "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                        twoFactor.enabled ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-brand text-brand-foreground shadow-lg"
                                    )}
                                >
                                    {twoFactor.enabled ? 'Disable' : 'Enable'}
                                </button>
                            </div>

                            {twoFactorStep !== 'idle' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-[28px] bg-black/20 border border-white/5 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[11px] font-black text-brand uppercase tracking-[0.2em]">
                                            {twoFactorStep === 'disable' ? 'Nonaktifkan Keamanan' : 'Konfigurasi 2FA'}
                                        </h4>
                                        <button onClick={() => setTwoFactorStep('idle')} className="text-slate-500 hover:text-white"><X size={16} /></button>
                                    </div>

                                    {twoFactorStep === 'password' && (
                                        <div className="space-y-4">
                                            <p className="text-xs text-white/60 leading-relaxed font-medium">Langkah 1: Verifikasi identitas Anda untuk membuat kunci rahasia baru.</p>
                                            <Input type="password" value={twoFactorPassword} onChange={(e) => setTwoFactorPassword(e.target.value)} placeholder="Masukkan password Anda" className="bg-white/5 border-white/10 rounded-xl" />
                                            <Button onClick={handleTwoFactorSetup} disabled={twoFactorBusy} className="w-full h-11 bg-white text-slate-950 font-bold text-xs rounded-xl">
                                                {twoFactorBusy ? <Loader2 className="animate-spin h-4 w-4" /> : 'Generate QR Code'}
                                            </Button>
                                        </div>
                                    )}

                                    {twoFactorStep === 'setup' && twoFactorSetupData && (
                                        <div className="space-y-6">
                                            <div className="flex flex-col items-center gap-4 text-center">
                                                <div className="p-3 bg-white rounded-2xl shadow-2xl ring-8 ring-white/5">
                                                    <img src={twoFactorSetupData.qrCodeDataUri} alt="QR Code" className="w-40 h-40" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Atau Masukkan Manual</p>
                                                    <code className="text-xs font-mono bg-white/10 px-3 py-1 rounded-lg text-brand select-all">{twoFactorSetupData.secret}</code>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest text-center">Simpan Recovery Codes (Penting!)</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {twoFactorSetupData.recoveryCodes.map(code => (
                                                        <code key={code} className="text-[9px] font-mono bg-white/5 p-2 rounded-lg text-white/60 border border-white/5">{code}</code>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <Input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="Masukkan 6 Digit OTP" className="bg-white/5 border-white/10 rounded-xl text-center tracking-[0.5em] font-black h-12" maxLength={6} />
                                                <Button onClick={handleTwoFactorConfirm} disabled={twoFactorBusy || twoFactorCode.length < 6} className="w-full h-12 bg-brand text-brand-foreground font-black text-[11px] uppercase tracking-widest rounded-xl">Aktifkan Sekarang</Button>
                                            </div>
                                        </div>
                                    )}

                                    {twoFactorStep === 'disable' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                                <AlertTriangle size={16} className="shrink-0" />
                                                <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">Menonaktifkan 2FA akan mengurangi keamanan akun Anda secara signifikan.</p>
                                            </div>
                                            <Input type="password" value={twoFactorPassword} onChange={(e) => setTwoFactorPassword(e.target.value)} placeholder="Password saat ini" className="bg-white/5 border-white/10 rounded-xl" />
                                            <Input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} placeholder="OTP / Recovery Code" className="bg-white/5 border-white/10 rounded-xl" />
                                            <Button onClick={handleTwoFactorDisable} disabled={twoFactorBusy} className="w-full h-11 bg-rose-500 text-white font-bold text-xs rounded-xl">Konfirmasi Nonaktif</Button>
                                        </div>
                                    )}

                                    {twoFactorError && <p className="text-rose-400 text-[10px] font-black uppercase text-center">{twoFactorError}</p>}
                                </motion.div>
                            )}

                            {twoFactor.enabled && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2">Manajemen Kunci</label>
                                    <div className="grid gap-2">
                                        <button onClick={() => setTwoFactorStep('disable')} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all group">
                                            <div className="flex items-center gap-3">
                                                <RefreshCw size={16} className="text-slate-500 group-hover:rotate-180 transition-transform duration-700" />
                                                <span className="text-xs font-bold text-white/70">Buat Ulang Recovery Codes</span>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-700" />
                                        </button>
                                    </div>
                                    {newRecoveryCodes && (
                                        <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 animate-in zoom-in-95">
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">Recovery Codes Baru Anda</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {newRecoveryCodes.map(code => <code key={code} className="text-[9px] font-mono bg-black/20 p-2 rounded-lg text-amber-200/70">{code}</code>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </AccordionCard>

                    <div className="pt-12 text-center space-y-10">
                        <button 
                            onClick={handleDeleteAccount} 
                            className="group mx-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border border-rose-500/10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/5 transition-all duration-500"
                        >
                            <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Hapus Akun Permanen</span>
                        </button>
                        
                        <div className="flex flex-col items-center gap-4 opacity-20">
                             <div className="h-px w-12 bg-white" />
                             <p className="text-[10px] font-black uppercase tracking-[0.5em]">TCT HYBRID MONOREPO</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Toast Parity */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className={cn(
                            "fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 ring-1",
                            toast.type === 'error' ? "bg-rose-500 text-white ring-rose-400" : "bg-slate-900 text-white ring-white/10"
                        )}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </MobileAppLayout>
    );
}
