import { useRef, useCallback } from 'react';

export interface BankFormSubmissionRef {
    submitForm: () => void;
    isSubmitting: boolean;
}

export const useBankFormSubmission = () => {
    const formRef = useRef<BankFormSubmissionRef | null>(null);

    const registerForm = useCallback((form: BankFormSubmissionRef) => {
        formRef.current = form;
    }, []);

    const submitForm = useCallback(() => {
        if (formRef.current) {
            formRef.current.submitForm();
        }
    }, []);

    const getIsSubmitting = useCallback(() => {
        return formRef.current?.isSubmitting || false;
    }, []);

    return {
        registerForm,
        submitForm,
        getIsSubmitting,
    };
};
