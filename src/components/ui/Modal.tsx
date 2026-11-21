import { useEffect, useRef } from 'react';
import { IconButton, cx } from './primitives';
import { Button } from './primitives';

/** Modale en verre, basée sur <dialog> (piège du focus et Échap natifs). */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={cx(
        'glass m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl p-0 text-fg backdrop:bg-ink/30 backdrop:backdrop-blur-[2px] open:animate-rise',
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between gap-2 px-5 pt-4">
            <h2 id="modal-title" className="text-xl">
              {title}
            </h2>
            <IconButton icon="x" label="Fermer" onClick={onClose} />
          </div>
          <div className="overflow-y-auto px-5 pb-4 pt-2">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-muted">{message}</div>
    </Modal>
  );
}
