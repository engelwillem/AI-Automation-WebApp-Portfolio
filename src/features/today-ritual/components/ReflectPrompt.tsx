'use client';

import { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionConfig } from '../hooks/useMotionConfig';

interface ReflectPromptProps {
  title?: string | null;
  placeholder: string;
  ctaLabel: string;
  sealedLabel: string;
  prompt: string;
  value: string;
  onChange: (val: string) => void;
  onContinue: () => void;
  isDone: boolean;
  isSubmitting?: boolean;
  submittingLabel?: string;
}

export default function ReflectPrompt({
  title = null,
  prompt,
  placeholder,
  ctaLabel,
  sealedLabel,
  value,
  onChange,
  onContinue,
  isDone,
  isSubmitting = false,
  submittingLabel = "Mendoakan...",
}: ReflectPromptProps) {
  const m = useMotionConfig();
  const isFilled = value.trim().length > 0;
  // useId gives a stable, unique ID even in concurrent/server renders
  const textareaId = useId();

  return (
    <section className="flex flex-col mt-6 px-6" aria-labelledby={`${textareaId}-heading`}>
      {/* h2: major ritual section under the h1 page title */}
      {title ? (
        <h2
          id={`${textareaId}-heading`}
          className="text-[12px] font-medium text-foreground/40 tracking-wide mb-3"
        >
          {title}
        </h2>
      ) : (
        <span id={`${textareaId}-heading`} className="sr-only">
          Renungan
        </span>
      )}

      {/* The prompt is the label for the textarea. Using <label> for explicit association. */}
      <label
        htmlFor={textareaId}
        className="text-[17px] leading-[1.6] text-foreground/90 font-medium mb-6 block"
      >
        {prompt}
      </label>

      <AnimatePresence mode="wait">
        {!isDone ? (
          <motion.div
            key="input"
            variants={m.v.fade}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: m.tx.micro }}
            transition={m.tx.micro}
          >
            <textarea
              data-testid="today-reflection-textarea"
              id={textareaId}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[120px] w-full resize-none rounded-2xl bg-black/[0.03] px-5 py-4 text-[15px] leading-[1.6] text-foreground/80 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-black/[0.1] transition-colors"
            />
            <div className="mt-4 flex justify-start">
              <button
                data-testid="today-reflection-submit"
                disabled={!isFilled || isSubmitting}
                onClick={onContinue}
                // Explicit aria-label provides full context for screen reader users
                aria-label={isFilled ? `${ctaLabel} refleksiku` : ctaLabel}
                className={`group rounded-full px-6 py-[10px] text-[14px] font-medium transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isFilled && !isSubmitting
                    ? 'bg-black text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(14,165,233,0.78))] hover:shadow-[0_22px_44px_-24px_rgba(14,165,233,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/45 active:scale-95'
                    : 'bg-transparent text-foreground/20'
                }`}
              >
                <span className={isFilled ? 'inline-block transition-transform duration-400 ease-out group-hover:translate-x-[1px]' : undefined}>
                  {isSubmitting ? submittingLabel : ctaLabel}
                </span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sealed"
            variants={m.v.seal}
            initial="hidden"
            animate="visible"
            transition={m.tx.calm}
          >
            <textarea
              id={textareaId}
              value={value}
              readOnly
              disabled
              className="min-h-[120px] w-full resize-none rounded-2xl bg-black/[0.02] px-5 py-4 text-[15px] leading-[1.6] text-foreground/65 outline-none"
            />
            <p
              data-testid="today-reflection-sealed"
              className="mt-4 text-[12px] font-medium tracking-wide text-foreground/35"
              role="note"
              aria-label={sealedLabel}
            >
              {sealedLabel}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
