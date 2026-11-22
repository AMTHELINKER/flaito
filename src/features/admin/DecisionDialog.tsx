import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, TextArea } from '@/components/ui/primitives';

/** Confirmation d'une décision de modération, avec une note facultative (inscrite au journal). */
export function DecisionDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  const close = () => {
    setNote('');
    onCancel();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            busy={busy}
            onClick={() => {
              onConfirm(note.trim());
              setNote('');
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-muted">{message}</p>
      <TextArea
        label="Note pour le journal (facultatif)"
        rows={2}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
}
