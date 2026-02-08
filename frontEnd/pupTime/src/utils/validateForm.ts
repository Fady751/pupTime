import { FormState, ErrorState } from '../screens/SignUp/signUp';
export const validate = (form: FormState): ErrorState => {
    const nextErrors: ErrorState = {};

    if (!form.username.trim()) {
        nextErrors.username = 'Username is required.';
    } else if (form.username.length < 3) {
        nextErrors.username = 'Username must be at least 3 characters.';
    }

    if (!form.email.trim()) {
        nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.password) {
        nextErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!form.gender.trim()) {
        nextErrors.gender = 'Gender is required.';
    }

    if (!form.birth_day.trim()) {
        nextErrors.birth_day = 'Birth date is required.';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birth_day)) {
        nextErrors.birth_day = 'Use format YYYY-MM-DD.';
    }

    return nextErrors;
};