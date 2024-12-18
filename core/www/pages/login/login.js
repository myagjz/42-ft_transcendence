"use strict";

import { router, getCookie ,showToastMessage } from '../../code.js';

export async function init(params) {
    const loginForm = document.getElementById('loginForm');

    const loginEmailInput = document.getElementById('loginEmailInput');
    const loginPassInput = document.getElementById('loginPassInput');

    const InvalidEmail = document.getElementById('InvalidEmail');
    const InvalidPass = document.getElementById('InvalidPass');

    const handleLoginFormSubmit = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (loginForm.checkValidity() && checkEmail() && checkPass()) {
            await user_login();
        }
    }

    function checkEmail() {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(loginEmailInput.value) || loginEmailInput.value.length > 50) {
            loginEmailInput.classList.remove('is-valid');
            loginEmailInput.classList.add('is-invalid');
            InvalidEmail.innerHTML = 'E-posta adresinizi kontrol ediniz!';
            return false;
        } else {
            loginEmailInput.classList.remove('is-invalid');
            loginEmailInput.classList.add('is-valid');
            InvalidEmail.innerHTML = '';
            return true;
        }
    }

    function checkPass() {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
        if (!regex.test(loginPassInput.value) || loginPassInput.value.length > 20) {
            loginPassInput.classList.remove('is-valid');
            loginPassInput.classList.add('is-invalid');
            InvalidPass.innerHTML = 'Şifre formatı doğru değil!';
            return false;
        } else {
            loginPassInput.classList.remove('is-invalid');
            loginPassInput.classList.add('is-valid');
            InvalidPass.innerHTML = '';
            return true;
        }
    }

    async function user_login() {
        const csrfToken = getCookie('csrftoken');

        try {
            const response = await fetch('/accounts/user_login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ email: loginEmailInput.value, password: loginPassInput.value })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    console.error('error: user not found.');
                } else if (response.status == 400) {
                    showToastMessage('Email adresiniz veya parolanız hatalı!')
                } else {
                    console.error('error:', data);
                }
                return;
            } else {
                if (data.access_token) {
                    document.cookie = `access_token=${data.access_token}; path=/;`;
                    document.cookie = `refresh_token=${data.refresh_token}; path=/;`;
                    await router.navigate('/profile');
                } else if (data.uuid) {
                    document.cookie = `uuid=${data.uuid}; path=/;`;
                    await router.navigate('/tfa');
                }
            }
        } catch (error) {
            console.error('error:', error);
        }
    }

    loginForm.addEventListener('submit', handleLoginFormSubmit);

    window.currentCleanup = () => {
        loginForm.removeEventListener('submit', handleLoginFormSubmit);
    };
}

