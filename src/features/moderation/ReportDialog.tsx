import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType,
} from '@laito/shared';
import { errorMessage } from '@/api/client';
import { reportsApi } from '@/api/endpoints';
import { Modal } from '@/components/ui/Modal';
import { Button, cx, TextArea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';

const WHAT: Record<ReportTargetType, string> = {
  book: 'ce livre',
  chapter: 'ce chapitre',
  user: 'ce profil',
  message: 'ce message',
};

/** Signaler un contenu : un motif, une précision facultative. */
export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const close = () => {
    setReason(null);
    setDetails('');
    onClose();
  };
  const send = useMutation({
    mutationFn: () =>
      reportsApi.create({
        targetType,
        targetId,
        reason: reason!,
        details: details.trim() || undefined,
      }),
    onSuccess: (r) => {
      toast.success(r.message);
      close();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Signaler ${WHAT[targetType]}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button busy={send.isPending} disabled={!reason} onClick={() => send.mutate()}>
            Envoyer le signalement
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 text-sm text-muted">
            Pourquoi ? L’équipe de modération examinera votre signalement.
          </legend>
          <div className="flex flex-col gap-1.5">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={cx(
                  'pressable flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
                  reason === r ? 'border-accent-text bg-page font-medium' : 'border-line',
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  className="accent-[var(--c-accent-text)]"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                {REPORT_REASON_LABELS[r]}
              </label>
            ))}
          </div>
        </fieldset>
        {reason && (
          <TextArea
            label="Précisions (facultatif)"
            rows={3}
            maxLength={REPORT_DETAILS_MAX_LENGTH}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        )}
      </div>
    </Modal>
  );
}
