import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="bg-opacity-25 fixed inset-0 bg-black" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative z-50 w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl md:max-w-5xl lg:max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button type="button" className="text-gray-400 hover:text-gray-500" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
