"use strict";

import { getUserInfo, getCookie, showToastMessage, router, notificationSocket, getUserName } from '../../code.js';

export async function init(params) {
  let isFriend;
  let isReq;
  let isBlocked;

  const username = params.get('username');
  const buttonGroup = document.getElementById("buttonGroup");
  const blockUserButton = document.getElementById('blockUserButton');
  const { blockers, blockeds } = await getBlockedUsers();
  
  blockeds.forEach(user => {
    if (username === user.blocker) {
      showToastMessage('Bu kullanıcı sizi engellediğinden profilini görüntüleyemiyorsunuz!');
      router.navigate('/profile');
      return;
    }
  });

  if (!username || username === await getUserName()) {
    buttonGroup.classList.add('d-none');
  }

  async function displayUserInfo(username) {
    blockers.forEach(user => {
      if (username == user.blocked) {
        isBlocked = true;
        blockUserButton.innerHTML = '<i class="fa-solid fa-ban ms-1"></i> Engeli Kaldır';
      }
    });

    const user = await getUserInfo(username);
    const profileTextName = document.getElementById('profile-text-name');
    const profileTextUserName = document.getElementById('profile-text-username');
    const profileTextEmail = document.getElementById('profile-text-email');
    const profileImage = document.getElementById('profile-image');
    const switchElement = document.getElementById('tfaswitch');
    profileTextName.innerHTML = user.first_name + " " + user.last_name;
    profileTextUserName.innerHTML = user.username;
    profileTextEmail.innerHTML = user.email;
    profileImage.src = user.avatar_url;
    switchElement.checked = user.isTfaActive;
    switchElement.disabled = switchElement.checked;
  }

  // Modal Buttons & Events
  const tfaInputForm = document.getElementById('tfaInputForm')
  const modal_reject_button = document.getElementById('rejectButton');

  const handleTfaVerify = async (event) => {
    event.preventDefault();
    const tfaCode = document.getElementById('tfaInput').value
    await verifyTFA(tfaCode);
  }

  const handleModalReject =  () => {
    if (switchElement.checked)
      switchElement.checked = false;
  }

  const handleAddFriendButton = async () => {
    if (isBlocked) {
      showToastMessage('Engellenmiş bir kullanıcı arkadaş olarak eklenemez!');
    }
    else if (isFriend) {
      bootstrapFriendModal.show();
    }
    else {
      await sendFriendRequest();
    }
  }

  const handleRemoveFriend =  async () => {
    await removeFriend();
  }

  const handleBlockUser = async () => {
    if (isBlocked) {
      await unblockUser();
    } else {
      await blockUser();
    }
  }

  const handleSendMessage = () => {
    if (isFriend)
      router.navigate('/messages');
    else
      showToastMessage('Arkadaşınız olmayan bir kullanıcıya mesaj gönderemezsiniz!');
  }

  tfaInputForm.addEventListener('submit', handleTfaVerify);
  modal_reject_button.addEventListener('click', handleModalReject);

  //AddFriend
  const addFriendButton = document.getElementById('addFriendButton');
  const bootstrapFriendModal = new bootstrap.Modal(document.getElementById('friendModal'));

  addFriendButton.addEventListener('click', handleAddFriendButton);


  //Send Friend Request
  async function sendFriendRequest() {
    const friendUsername = document.querySelector('#profile-text-username').innerText;
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('/api/send_friend_request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: friendUsername })
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error('error: user not found.');
        } else if (response.status == 400) {
          showToastMessage('Kendinizi arkadaş olarak ekleyemezsiniz!');
        } else {
          const data = await response.json();
          console.error('error:', data);
        }
        return;
      } else {
        console.log('friend request send successfully');
        addFriendButton.innerHTML = '<i class="fa-solid fa-user-group"></i>Arkadaşlık İsteği Gönderildi';
        await notificationSocket.send(JSON.stringify({
          'type': 'notification',
          'username': friendUsername,
          'title': 'Arkadaşlık İsteği',
          'message': `${username} size bir arkadaşlık isteği gönderdi`,
          'data': {}
        }));
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  async function checkIfFriend() {
    const friendUsername = document.querySelector('#profile-text-username').innerText;
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('/api/is_friend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: friendUsername })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          console.error('error: user not found.');
        } else {
          console.error('error:', data);
        }
        return;
      } else {
        isFriend = data.isFriend;
        isReq = data.isReq;
        if (isReq) {
          addFriendButton.innerHTML = '<i class="fa-solid fa-user-group ms-1"></i> Arkadaşlık İsteği Gönderildi';
        }
        else if (isFriend) {
          addFriendButton.innerHTML = '<i class="fa-solid fa-user-group ms-1"></i> Arkadaşlıktan Çıkar';
          isFriend = true;
        }
        else {
          addFriendButton.innerHTML = '<i class="fa-solid fa-user-group ms-1"></i> Arkadaş Ekle';
        }
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  async function removeFriend() {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('/api/remove_friend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: username })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      if (data.success) {
        console.log(data.success);
        bootstrap.Modal.getInstance(document.getElementById('friendModal')).hide();
        checkIfFriend();
      } else {
        console.error('error:', data);
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  //Remove Friend
  document.getElementById('friendRemoveButton').addEventListener('click', handleRemoveFriend);

  // Two Factor Authentication
  async function verifyTFA(tfaCode) {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    if (!accessToken) {
      console.error('Access token is missing or invalid');
      return;
    }

    try {
      const response = await fetch('/api/verify_tfa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ tfaCode: tfaCode })
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.error('error: (forbidden) you do not have permission to access this resource.');
        } else if (response.status === 400) {
          console.error('error: invalid TOTP code.');
          document.getElementById('tfaInput').classList.add('is-invalid');
        } else if (response.status === 404) {
          console.error('error: user not found.');
        } else {
          console.error('error: network error:', response.status);
        }
        return;
      } else {
        const switchElement = document.getElementById('tfaswitch');
        switchElement.disabled = true;
        const bootstrapSwitchModal = bootstrap.Modal.getInstance(document.getElementById('tfaModal'));
        bootstrapSwitchModal.hide();
      }
    } catch (error) {
      console.error('error:', error);
    }
  }

  // Block User

  async function blockUser() {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('/api/block_user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: username })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      if (data.success) {
        blockUserButton.innerHTML = '<i class="fa-solid fa-ban ms-1"></i> Engeli Kaldır';
        isBlocked = true;
        await removeFriend();
        isFriend = false;
        showToastMessage('Kullanıcı engellendi.');
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Unblock User
  async function unblockUser() {
    const accessToken = getCookie('access_token');
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('/api/unblock_user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ username: username })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      if (data.success) {
        blockUserButton.innerHTML = '<i class="fa-solid fa-ban ms-1"></i> Engelle';
        isBlocked = false;
        showToastMessage('Kullanıcının engeli kaldırıldı.');
      } else {
        console.error('error:', data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  blockUserButton.addEventListener('click', handleBlockUser);

  async function getBlockedUsers() {
    const accessToken = getCookie('access_token');

    try {
      const response = await fetch('/api/get_blocked_users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      return { blockeds: data.blockeds, blockers: data.blockers }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Send Message
  document.getElementById('sendMessageButton').addEventListener('click', handleSendMessage);

  // Display User Games
  async function displayUserGames(username) {
    const accessToken = getCookie('access_token');
    const match_history = document.getElementById('match-history');

    if (!username) {
      username = await getUserName();
    }

    try {
      const response = await fetch(`/api/get_user_games/${username}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      data.forEach(element => {
        match_history.innerHTML += `
          <div class="text-light text-center matchCard list-group-item d-flex justify-content-between align-items-center color border-transparent">
            <div class="col-3">
              <small>${new Date(element.played_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</small>
            </div>
            <div class="d-flex justify-content-center align-items-center col-6">
              <div class="col-6 ms-1">
                <p class="mb-0 text-truncate">${element.winner_username}</p>
                <p class="mb-0 text-truncate">${element.winnerScore}</p>
              </div>
              <div class="col-6 me-1">
                <p class="mb-0 text-truncate">${element.loser_username}</p>
                <p class="mb-0 text-truncate">${element.loserScore}</p>
              </div>
            </div>
            <div class="col-3 d-flex justify-content-end">
              <span class="${element.winner_username === username ? 'winBadges' : 'loseBadges'} me-2">
                ${element.winner_username === username ? 'Galibiyet' : 'Mağlubiyet'}
              </span>
            </div>
          </div>
        `;
      });

    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Display User Stats
  async function displayUserStats(username) {
    const accessToken = getCookie('access_token');
    const winsCount = document.getElementById('wins-count');
    const lossesCount = document.getElementById('losses-count');
    const winRate = document.getElementById('win-rate');

    if (!username) {
      username = await getUserName();
    }

    try {
      const response = await fetch(`/api/get_stats/${username}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error:', data);
        return;
      }

      winsCount.innerHTML = data.wins;
      lossesCount.innerHTML = data.losses;
      winRate.innerHTML = `%${data.win_rate}`
      
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  await displayUserInfo(username);
  await displayUserStats(username);
  await displayUserGames(username);
  await checkIfFriend();

  window.currentCleanup = () => {
    tfaInputForm.removeEventListener('submit', handleTfaVerify);
    modal_reject_button.removeEventListener('click', handleModalReject);
    addFriendButton.removeEventListener('click', handleAddFriendButton);
    document.getElementById('friendRemoveButton').removeEventListener('click', handleRemoveFriend);
    blockUserButton.removeEventListener('click', handleBlockUser);
    document.getElementById('sendMessageButton').removeEventListener('click', handleSendMessage);
  };
}