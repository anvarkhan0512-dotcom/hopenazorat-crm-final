'use client';

import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="modal-title">{title}</h3>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}