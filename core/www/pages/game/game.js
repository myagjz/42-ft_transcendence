"use strict";

import { getUserName, getUserInfo, notificationSocket, router } from '../../code.js';

async function getUserAvatarURL(username) {
    const userInfo = await getUserInfo(username);
    return userInfo.avatar_url;
}

export async function init() {
    const tournamentCard = document.getElementById('tournamentCard');
    const randomMatchCard = document.getElementById('randomMatchCard');
    const gameModal = document.getElementById('gameModal');
    const bsGameModal = new bootstrap.Modal(gameModal);
    const gameModalTitle = gameModal.querySelector('.modal-title');
    const gameModalFooter = document.getElementById('gameModalFooter');
    const gamePlayers = document.getElementById('players');
    const username = await getUserName();
    const userAvatar = await getUserAvatarURL(username);

    let tournamentPlayers = [];
    let randomMatchPlayers = [];

    const handleTournament = () => {
        gameModalTitle.textContent = 'Turnuva Modu';

        notificationSocket.send(JSON.stringify({
            type: 'tournament_join',
            username: username,
            title: 'Turnuva Katılımı',
            message: `${username} turnuvaya katıldı`,
            data: {
                gameMode: 'tournament',
                username: username,
                avatar: userAvatar
            }
        }));
    }

    const handleRandom = () => {
        gameModalTitle.textContent = 'Rastgele Eşleştir';
        gameModalFooter.innerHTML = '';

        notificationSocket.send(JSON.stringify({
            type: 'random_match',
            username: username,
            title: 'Rastgele Eşleşme',
            message: `${username} eşleşme arıyor`,
            data: {
                gameMode: 'random',
                username: username,
                avatar: userAvatar
            }
        }));
    };

    const handleModalHide = () => {
        console.log('Modal kapatıldı');
    };

    tournamentCard.addEventListener('click', handleTournament);
    randomMatchCard.addEventListener('click', handleRandom);
    gameModal.addEventListener('hide.bs.modal', handleModalHide);

    const handleNotificationMessage = async (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'tournament_player_joined':
                tournamentPlayers = data.current_players;
                gamePlayers.innerHTML = '';
                tournamentPlayers.forEach(player => {
                    gamePlayers.innerHTML += `
                        <div class="match-player text-center">
                            <img src="${player.avatar}"
                                class="rounded-circle border border-danger mb-3" width="80" height="80"
                                alt="${player.username}">
                            <h5 class="mb-3 text-light">${player.username}</h5>
                        </div>
                    `;
                });
                if (tournamentPlayers.length === 4) {
                    gameModalFooter.textContent = `Oyuncular tamamlandı.`
                }
                else 
                {
                    gameModalFooter.textContent = `${4 - tournamentPlayers.length} oyuncu bekleniyor.`
                }
                break;

            case 'tournament_ready':
                const userPairing = data.pairings.find(pair => pair.includes(username));
                const roomId = `tournament_${userPairing[0]}_${userPairing[1]}`;

                gamePlayers.innerHTML = '';
                for (const player of userPairing) {
                    const avatar = await getUserAvatarURL(player);
                    gamePlayers.innerHTML += `
                        <div class="match-player text-center">
                            <img src="${avatar}"
                                class="rounded-circle border border-danger mb-3" width="80" height="80"
                                alt="${player}">
                            <h5 class="mb-3 text-light">${player}</h5>
                        </div>
                    `;
                }

                let torunamentCountdown = 3;
                const torunamentCountdownInterval = setInterval(() => {
                    gameModalFooter.textContent = `Oyun ${torunamentCountdown} saniye sonra başlayacak`;
                    torunamentCountdown--;
                    if (torunamentCountdown < 0) {
                        clearInterval(torunamentCountdownInterval);
                        bsGameModal.hide();
                        gameModalFooter.innerHTML = '';
                        tournamentPlayers = [];
                        router.navigate(`/pong?room=${roomId}&mode=tournament`);
                    }
                }, 1000);
                break;

            case 'random_match_player_joined':
                randomMatchPlayers = data.current_players;
                gamePlayers.innerHTML = '';
                randomMatchPlayers.forEach(player => {
                    gamePlayers.innerHTML += `
                        <div class="match-player text-center">
                            <img src="${player.avatar}"
                                class="rounded-circle border border-danger mb-3" width="80" height="80"
                                alt="${player.username}">
                            <h5 class="mb-3 text-light">${player.username}</h5>
                        </div>
                    `;
                });
                break;

            case 'random_match_ready':
                let countdown = 3;
                const countdownInterval = setInterval(() => {
                    gameModalFooter.textContent = `Oyun ${countdown} saniye sonra başlayacak`;
                    countdown--;
                    if (countdown < 0) {
                        clearInterval(countdownInterval);
                        bsGameModal.hide();
                        gameModalFooter.innerHTML = '';
                        randomMatchPlayers = [];
                        router.navigate(`/pong?room=${data.roomId}&mode=random`);
                    }
                }, 1000);
                break;
        }
    };

    notificationSocket.addEventListener('message', handleNotificationMessage);

    window.currentCleanup = () => {
        if (notificationSocket) {
            notificationSocket.removeEventListener('message', handleNotificationMessage);
        }
        gameModal.removeEventListener('hide.bs.modal', handleModalHide);
        tournamentCard.removeEventListener('click', handleTournament);
        randomMatchCard.removeEventListener('click', handleRandom);
    };
}
