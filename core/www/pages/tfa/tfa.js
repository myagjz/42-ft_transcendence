"use strict";

import { getCookie, router } from '../../code.js';

export async function init(params) {
    const handleTfaButton = async (event) => {
        event.preventDefault();
        const tfaCode = document.getElementById('password').value;
        await tfa_login(tfaCode);
    }

    document.getElementById('tfaButton').addEventListener('click', handleTfaButton);

    async function tfa_login(tfaCode) {
        const csrfToken = getCookie('csrftoken');
        try {
            const response = await fetch('/accounts/tfa_login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ tfaCode: tfaCode })
            });

            const data = await response.json();

            if (!response.ok) {
                console.log('error:', data);
                return;
            } else {
                document.cookie = `access_token=${data.access_token}; path=/;`;
                await router.navigate('/profile');
            }
        }
        catch (error) {
            console.error('error:', error);
        }
    }

    window.currentCleanup = () => {
        document.getElementById('tfaButton').removeEventListener('click', handleTfaButton);
    };
}