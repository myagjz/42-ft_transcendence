"use strict";

import { router, getCookie , disconnectNotificationSocket} from '../../code.js';

function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9]+$/;
  return username.length > 3 && 
         username.length < 100 && 
         usernameRegex.test(username);
}

export async function init(params) {
  const handleSubmitPersonalize = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const InvalidUsername = document.getElementById('InvalidUsername');
    const avatar = document.getElementById('avatarFileInput').files[0];
    const usernameInput = document.getElementById('nicknameInput');

    if (!validateUsername(usernameInput.value)) {
      InvalidUsername.textContent = "Kullanıcı adı sadece harf ve rakam içerebilir en az 4, en fazla 99 karakterden oluşmalıdır";
      InvalidUsername.style.display = "block";
      usernameInput.classList.add("is-invalid");
      return;
    }

    const formData = new FormData();
    formData.append('avatar', avatar);
    formData.append('username', usernameInput.value);

    async function update_ui() {
      const accessToken = getCookie('access_token');
      const csrfToken = getCookie('csrftoken');

      try {
        const response = await fetch('/api/update_ui', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRFToken': csrfToken
          },
          body: formData
        });

        if (!response.ok) {
          if (response.status == 409) {
            usernameInput.classList.add('is-invalid');
            InvalidUsername.innerHTML = 'Bu kullanıcı adı daha önce alınmış!';
          }
          else if (response.status === 404) {
            console.error('error: user not found.');
          } else {
            const data = await response.json();
            console.error('error:', data);
          }
          return;
        } else {
          await disconnectNotificationSocket();
          await router.navigate('/profile');
        }
      } catch (error) {
        console.error('error:', error);
      }
    };

    await update_ui();
  }

  document.getElementById("personalizeForm").addEventListener("submit", handleSubmitPersonalize);

  window.currentCleanup = () => {
    document.getElementById("personalizeForm").removeEventListener("submit", handleSubmitPersonalize);
  };
}