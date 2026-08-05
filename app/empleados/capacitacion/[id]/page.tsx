'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Question = {
  id: string;
  question: string;
  options: string[];
  points: number;
};

type ModuleInfo = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
};

type AttemptResult = {
  attempt: {
    score: number;
    total_points: number;
    max_possible_points: number;
    question_count: number;
  };
  employee_total_points: number | null;
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentIndex(0);
    setAnswers([]);
    setSelected(null);
    try {
      const meRes = await fetch('/api/employees/me');
      if (meRes.status === 401) {
        router.replace('/empleados');
        return;
      }
      const res = await fetch(`/api/employee/training/modules/${moduleId}`);
      if (res.status === 401) {
        router.replace('/empleados');
        return;
      }
      if (!res.ok) {
        setError('No se pudo cargar el módulo.');
        return;
      }
      const data = await res.json();
      setModuleInfo(data.module);
      setQuestions(data.questions ?? []);
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [moduleId, router]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSelect(idx: number) {
    setSelected(idx);
  }

  async function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      // submit
      setSubmitting(true);
      try {
        const res = await fetch('/api/employee/training/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module_id: moduleId, answers: newAnswers }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Error al enviar respuestas.');
          return;
        }
        setResult(data);
      } catch {
        setError('Error de conexión al enviar respuestas.');
      } finally {
        setSubmitting(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="text-white text-lg font-semibold">Cargando…</div>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center px-4" style={{ minHeight: '100vh' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/empleados/capacitacion')}
            className="w-full bg-[#2563EB] text-white font-bold rounded-2xl"
            style={{ minHeight: 56 }}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Results screen
  if (result) {
    const pct = result.attempt.max_possible_points
      ? Math.round((result.attempt.total_points / result.attempt.max_possible_points) * 100)
      : 0;
    const passed = pct >= 70;

    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center px-4 py-8" style={{ minHeight: '100vh' }}>
        <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center overflow-hidden">
          {passed && (
            <div className="confetti-wrap">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className={`confetti-piece c${i % 6}`} style={{ left: `${(i * 4.3) % 100}%`, animationDelay: `${(i % 8) * 0.15}s` }} />
              ))}
            </div>
          )}
          <div className="text-5xl mb-2 relative z-10">{passed ? '' : ''}</div>
          <h2 className="text-2xl font-black text-[#1C1917] relative z-10">
            {passed ? '¡Felicidades!' : '¡Casi lo logras!'}
          </h2>
          <p className="text-stone-500 text-sm mt-1 relative z-10">
            {passed
              ? 'Completaste el módulo con éxito.'
              : 'Sigue practicando, puedes intentarlo de nuevo.'}
          </p>

          <div className="mt-6 bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl p-5 relative z-10">
            <div className="text-4xl font-black text-[#2563EB]">{pct}%</div>
            <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mt-1">Puntaje</p>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-stone-500">Correctas</span>
              <span className="font-bold text-[#1C1917]">
                {result.attempt.score} / {result.attempt.question_count}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-sm">
              <span className="text-stone-500">Puntos ganados</span>
              <span className="font-bold text-emerald-600">+{result.attempt.total_points} pts</span>
            </div>
            {result.employee_total_points !== null && (
              <div className="flex items-center justify-between mt-1 text-sm">
                <span className="text-stone-500">Total acumulado</span>
                <span className="font-bold text-[#2563EB]">{result.employee_total_points} pts</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-6 relative z-10">
            {!passed && (
              <button
                onClick={load}
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold rounded-2xl transition-colors"
                style={{ minHeight: 56 }}
              >
                Reintentar
              </button>
            )}
            <button
              onClick={() => router.push('/empleados/capacitacion')}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold rounded-2xl transition-colors"
              style={{ minHeight: 56 }}
            >
              Volver a módulos
            </button>
          </div>
        </div>

        <style jsx>{`
          .confetti-wrap {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }
          .confetti-piece {
            position: absolute;
            top: -10px;
            width: 8px;
            height: 14px;
            opacity: 0.9;
            animation: confetti-fall 2.2s linear infinite;
          }
          .c0 { background: #2563eb; }
          .c1 { background: #7c3aed; }
          .c2 { background: #10b981; }
          .c3 { background: #f59e0b; }
          .c4 { background: #ef4444; }
          .c5 { background: #0ea5e9; }
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(420px) rotate(540deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center px-4" style={{ minHeight: '100vh' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
          <p className="text-stone-500 font-semibold mb-4">Este módulo no tiene preguntas.</p>
          <button
            onClick={() => router.push('/empleados/capacitacion')}
            className="w-full bg-[#2563EB] text-white font-bold rounded-2xl"
            style={{ minHeight: 56 }}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ minHeight: '100vh' }}>
      <div className="hero-gradient px-4 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-semibold">{moduleInfo?.title}</span>
            <span className="text-blue-100 text-sm font-semibold">
              Pregunta {currentIndex + 1} de {questions.length}
            </span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2 relative z-10 pb-10">
        <div className="bg-white border border-[#E8E3DC] rounded-3xl p-6 shadow-sm mt-6">
          <h2 className="text-xl font-bold text-[#1C1917] mb-6 leading-snug">{question.question}</h2>

          <div className="flex flex-col gap-3">
            {question.options.map((opt, idx) => {
              const isSelected = selected === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`flex items-center gap-3 text-left rounded-2xl border-2 px-4 py-4 transition-all ${
                    isSelected
                      ? 'border-[#2563EB] bg-orange-50'
                      : 'border-[#E8E3DC] bg-white hover:border-orange-200'
                  }`}
                  style={{ minHeight: 56 }}
                >
                  <span
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSelected ? 'bg-[#2563EB] text-white' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {LETTERS[idx] ?? idx + 1}
                  </span>
                  <span className="font-medium text-[#1C1917]">{opt}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={selected === null || submitting}
            className="w-full mt-6 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-bold rounded-2xl transition-colors"
            style={{ minHeight: 56 }}
          >
            {submitting
              ? 'Enviando…'
              : currentIndex + 1 === questions.length
                ? 'Finalizar'
                : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
