import { router, getCookie, showToastMessage } from '../../code.js';

export async function init(params) {
    const registerForm = document.getElementById('registerForm');

    const registerFirstNameInput = document.getElementById('registerFirstNameInput')
    const registerLastNameInput = document.getElementById('registerLastNameInput')
    const registerEmailInput = document.getElementById('registerEmailInput');
    const registerPassInput = document.getElementById('registerPassInput');

    const InvalidFirstName = document.getElementById('InvalidFirstName');
    const InvalidLastName = document.getElementById('InvalidLastName');
    const InvalidEmail = document.getElementById('InvalidEmail');
    const InvalidPass = document.getElementById('InvalidPass');

    registerFirstNameInput.addEventListener('blur', () => { checkFirstName() });
    registerLastNameInput.addEventListener('blur', () => { checkLastName() });
    registerEmailInput.addEventListener('blur', () => { checkEmail() });
    registerPassInput.addEventListener('blur', () => { checkPass() });

    function checkFirstName() {
        const regex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/;
        if (!regex.test(registerFirstNameInput.value) || registerFirstNameInput.value.length < 2 || registerFirstNameInput.value.length > 30) {
            registerFirstNameInput.classList.remove('is-valid');
            registerFirstNameInput.classList.add('is-invalid');
            InvalidFirstName.innerHTML = 'Adınızı kontrol ediniz!';
            return false;
        }
        else {
            registerFirstNameInput.classList.remove('is-invalid');
            registerFirstNameInput.classList.add('is-valid');
            InvalidFirstName.innerHTML = '';
            return true;
        }
    }

    function checkLastName() {
        const regex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s]+$/;
        if (!regex.test(registerLastNameInput.value) || registerLastNameInput.value.length < 2 || registerLastNameInput.value.length > 30) {
            registerLastNameInput.classList.remove('is-valid');
            registerLastNameInput.classList.add('is-invalid');
            InvalidLastName.innerHTML = 'Soyadınızı kontrol ediniz!';
            return false;
        }
        else {
            registerLastNameInput.classList.remove('is-invalid');
            registerLastNameInput.classList.add('is-valid');
            InvalidLastName.innerHTML = '';
            return true;
        }
    }

    function checkEmail() {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(registerEmailInput.value) || registerEmailInput.value.length > 50) {
            registerEmailInput.classList.remove('is-valid');
            registerEmailInput.classList.add('is-invalid');
            InvalidEmail.innerHTML = 'E-posta adresinizi kontrol ediniz!';
            return false;
        } else {
            registerEmailInput.classList.remove('is-invalid');
            registerEmailInput.classList.add('is-valid');
            InvalidEmail.innerHTML = '';
            return true;
        }
    }

    function checkPass() {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
        if (!regex.test(registerPassInput.value) || registerPassInput.value.length > 20) {
            registerPassInput.classList.remove('is-valid');
            registerPassInput.classList.add('is-invalid');
            InvalidPass.innerHTML = 'Şifreniz en az 8 karakter uzunluğunda olmalı, en az bir harf, bir rakam ve bir özel karakter içermelidir!';
            return false;
        } else {
            registerPassInput.classList.remove('is-invalid');
            registerPassInput.classList.add('is-valid');
            InvalidPass.innerHTML = '';
            return true;
        }
    }


    async function user_register() {
        const csrfToken = getCookie('csrftoken');

        const response = await fetch('/accounts/user_register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ first_name: registerFirstNameInput.value, last_name: registerLastNameInput.value, email: registerEmailInput.value, password: registerPassInput.value })
        });

        if (response.ok) {
            showToastMessage('Başarıyla Kayıt Oldunuz. Giriş Yapınız!');
            await router.navigate('/');
        }
        else if (response.status == 400) {
            registerEmailInput.classList.remove('is-valid');
            registerEmailInput.classList.add('is-invalid');
            InvalidEmail.innerHTML = 'Bu email adresi ile daha önce kayıt olunmuş!'
        }
        else {
            const errorData = await response.json();
            console.error('Error:', errorData.error);
        }
    }

    const handleRegisterFormSubmit = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (registerForm.checkValidity() && checkFirstName() && checkLastName() && checkEmail() && checkPass()) {
            await user_register();
        }
    }

    registerForm.addEventListener('submit', handleRegisterFormSubmit);

    window.currentCleanup = () => {
        registerFirstNameInput.removeEventListener('blur', () => { checkFirstName() });
        registerLastNameInput.removeEventListener('blur', () => { checkLastName() });
        registerEmailInput.removeEventListener('blur', () => { checkEmail() });
        registerPassInput.removeEventListener('blur', () => { checkPass() });
        registerForm.removeEventListener('submit', handleRegisterFormSubmit);
    };
}

