'use client';
import { AcademicCapIcon, BookOpenIcon, TrophyIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Employee = {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
};

type ModuleSummary = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  question_count: number;
  completed: boolean;
  best_score: number | null;
  best_total_points: number | null;
};

type Question = {
  id: string;
  question: string;
  options: string[];
  points: number;
  sort_order: number;
};

type ModuleDetail = {
  module: { id: string; title: string; description: string | null; icon: string | null };
  questions: Question[];
};

type SubmitDetail = {
  question_id: string;
  question: string;
  options: string[];
  chosen_index: number;
  correct_index: number;
  correct: boolean;
  points: number;
};

type View = 'list' | 'quiz' | 'final';

const MODULE_COLORS = [
  { bg: 'linear-gradient(135deg,#2563EB,#0891B2)', light: '#eff6ff' },
  { bg: 'linear-gradient(135deg,#7c3aed,#c026d3)', light: '#faf5ff' },
  { bg: 'linear-gradient(135deg,#059669,#0d9488)', light: '#ecfdf5' },
  { bg: 'linear-gradient(135deg,#d97706,#ea580c)', light: '#fffbeb' },
];

export default function CapacitacionPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<View>('list');
  const [activeModule, setActiveModule] = useState<ModuleDetail | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [pendingAnswers, setPendingAnswers] = useState<number[]>([]);
  const [submitDetail, setSubmitDetail] = useState<SubmitDetail[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<{ score: number; total_points: number; question_count: number } | null>(null);

  async function loadEverything() {
    try {
      const meRes = await fetch('/api/employees/me');
      if (!meRes.ok) {
        router.replace('/fichaje');
        return;
      }
      const meData = await meRes.json();
      if (!meData.employee) {
        router.replace('/fichaje');
        return;
      }
      setEmployee(meData.employee);

      const modsRes = await fetch('/api/employee/training/modules');
      if (modsRes.ok) {
        const modsData = await modsRes.json();
        setModules((modsData.modules ?? []) as ModuleSummary[]);
      }
    } catch {
      setError('No se pudo cargar la capacitación.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPoints = modules.reduce((acc, m) => acc + (m.best_total_points ?? 0), 0);

  async function startModule(moduleId: string) {
    setError('');
    try {
      const res = await fetch(`/api/employee/training/modules/${moduleId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cargar el módulo.');
        return;
      }
      setActiveModule(data);
      setCurrentQ(0);
      setPendingAnswers([]);
      setSelected(null);
      setRevealed(false);
      setSubmitDetail(null);
      setFinalResult(null);
      setView('quiz');
    } catch {
      setError('Error de conexión.');
    }
  }

  function chooseOption(optionIndex: number) {
    if (revealed) return;
    setSelected(optionIndex);
    setRevealed(true);
  }

  async function advance() {
    if (!activeModule) return;
    const nextAnswers = [...pendingAnswers, selected ?? -1];
    setPendingAnswers(nextAnswers);
    setSelected(null);
    setRevealed(false);

    if (currentQ + 1 < activeModule.questions.length) {
      setCurrentQ((q) => q + 1);
      return;
    }

    // Last question: submit
    setSubmitting(true);
    try {
      const res = await fetch('/api/employee/training/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: activeModule.module.id, answers: nextAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar el resultado.');
        setSubmitting(false);
        return;
      }
      setSubmitDetail(data.detail);
      setFinalResult(data.attempt);
      setView('final');
    } catch {
      setError('Error de conexión al enviar resultados.');
    } finally {
      setSubmitting(false);
    }
  }

  async function backToModules() {
    setView('list');
    setActiveModule(null);
    setLoading(true);
    await loadEverything();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="w-7 h-7 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!employee) return null;

  // -------- Quiz view --------
  if (view === 'quiz' && activeModule) {
    const q = activeModule.questions[currentQ];
    const total = activeModule.questions.length;
    const progressPct = ((currentQ + (revealed ? 1 : 0)) / total) * 100;

    return (
      <div className="min-h-screen bg-[#FAFAF9] px-4 py-6">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">
              Pregunta {currentQ + 1} de {total}
            </span>
            <span className="text-xs font-bold text-[#2563EB]">{activeModule.module.icon} {activeModule.module.title}</span>
          </div>
          <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#0891B2] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-6 mb-5">
            <p className="text-lg font-bold text-[#1C1917] leading-snug">{q.question}</p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let style = 'bg-white border-[#E8E3DC] text-[#1C1917] hover:border-[#2563EB] hover:bg-blue-50/40';
              if (revealed) {
                if (i === selected) {
                  style = 'bg-blue-50 border-[#2563EB] text-[#1C1917]';
                } else {
                  style = 'bg-white border-[#E8E3DC] text-stone-400 opacity-60';
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => chooseOption(i)}
                  disabled={revealed}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 font-semibold text-sm transition-all ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-5 animate-[fadeInUp_0.3s_ease_both]">
              <div className="rounded-xl px-5 py-4 bg-blue-50 border border-blue-200 text-sm font-semibold text-[#1C1917]">
                Respuesta registrada. Conocerás tu resultado al terminar el módulo.
              </div>
              <button
                onClick={advance}
                disabled={submitting}
                className="mt-4 w-full px-6 py-3.5 bg-[#2563EB] text-white font-bold rounded-xl hover:bg-[#0891B2] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Enviando...' : currentQ + 1 < total ? 'Siguiente pregunta →' : 'Ver resultado'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------- Final / result view --------
  if (view === 'final' && finalResult && submitDetail) {
    const pct = Math.round((finalResult.score / finalResult.question_count) * 100);
    return (
      <div className="min-h-screen bg-[#FAFAF9] px-4 py-10 flex items-center justify-center">
        <div className="max-w-xl w-full">
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-8 text-center">
            <div className="text-6xl mb-4" style={{ animation: 'bounce 1s ease infinite' }}>
              {pct >= 80 ? '' : pct >= 50 ? '' : ''}
            </div>
            <h1 className="text-2xl font-black text-[#1C1917] mb-1">¡Módulo completado!</h1>
            <p className="text-stone-500 text-sm mb-6">
              Respondiste correctamente {finalResult.score} de {finalResult.question_count} preguntas
            </p>

            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl mb-6" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}>
              <span className="text-2xl"><TrophyIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
              <span className="text-white font-black text-xl">+{finalResult.total_points} pts</span>
            </div>

            <div className="space-y-2 text-left mb-6">
              {submitDetail.map((d, i) => (
                <div
                  key={d.question_id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                    d.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <span className="shrink-0">{d.correct ? '' : ''}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1C1917]">
                      {i + 1}. {d.question}
                    </p>
                    {!d.correct && (
                      <p className="text-xs text-stone-500 mt-1">
                        Correcta: <span className="font-bold">{d.options[d.correct_index]}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={backToModules}
              className="w-full px-6 py-3.5 text-white font-bold rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }}
            >
              Volver a módulos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------- List view --------
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="hero-gradient px-4 md:px-10 pt-8 pb-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <AcademicCapIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Capacitación
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Hola, {employee.full_name.split(' ')[0]}</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Completa los módulos y gana puntos</p>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <span className="text-2xl"><TrophyIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
            <div>
              <p className="text-white font-black text-xl leading-none">{totalPoints.toLocaleString('es-MX')}</p>
              <p className="text-amber-50 text-[10px] font-bold uppercase tracking-wider">puntos totales</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-10 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>
        )}

        {modules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-12 text-center">
            <p className="text-4xl mb-3"><BookOpenIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></p>
            <p className="font-bold text-[#1C1917]">Aún no hay módulos disponibles</p>
            <p className="text-stone-400 text-sm mt-1">Pronto tu administrador agregará capacitaciones.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {modules.map((mod, i) => {
              const color = MODULE_COLORS[i % MODULE_COLORS.length];
              return (
                <button
                  key={mod.id}
                  onClick={() => startModule(mod.id)}
                  disabled={mod.question_count === 0}
                  className="text-left rounded-2xl p-6 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: color.bg, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-5xl">{mod.icon || ''}</span>
                    {mod.completed && (
                      <span className="text-[10px] font-extrabold bg-white/20 text-white px-2.5 py-1 rounded-full uppercase tracking-wide">
                        Completado
                      </span>
                    )}
                  </div>
                  <h2 className="text-white font-black text-lg mt-4">{mod.title}</h2>
                  {mod.description && <p className="text-white/70 text-sm mt-1 leading-snug">{mod.description}</p>}
                  <div className="flex items-center justify-between mt-5">
                    <span className="text-white/70 text-xs font-semibold">
                      {mod.question_count} {mod.question_count === 1 ? 'pregunta' : 'preguntas'}
                    </span>
                    {mod.completed ? (
                      <span className="text-white font-bold text-sm">✓ {mod.best_total_points} pts</span>
                    ) : (
                      <span className="text-white font-bold text-sm">Comenzar →</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
